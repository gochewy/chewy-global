# Chewy as an Agent-Operable Startup Stack

> A direction document for what Chewy can become in an AI-enabled world.
> This is a planning artifact, not an implementation.

## TL;DR

Chewy should become a framework for declaring, operating, testing, debugging,
and deploying a full startup stack made from open-source components. It should
not be only a content stack, a CMS, a Kubernetes platform, a Pulumi replacement,
or a one-shot app generator.

The modern product is a **deterministic contract layer plus guidance-driven
agent playbooks**:

1. Chewy deterministically records which features are enabled, which deployment
   targets exist, what each component requires/provides, how capabilities bind to
   providers, and what must be true for the stack to be valid.
2. Chewy emits instructions, tests, debug recipes, and safe-edit boundaries so
   code-writing agents can perform the messy installation and integration work
   without Chewy needing to encode every file edit for every framework version.

This split is the key maintenance insight. The original Chewy vision got stuck
because fully deterministic installation across a wide OSS stack creates an
enormous maintenance burden. In the agent era, Chewy can instead define the
shape, invariants, validation, and operational workflow, then let agents adapt
the implementation to the current codebase.

## The Product Thesis

Chewy is an operational contract for agents.

It should help an agent answer:

- What features are enabled in this app?
- Which components implement those features?
- What does each component require and provide?
- How does this run locally?
- How do I seed data, log in, and run Playwright tests?
- How do I enable useful debug information?
- How do I inspect logs, volumes, queues, database state, and deployed services?
- How do I deploy this same app to each target?
- What is safe for an agent to change?
- What invariants must pass before the change is valid?

The durable value is not scaffolding. Agents can already scaffold. The durable
value is the curated, verified knowledge of how real startup components fit
together and how agents should safely operate them.

## Startup Stack Scope

The first product surface should be a portable startup stack:

- web frontend / marketing site
- API service
- auth
- background jobs / queues
- database
- object storage
- cache
- email
- admin, analytics, and CMS where the tool is declarative enough
- local dev, preview, staging, and production targets

The current preferred modern component direction is TypeScript-first and
agent-friendly:

- Astro for web/marketing
- Hono for APIs
- Better Auth for auth
- BullMQ + Redis where Redis-backed queues make sense
- Postgres for primary data
- S3-compatible object storage
- Cloudflare-native services where they support a near-zero-cost path

Not every attractive open-source component should be treated equally. Directus,
Appsmith, Hasura, Metabase, and similar tools may be useful, but Chewy should
only promote them to first-class recipes when their configuration and important
state are reproducible enough for agents to inspect, modify, test, and promote
across environments.

## The Viable Split: Deterministic State, Loose Implementation

Chewy should be deterministic about state and contracts:

```bash
chewy feature enable web --with astro
chewy feature enable api --with hono
chewy feature enable auth --with better-auth
chewy feature enable queue
chewy feature enable storage
chewy target enable local-compose
chewy target enable cloudflare
chewy target enable vm
chewy target enable kubernetes
```

Those commands update canonical project state:

```yaml
features:
  web:
    provider: astro
    status: enabled
  api:
    provider: hono
    status: enabled
  auth:
    provider: better-auth
    requires:
      - database
      - email
  queue:
    capability: queue
    bindings:
      local-compose: bullmq-redis
      cloudflare: cloudflare-queues
      vm: bullmq-redis
      kubernetes: bullmq-redis

targets:
  local: local-compose
  preview: cloudflare
  production: cloudflare
```

Then Chewy exposes both machine-readable state and human/agent guidance:

```bash
chewy status --json
chewy validate --json
chewy doctor
chewy instructions --agent codex
chewy instructions --feature auth
chewy instructions --target kubernetes
```

The agent performs the non-deterministic work: installing packages, adapting
file layout, adding middleware, writing migrations, wiring tests, handling
version-specific changes, and repairing integration details. Chewy bounds that
work with expected structure, invariants, diagnostics, and verification.

