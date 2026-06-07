# Agent Instructions

This repository is `chewy-global`, the top-level workspace for Chewy. It
coordinates the Chewy contributor CLI, submodule/component repositories, demos,
docs, and the helper workflow for converting submodules to subtrees.

## SAM Workspaces

If `SAM_WORKSPACE_ID` is present, you are running in a SAM workspace. Call
`get_instructions` before doing any work so you know the project, task, and
assigned output branch. Work on that output branch, not `main`, unless the
human explicitly says otherwise.

SAM workspaces are ephemeral. Anything not committed and pushed can disappear
when the workspace stops. For Chewy, push after each meaningful checkpoint:

- after changing top-level workspace files such as `.gitmodules`, `README.md`,
  `SUBTREE_CONVERSION.md`, `.github/workflows/*`, or `scripts/*`;
- after changing `contributor-cli` behavior and its tests pass;
- after touching submodule pointers or subtree-conversion logic.

Use `update_task_status` for visible progress updates during multi-step work.
Use `search_messages`, `search_tasks`, and `search_ideas` before major
architecture or workflow decisions; this project has important historical
context about submodules, monorepo direction, and Chewy's agent-era architecture.
Capture durable follow-up work with `create_idea` instead of leaving it only in
chat. In conversation mode, do not call `complete_task` unless SAM instructions
for the session explicitly allow it.

Before editing high-conflict files, use `list_project_agents` when available.
The likely conflict points are `.gitmodules`, `scripts/convert_submodules_to_subtrees.sh`,
`.github/workflows/convert_submodules_to_subtrees.yml`, `contributor-cli/package.json`,
`contributor-cli/yarn.lock`, and shared documentation such as `README.md`.

After pushing from SAM, check `get_ci_status` when GitHub Actions should have
run. This repo currently has a manual top-level subtree-conversion workflow; the
`contributor-cli` package also contains its own historical GitHub workflow files
inside that package directory.

## Repository Shape

- `contributor-cli/` is the checked-in Chewy Contributor CLI package. It is an
  oclif TypeScript CLI named `chewy-cc`.
- `.gitmodules` defines Chewy's component and package repositories, including
  `cli`, `lib`, `docs`, `console`, and component repos under `components/`.
- `scripts/convert_submodules_to_subtrees.sh` converts those submodules to git
  subtrees.
- `.github/workflows/convert_submodules_to_subtrees.yml` manually runs that
  conversion script and pushes a review branch.

Many component directories may be uninitialized submodules in fresh workspaces.
Check `git submodule status` before assuming a component directory contains its
source. If you need the source for a component, initialize or update only the
submodules needed for the task unless the human asks for all of them.

The user prefers monorepo-native Chewy workflows over submodule-heavy workflows.
When making architecture or workflow recommendations, favor approaches that make
the full graph visible to agents and keep related changes in one branch.

## Commands

From `contributor-cli/`, use Yarn:

```bash
yarn install
yarn build
yarn test
yarn lint
```

`yarn test` runs Mocha tests; `posttest` runs lint automatically. The CLI targets
Node `>=12.0.0`, so avoid introducing APIs or syntax that would raise the runtime
floor unless that is an explicit part of the task.

For top-level submodule work:

```bash
git submodule status
./scripts/convert_submodules_to_subtrees.sh
```

The conversion script removes submodules and adds subtrees. Treat it as a
destructive repository-structure operation: run it only on an appropriate branch,
review the full diff, and push promptly in SAM.

## Validation

Choose validation based on the files changed:

- `contributor-cli/src/**`, `contributor-cli/test/**`, or CLI metadata:
  run `yarn test` from `contributor-cli/`.
- `scripts/convert_submodules_to_subtrees.sh` or `.gitmodules`:
  inspect `git submodule status`; do not run the conversion script unless the
  task calls for an actual conversion.
- `.github/workflows/**`:
  review YAML syntax and check CI status after pushing when a workflow run is
  expected.
- Docs-only changes:
  reread the changed document and verify links/commands still match repo state.

When running a dev server or preview in SAM, expose the port with `expose_port`
so the human can inspect it from the workspace URL. Do not leave long-running
servers idle after they are no longer needed.
