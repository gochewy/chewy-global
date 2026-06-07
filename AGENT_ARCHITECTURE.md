# Chewy as an Agent-Operable Application Substrate

> A direction document for what Chewy can become in an AI-enabled world.
> This is a planning artifact, not an implementation. It reframes Chewy's
> existing assets (config schemas, dependency graph, deploy engine) around the
> reality that most application code is now written *with* and *by* agents.

## TL;DR

Chewy started as a "deep stack framework": a CLI that composes best-of-breed OSS
components (Next.js, NestJS, Hasura, Postgres, Ory, Expo, etc.) into a coherent
microservice stack, with infrastructure deployment (Pulumi, starting on
DigitalOcean) treated as a first-class part of the framework.

In an agent-enabled world, the most valuable thing Chewy already has is **not**
the scaffolding or the curated component list — code-writing agents can scaffold
anything. The valuable, hard-to-replicate asset is the **machine-readable
contract** that describes how an application is composed, wired, run, and
deployed, plus a **deterministic engine** (the dependency graph + deploy logic in
`@gochewy/lib`) that can validate and act on that contract.

So the proposed direction is: **reposition Chewy as an agent-operable substrate**
— a typed, validated contract layer plus deterministic tooling that lets agents
safely generate, wire, validate, and evolve real applications, instead of being
another wrapper that generates an app once and walks away.

## Why this reframing

