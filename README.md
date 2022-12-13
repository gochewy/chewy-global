# Chewy Global

A workspace to build out the whole Chewy workflow.

Use the Chewy Contributor CLI to manage development.

To start working on a Chewy Stack version, run:

```bash
# chewy-cc git checkout <semver number>
chewy-cc git checkout 0.1.0
```

This will make sure all related packages are checked out to the same version. Essentially, we want to make sure that if someone is working on Chewy v0.1.1, for example, each component is in sync.