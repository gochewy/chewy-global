#!/usr/bin/env bash

# ---------------------------------------------------------------------------
# convert_submodules_to_subtrees.sh
# ---------------------------------------------------------------------------
# This script converts all Git submodules in the current repository into
# Git subtrees. The goal is to simplify the repository structure by
# embedding external dependencies directly into the main tree instead of
# referencing them as submodules.
#
# Submodules are referenced by entries in the `.gitmodules` file. When this
# script runs, it performs the following high-level steps for each
# submodule:
#   1. Extract the submodule path and repository URL from `.gitmodules`.
#   2. Remove the submodule using `git submodule deinit` and `git rm`.
#   3. Delete the submodule's entry from `.gitmodules`.
#   4. Add the remote repository as a subtree using `git subtree add`.
#
# Each subtree is added with the `--squash` flag to keep the history concise.
# The script also attempts to detect the branch associated with the submodule
# definition. If no branch is specified, it defaults to `main`.
#
# Usage:
#   ./scripts/convert_submodules_to_subtrees.sh
#
# The script must be run from the root of the repository. Because it performs
# destructive operations (removing submodules), it is recommended to create a
# backup branch before running:
#   git checkout -b backup-before-subtree
#
# After conversion, review the changes and commit them as appropriate.
# ---------------------------------------------------------------------------

set -euo pipefail

# Ensure we are at the root of the repository by checking for .git
if [[ ! -d .git ]]; then
  echo "Error: this script must be run from the root of a Git repository" >&2
  exit 1
fi

# Abort if there are no submodules
if [[ ! -f .gitmodules ]]; then
  echo "No .gitmodules file found. Nothing to convert." >&2
  exit 0
fi

# Read all submodule paths from .gitmodules
mapfile -t SUBMODULE_PATHS < <(git config -f .gitmodules --get-regexp '^submodule\..*\.path$' | awk '{print $2}')

if [[ ${#SUBMODULE_PATHS[@]} -eq 0 ]]; then
  echo "No submodules defined in .gitmodules." >&2
  exit 0
fi

for PATH in "${SUBMODULE_PATHS[@]}"; do
  NAME=$(basename "$PATH")
  URL=$(git config -f .gitmodules --get submodule."$NAME".url)
  BRANCH=$(git config -f .gitmodules --get submodule."$NAME".branch 2>/dev/null || echo "main")

  echo "Converting submodule $NAME (path: $PATH, url: $URL, branch: $BRANCH)"

  # Deinitialize and remove the submodule
  git submodule deinit -f "$PATH" || true
  git rm -f "$PATH"
  rm -rf ".git/modules/$PATH" || true

  # Remove the submodule entry from .gitmodules
  git config -f .gitmodules --remove-section "submodule.$NAME" || true

  # If .gitmodules is empty after removal, delete it
  if [[ -z $(git config -f .gitmodules --list) ]]; then
    rm -f .gitmodules
  fi

  # Add the repository as a subtree
  git subtree add --prefix="$PATH" "$URL" "$BRANCH" --squash

done

echo "Submodule conversion complete. Review the changes and commit them as needed." 
