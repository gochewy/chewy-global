# Chewy Global

A workspace to build out the whole Chewy workflow.

Use the Chewy Contributor CLI to manage development.

To start working on a Chewy Stack version, run:

```bash
# chewy-cc git checkout <semver number>
chewy-cc git checkout 0.1.0
```

This ensures all related packages are checked out to the same version.

## Converting Submodules to Subtrees

Submodules can be replaced with Git subtrees for simpler dependency management. Run the helper script from the repository root:
You can also trigger the **Convert Submodules to Subtrees** GitHub Action to generate a branch automatically.

```bash
./scripts/convert_submodules_to_subtrees.sh
```

See [SUBTREE_CONVERSION.md](SUBTREE_CONVERSION.md) for more information.
