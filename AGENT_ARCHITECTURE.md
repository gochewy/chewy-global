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

The thing that actually makes Chewy distinctive — and was always the unfinished
core — is **not** scaffolding and **not** the curated component list. It is a
**layered dependency-resolution and binding engine**: applications declare typed
dependencies (on other services, or on data services like databases and object
storage), and Chewy resolves each dependency through a *chain* of infrastructure
layers down to a concrete cloud provider, wiring the **outputs** of each layer
(connection strings, credentials, endpoints) to the **inputs** of the layer
above it via explicit mappings. The end user supplies only infrastructure keys;
everything else is provisioned (via Pulumi) and bound automatically.

The durable, compounding asset — the moat — is the **library of binding
patterns**: the curated, validated knowledge of how to satisfy "Next.js + Prisma
needs Postgres-with-pgvector" using Neon, or RDS-in-a-private-VPC, or
Postgres-on-DigitalOcean, etc., across the combinatorial space of *services ×
data-services × providers*. In an agent world, that library is exactly what lets
a code-writing agent wire a real, deployable system correctly instead of
hallucinating glue — and it is precisely the part that is expensive to build,
hard to copy, and improves with every pattern added.

## The dependency-resolution model (the core idea)

This is the heart of Chewy and the part worth investing in.

### Layers of dependency

There are two broad kinds of nodes in the graph:

- **Services** — fundamentally code or binaries: things that get built and/or run
  somewhere (a Next.js app, a NestJS API, Hasura, a Django app, an Expo build).
- **Data / infrastructure dependencies** — databases, object storage
  (S3-compatible), search, caches, and the physical/logical infrastructure that
  backs them.

A service declares what it **requires**. For example, a Next.js app with Prisma
declares a required dependency on a **Postgres database**, optionally with
**modifiers** (`pgvector enabled`, a minimum version, an extension set). It does
not declare *how* that database is provisioned — only that it needs one, and what
shape it must have.

### Satisfaction is a chain, and providers collapse it differently

A single logical dependency ("a Postgres database") is satisfied by a *chain* of
lower-level dependencies, each of which can itself be satisfied differently:

```
Next.js + Prisma  ──requires──►  Postgres database (modifiers: pgvector)
                                        │
                       ┌────────────────┴─────────────────┐
                       ▼                                    ▼
              [ logical database ]                  [ Neon Postgres ]
                       │                          (satisfies logical +
              [ physical instance ]               physical in one node)
                       │
              [ cloud provider / region ]
```

- With **RDS**: a *logical database* lives inside a *physical instance*, which
  must be provisioned on a *cloud provider* in a region. Three layers.
- With **Neon**: a single node satisfies both the logical and physical layers at
  once — the chain is shorter.

The point: the **consumer doesn't care about the chain**. Prisma only needs a
connection string. As long as *something* downstream eventually provides a valid
connection string (plus whatever else the modifiers imply), the dependency is
satisfied, regardless of how many layers it took to get there.

### Inputs, outputs, and the mapping layer

Every node declares two typed surfaces:

- **Requires (inputs)** — what it needs to be provisioned or to function (e.g. a
  cloud provider needs an API key; a logical database needs a physical instance
  to live in).
- **Provides (outputs)** — what it exposes once provisioned (e.g. Neon provides a
  `connection_string`, a `database_password`, a `host`; an S3 bucket provides an
  endpoint, region, access key, secret).

A **mapping layer** declares how one node's outputs satisfy another node's
inputs: "for a Postgres-shaped dependency, map provider output
`connection_string` → consumer input `DATABASE_URL`." Mappings are where the
real, fiddly knowledge lives — e.g. *"Hasura connecting to RDS in the same VPC
should use the private endpoint output, not the public one"* vs *"Hasura + Neon
uses the pooled connection string."*

This is what makes the system composable: dependencies can be **reused** across
an application (two services sharing one database), **decoupled**
(swap Neon for RDS without touching the app), or fully specified by the app while
the deployer just plugs in keys.

### Why this is the moat

The schema, the graph resolver, and the Pulumi calls are the *mechanism* — real
work, but replicable. The **defensible, compounding asset is the library of
binding patterns**: a deep, curated, validated catalog of "you can run X against
Y hosted on Z, and here is exactly how the outputs map to inputs." Examples of
single library entries:

- Hasura + Neon Postgres (pooled connection)
- Hasura + RDS Postgres over a private VPC connection
- Next.js/Prisma + DigitalOcean Managed Postgres with pgvector
- Django + MariaDB on Aiven
- A service + S3-compatible storage on Cloudflare R2 vs AWS S3 vs DO Spaces

Every entry added makes the next application more likely to "just work." This is
a flywheel, not a feature — and it is the one part of Chewy that an agent cannot
trivially regenerate, because it encodes operational truth (private vs public
endpoints, pooling, auth quirks, extension support) that is not in any single
component's README.