## Component Contracts as Agent Operating Manuals

A component contract should be more than a package manifest. It should be an
operating manual for agents.

```yaml
component: hono-api
kind: api

runtime:
  local:
    compose_service: api
    port: 8787
    healthcheck: /health
  cloudflare:
    worker: api
    command: wrangler dev
  kubernetes:
    namespace_from: environment
    deployment: api

debug:
  local:
    logs: docker compose logs -f api
    enable_verbose_mode:
      env:
        HONO_DEBUG: "true"
  cloudflare:
    logs: wrangler tail
  vm:
    logs: journalctl -u chewy-api -f
    inspect_disk: df -h
  kubernetes:
    logs: kubectl logs deploy/api -n ${namespace}
    events: kubectl get events -n ${namespace}
    shell: kubectl exec -it deploy/api -n ${namespace} -- sh

test:
  smoke:
    - GET /health returns 200
  playwright:
    base_url_from: web.public_url

agent:
  can_modify:
    - src/routes/**
    - src/middleware/**
  must_not_modify:
    - production secret bindings
```

This is the layer most frameworks do not provide: not merely "run this
container," but "this is how an agent configures, tests, logs into, observes,
and debugs this component on each target."

## Declarative Compatibility as a Selection Filter

Chewy should score components by how safely agents can operate them:

- Can configuration be represented as files or reproducible commands?
- Can important state be exported/imported deterministically?
- Can permissions, schemas, content models, and dashboards be versioned?
- Can local dev be reproduced without hidden admin UI state?
- Can a healthcheck prove the component is up?
- Can an agent seed it, log in, run Playwright tests, and inspect failures?
- Can upgrades be tested?
- Can the same component be promoted across environments?

Tools that are powerful but opaque should be second-class until Chewy can define
a reliable operating contract for them. A smaller set of boring, declarative
components is more valuable than a large marketplace of fragile integrations.

## Dependency Resolution Still Matters

The original Chewy dependency-resolution idea remains useful, but it should be
grounded in practical startup capabilities.

A service declares what it requires:

```yaml
requires:
  - database:
      kind: postgres
      modifiers:
        - pgvector
  - object-storage:
      kind: s3-compatible
  - queue
```

Different targets can satisfy those capabilities differently:

- Local Compose: Postgres container, MinIO or local S3-compatible service, Redis
  + BullMQ.
- Cloudflare: D1 or external Postgres via an appropriate binding, R2,
  Cloudflare Queues.
- VM: Docker Compose or systemd services, Postgres volume, Redis volume, remote
  object storage.
- Kubernetes: Postgres operator or managed Postgres, Redis deployment or managed
  Redis, S3-compatible storage, Kubernetes-native debug commands.
- AWS/GCP/Azure later: managed databases, object storage, queue services, or VM
  defaults where cost simplicity matters more than managed-service purity.

The consumer should not care whether `queue` is BullMQ+Redis locally and
Cloudflare Queues in preview, as long as the contract explains the behavioral
constraints and verification checks.

## Deployment Targets

Chewy should start with a limited, opinionated target set.

### 1. Cloudflare-first, near-zero-cost path

Cloudflare is attractive because it can support a useful early-stage stack with
very low baseline cost:

- Astro static/SSR where appropriate
- Hono on Workers
- R2 for object storage
- D1 or an external Postgres path where relational features are required
- Queues for simple background work
- KV/Durable Objects where they fit

This target gives Chewy a compelling first demo: a real app that can run before
it creates a serious cloud bill.

### 2. Cheap VM path

A single VM is the pragmatic escape hatch for workloads Cloudflare does not fit:

- Docker Compose or systemd
- Caddy/Traefik
- Postgres volume
- Redis volume
- remote object storage or MinIO
- backups
- logs and disk inspection playbooks

This should be cheap and boring, not a miniature enterprise platform.

