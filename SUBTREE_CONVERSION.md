# Converting Submodules to Subtrees

This repository historically tracked many dependencies via Git submodules. While submodules can be useful, they add management overhead and often require additional commands (`git submodule update`) to keep each dependency in sync. Git subtrees offer a simpler alternative by embedding the external repository directly into the main tree.

The `scripts/convert_submodules_to_subtrees.sh` script automates the conversion from submodules to subtrees. It reads the `.gitmodules` file, removes each submodule, and then adds the corresponding repository as a subtree.

## Usage

1. **Create a backup branch** (recommended):
   ```bash
   git checkout -b backup-before-subtree
   ```

2. **Run the conversion script** from the root of the repository:
   ```bash
   ./scripts/convert_submodules_to_subtrees.sh
   ```

3. **Review the changes** and commit them:
   ```bash
   git status
   git add -A
   git commit -m "Convert submodules to subtrees"
   ```

The script assumes that each submodule uses the `main` branch unless a different branch is specified in `.gitmodules` via the `submodule.<name>.branch` setting.

After converting, submodule configuration files (`.gitmodules` and references within `.git/config`) will be removed. Each dependency will exist as a normal directory in the repository, managed with `git subtree`.

## Using the GitHub Action

A preconfigured GitHub Action can perform the conversion automatically. Trigger the
workflow named **"Convert Submodules to Subtrees"** from the Actions tab. The
workflow creates a new branch containing the converted subtrees which you can
review and merge via a pull request.