## Why this matters in an agent world

Agents are good at generating code and bad at the *operational* glue: knowing
that this database wants a pooled connection, that this pairing needs a private
endpoint, that this storage provider names its secret differently. That glue is
exactly what Chewy's binding library encodes.

So the agent value proposition is concrete: an agent declares *intent* ("add a
search service and a vector-capable Postgres"), Chewy's resolver + binding
library turns that into a **correct, provisionable, wired** plan, and a
deterministic validator gives a hard pass/fail before anything is built or
deployed. The agent does the open-ended part (app code); Chewy owns the
constrained, high-stakes part (resolution + binding + provisioning) where being
wrong is expensive.

## Contract surfaces

To make the above explicit and agent-operable, the contract is layered:

- `chewy-app.yml` — the application composition: which services exist and what
  they require (with modifiers).
- `chewy-interfaces.yml` — the **requires/provides** surfaces and the
  **mappings** between outputs and inputs. This is where the binding library is
  expressed and extended.
- `chewy-runtime.yml` — how services run locally (the dev-loop / compose-equivalent).
- `chewy-agent.yml` — affordances for agents: which operations are safe and
  automatable, what is deterministic, what an agent may and may not mutate.

## The agent workflow Chewy should make safe

```
plan ──► declare requirements ──► resolve + bind ──► validate ──► dev / deploy
  ▲                                                      │
  └──────────────────── on failure ─────────────────────┘
```

1. **Plan** — agent proposes intent in terms of services and required dependencies.
2. **Declare** — agent edits `chewy-app.yml` (typed, diffable).
3. **Resolve + bind** — Chewy walks the dependency chains, selects satisfying
   providers, and applies the mapping layer to wire outputs → inputs.
4. **Validate** — deterministic check that every required input is satisfied by
   some provided output, every modifier is honored, and the graph is complete.
   Structured pass/fail.
5. **Dev / deploy** — only on a passing graph does local bring-up or a Pulumi
   deploy proceed; the deployer supplies infrastructure keys, nothing else.

## CLI shape for deterministic agent use

- `chewy resolve` — resolve the dependency graph; report unsatisfied
  requirements and ambiguous choices as structured diagnostics.
- `chewy validate` — full graph + mapping validation; `--json`, non-zero exit on
  failure.
- `chewy plan` — show the concrete provisioning + binding implications of a
  proposed change without applying.
- `chewy dev start` / `chewy dev status` — deterministic local bring-up.
- `chewy deploy plan` / `chewy deploy apply` — Pulumi plan/apply gated on a
  passing graph.

Every command: `--json` output, stable exit codes, no interactive prompts under
a non-interactive flag.

## Monorepo direction

The current `chewy-global` is a meta-repo orchestrating ~21 submodules with
versions kept in lockstep via semver-named branches — overhead that fights
against agentic workflows. Go **monorepo-native**: collapse the submodules into
one tree (the 2025 subtree-conversion work is a step toward this) so an agent
sees the whole graph, and a requirement change plus the code that satisfies it
land in one atomic commit. The component/provider catalog stays modular *within*
the monorepo.

## Practical MVP sequence

1. **Model one real chain end to end.** Next.js/Prisma → Postgres(pgvector) →
   { DigitalOcean Managed Postgres } with explicit requires/provides + mapping.
   Prove the connection string is resolved and injected correctly.
2. **Add a second provider for the same dependency** (Neon) to prove the chain
   collapses and the consumer is unchanged. This validates the whole abstraction.
3. **Ship `chewy resolve` + `chewy validate`** with structured diagnostics — the
   keystone everything agentic depends on.
4. **Grow the binding library deliberately** along the highest-value pairings
   (Hasura+Postgres variants, service+S3-compatible storage variants). Treat
   each entry as a tested unit. This is where the moat accrues.
5. **Make `dev start` and `deploy` consume the resolved graph**, deployer
   supplying only keys.
6. **Author `chewy-agent.yml` + `--json` everywhere** so the loop is safely
   operable by an agent harness.
7. **Collapse to a monorepo** once the loop works on one stack.

## What stays the same / what changes

- **Stays:** the curated component/provider model, the dependency graph, the
  Pulumi-based provisioning, the typed schemas.
- **Changes:** the *framing* (from "app generator" to "agent-operable
  resolution + binding substrate"), the *explicitness* of requires/provides/
  mappings, the deliberate investment in the **binding-pattern library** as the
  core asset, the *CLI surface* (structured, deterministic), and the *repo
  structure* (monorepo over submodules).

The bet: Chewy's durable moat in an agent world is the **library of binding
patterns + the resolution engine that applies them** across many providers — the
operational knowledge of how real systems connect — not the scaffolding agents
already produce, and not the provisioning primitive (Pulumi) underneath.