The original value proposition ("we pick good tools and glue them together for
you") is heavily eroded by agents that can scaffold and glue on demand. What
agents are *bad* at is the part Chewy is already good at:

- Knowing the **invariants** of a multi-component system (what depends on what,
  what interfaces must line up, what must be true before a deploy is safe).
- Producing a **deterministic, validatable plan** for changes across components
  and infrastructure.
- Keeping the **dev loop and the deploy loop in sync** with the same source of
  truth.

An agent that can read a typed contract, propose a diff to it, regenerate code
to match, and get a hard pass/fail from a deterministic validator is far more
reliable than one free-styling across a repo. Chewy's `zod` schemas and
dependency-graph/deploy engine are exactly the substrate for that loop.

## Core idea: the contract is the product

Today Chewy's contract is implicit and spread across:

- `chewy-component.yml` per component (`type: infrastructure | service | source`,
  dependencies),
- the `zod` config schemas in `@gochewy/lib`,
- per-component oclif command CLIs,
- per-component Pulumi deployment code.

The proposal is to make the contract **explicit, layered, and agent-first**, so
both humans and agents read/write the same artifacts. Proposed layers:

### `chewy-app.yml` — the application composition
What components exist in this app, their types, and how they depend on one
another. This is the top-level graph an agent reasons over when adding or
removing capabilities ("add a search service", "swap auth provider").

### `chewy-interfaces.yml` — the contracts between components
The typed surfaces components expose and consume (env vars, ports, URLs, schemas,
auth requirements). This is what lets an agent **wire** components correctly and
lets the validator catch a mismatch before runtime ("nextjs expects
`HASURA_GRAPHQL_ENDPOINT`, no component provides it").

### `chewy-runtime.yml` — how it runs locally
The dev-loop description (docker-compose-equivalent): how each component runs in
development, what it needs, health/readiness expectations. Keeps `chewy dev
start` deterministic and gives an agent a way to validate "does this actually
boot?" without guessing.

### `chewy-agent.yml` — affordances for agents
The machine-facing manifest: which operations are safe/automatable, what
commands are deterministic, what validation gates exist, what an agent is and is
not allowed to mutate. This is the file that makes Chewy *operable* by an agent
rather than just *readable*.

These layers are intentionally separable so an agent can touch composition
without re-deriving runtime, or change wiring without re-planning a deploy.

## The agent workflow Chewy should make safe

```
plan ──► contract update ──► generate ──► validate ──► dev / deploy
  ▲                                          │
  └──────────────── on failure ─────────────┘
```

1. **Plan** — agent proposes a change in terms of the contract
   ("add a meilisearch service, wire it to nextjs").
2. **Contract update** — agent edits `chewy-app.yml` / `chewy-interfaces.yml`
   (typed, diffable, reviewable).
3. **Generate** — agent writes/changes the actual component code to satisfy the
   updated contract.
4. **Validate** — Chewy's deterministic engine checks the dependency graph,
   interface compatibility, and runtime descriptors. Hard pass/fail.
5. **Dev / deploy** — only on a passing contract does `dev start` or a Pulumi
   deploy proceed.

The loop closes: a failing validation feeds a precise, machine-readable error
back to the agent, which is what makes agentic iteration reliable instead of
hopeful.

## CLI shape for deterministic agent use

Agents work best against commands that are deterministic, scriptable, and emit
structured output. Chewy's CLI should expose, at minimum:

- `chewy contract validate` — validate the full contract set; structured
  (JSON) diagnostics on failure, non-zero exit.
- `chewy contract plan` — given a proposed contract diff, output the concrete
  changes (graph + interfaces + deploy implications) without applying them.
- `chewy generate` — bring code into conformance with the contract (or report
  the gap).
- `chewy dev start` / `chewy dev status` — deterministic local bring-up with
  machine-readable readiness.
- `chewy deploy plan` / `chewy deploy apply` — Pulumi plan/apply gated on a
  passing contract.

Every command: `--json` output, stable exit codes, no interactive prompts when a
non-interactive flag is set. That contract-with-the-CLI is what an agent harness
binds to.

## Monorepo direction

The current `chewy-global` is a meta-repo orchestrating ~21 submodules with
versions kept in lockstep via semver-named branches. This is exactly the kind of
structure that fights against agentic workflows: agents reason and edit far more
reliably inside a single tree where the whole graph is visible and atomically
changeable.

**Direction: go monorepo-native.** Collapse the submodules into one tree (the
2025 subtree-conversion work is a step toward this), so that:

- an agent sees the entire app + components + lib + deploy code at once,
- a contract change and the code change that satisfies it land in one atomic
  commit/PR,
- validation runs across the whole graph without cross-repo version juggling.

The component *catalog* can still be modular within the monorepo; what we drop is
the cross-repo submodule coordination overhead.

## Practical MVP sequence

A pragmatic path that delivers value at each step without a big-bang rewrite:

1. **Formalize the contract on one real stack.** Take a minimal app (e.g.
   nextjs + hasura + postgres) and write explicit `chewy-app.yml` +
   `chewy-interfaces.yml` for it, derived from the existing
   `chewy-component.yml` + `zod` schemas.
2. **Ship `chewy contract validate`.** Wire the existing dependency-graph engine
   in `@gochewy/lib` to check that contract and emit structured diagnostics.
   This is the keystone — everything agentic depends on a trustworthy validator.
3. **Make `dev start` consume the contract.** Prove the runtime layer
   (`chewy-runtime.yml`) drives a real local bring-up of that stack.
4. **Add `contract plan`.** Let an agent propose a diff and see the graph/deploy
   implications before applying.
5. **Author `chewy-agent.yml` + `--json` everywhere.** Make the whole loop
   safely operable by an agent harness.
6. **Gate deploy on the contract.** Connect Pulumi plan/apply to a passing
   contract so the deploy path inherits the same guarantees as dev.
7. **Collapse to a monorepo.** Once the loop works on one stack, drop the
   submodule structure so agents operate over a single tree.

## What stays the same / what changes

- **Stays:** the curated component model, the dependency graph, the
  Pulumi-based deploy engine, the `zod` schemas as the typing foundation.
- **Changes:** the *framing* (from "app generator" to "agent-operable
  substrate"), the *explicitness* of the contract, the *CLI surface* (structured,
  deterministic, non-interactive), and the *repo structure* (monorepo over
  submodules).

The bet is that Chewy's durable moat in an agent world is **a trustworthy,
validatable contract + deterministic engine**, not the scaffolding — and that
leaning into that is what makes Chewy worth reviving.