### 3. Kubernetes path

Kubernetes should be a supported target, not the default ideology:

- strict namespace and environment conventions
- manifests, Helm, or Kustomize generated from Chewy contracts
- ingress, secrets, volumes, service accounts, and probes
- staging verification
- explicit agent debug playbooks using `kubectl`

The point is not "use Kubernetes for everything." The point is that when a stack
does run on Kubernetes, agents should receive precise instructions for deploying
and debugging it.

### 4. Big-cloud managed paths later

AWS, GCP, and Azure should come later in two modes:

- low-cost VM/container defaults
- managed-service variants for teams that explicitly want RDS, Cloud SQL,
  ElastiCache, S3/GCS, ECS, EKS, GKE, etc.

Chewy should avoid making an expensive managed-cloud staging stack the default.

## CLI Shape

The CLI should be small and deterministic:

```bash
chewy init
chewy feature list
chewy feature enable auth --with better-auth
chewy feature disable cms
chewy target add cloudflare
chewy target add vm
chewy status --json
chewy validate --json
chewy doctor
chewy instructions
chewy instructions --agent codex
chewy instructions --feature auth
chewy instructions --target staging
chewy verify local
chewy verify staging
chewy deploy plan --target cloudflare
chewy deploy apply --target cloudflare
```

Every command that agents call should support stable exit codes, `--json`, and
non-interactive behavior.

## Verification as the Moat

The real asset is not a list of integrations. It is verified stack recipes.

A recipe should include:

- component manifests
- dependency contracts
- provider bindings
- environment variable and secret mappings
- local dev setup
- deployment target rules
- seed flows
- Playwright and smoke tests
- debug playbooks
- safe-edit rules for agents
- upgrade and compatibility notes

For example:

```text
Astro + Hono + Better Auth + Postgres + Queue + Object Storage
```

The demo should prove:

1. Start locally.
2. Seed a user.
3. Log in through Playwright.
4. Call the Hono API as the current user.
5. Write/read Postgres.
6. Upload/read an object.
7. Enqueue and process a job.
8. Deploy to one target.
9. Run the same verification remotely.
10. Produce debug instructions when a check fails.

## MVP Sequence

1. Define the Chewy app state schema for `features`, `targets`, `capabilities`,
   and `bindings`.
2. Implement `chewy feature enable/disable`, `chewy target enable/disable`,
   `chewy status --json`, and `chewy validate --json`.
3. Define component contracts for Astro, Hono, Better Auth, Postgres, object
   storage, and queue.
4. Generate agent instructions from enabled state: global instructions, per
   feature instructions, and per target instructions.
5. Build the first verified recipe locally with Docker Compose.
6. Add a Cloudflare target for the near-zero-cost path.
7. Add a cheap VM target.
8. Add Kubernetes only after the local and Cloudflare/VM paths prove the model.
9. Treat every new component/provider support claim as incomplete until it has a
   verification flow and debug playbook.

## What Changes From The Old Chewy

- **Old Chewy:** tries to deterministically install and wire a large deep stack.
- **New Chewy:** deterministically declares the stack and emits operating
  contracts for agents that do the messy integration work.
- **Old moat:** component catalog plus dependency graph.
- **New moat:** verified recipes, target-specific debug playbooks, and
  agent-operable contracts.
- **Old target strategy:** provider breadth and Pulumi-driven provisioning.
- **New target strategy:** near-zero-cost Cloudflare path first, cheap VM path
  second, Kubernetes as a supported target, managed clouds later.
- **Old component support:** if a component is useful, add it.
- **New component support:** if a component is declarative, testable,
  inspectable, and debuggable by agents, promote it.

The bet: Chewy should not eliminate looseness. It should bound looseness. It
defines the shape of the stack, the invariants, the tests, the debug paths, and
the safe operating envelope, then lets agents handle the integration details
inside that envelope.
