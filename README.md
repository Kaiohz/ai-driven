# AI-Driven Development Workflow

A multi-tool AI coding assistant configuration system that standardizes software development workflows across OpenCode.

## Overview

This repository provides unified AI agent and skill configurations designed to:

- **Standardize development workflows** across AI coding assistants
- **Enforce architectural best practices** (Hexagonal Architecture, SOLID, TDD)
- **Provide specialized agents** for each phase of software development
- **Integrate external tools** via MCP (Model Context Protocol)
- **Support multiple technology stacks** (FastAPI, NestJS, React, K3s)

## Repository Structure

```
prompt-rules/
├── README.md
├── .gitignore                          # Excludes local/secret files (service.json, .env, .DS_Store…)
└── ai-driven/                          # The live ~/.config/opencode/ content (sanitized)
    ├── AGENTS.md                       # Global instructions for all agents
    ├── switch-config.sh                 # Switches the active agent profile (symlinks)
    │
    ├── agents/                         # ACTIVE profile snapshot (real files)
    ├── agents-cloud/                   # Profile: cloud (ollama-cloud models)
    ├── agents-spark/                   # Profile: spark (soludevtech LiteLLM models)
    ├── agents-hybrid/                  # Profile: hybrid (mixed models + extra agents)
    │
    ├── skills/                         # 33 skills (+ _shared/ trace helpers)
    ├── commands/                       # 32 command shims (one per manually-invocable skill — `telegram` is loop-invoked, no shim)
    │
    ├── opencode.json                   # Main config — API keys REDACTED
    ├── opencode-cloud.json             # Alternate profile config — API keys REDACTED
    ├── opencode-spark.json             # Alternate profile config — API keys REDACTED
    ├── opencode.jsonc                  # Empty schema stub
    ├── opencode.example.json           # Agent-registry template (Anthropic models)
    └── cli.json                        # TUI preferences
```

> **Secret policy**: the `opencode*.json` files are committed with `"apiKey": "REPLACE_WITH_YOUR_API_KEY"` placeholders. Never commit real API keys. Local files that contain secrets (`service.json`, `.env*`) are gitignored.

### Source of truth and sync convention

`~/.config/opencode/` is the live source of truth. To sync this repo from it:

```bash
LIVE=~/.config/opencode
REPO=ai-driven
rsync -a --delete --exclude='.DS_Store' --exclude='.git' "$LIVE/agents-cloud/" "$REPO/agents-cloud/"
rsync -a --delete --exclude='.DS_Store' --exclude='.git' "$LIVE/agents-spark/"  "$REPO/agents-spark/"
rsync -a --delete --exclude='.DS_Store' --exclude='.git' "$LIVE/agents-hybrid/" "$REPO/agents-hybrid/"
rsync -a --delete --exclude='.DS_Store' --exclude='.git' "$LIVE/skills/"       "$REPO/skills/"
rsync -a --delete --exclude='.DS_Store' "$LIVE/commands/"                      "$REPO/commands/"
rsync -aL --delete --exclude='.DS_Store' "$LIVE/agents/"                       "$REPO/agents/"   # dereference active-profile symlinks
cp "$LIVE/AGENTS.md" "$LIVE/switch-config.sh" "$LIVE/cli.json" "$LIVE/opencode.jsonc" "$LIVE/opencode.example.json" "$REPO/"
for f in opencode.json opencode-cloud.json opencode-spark.json; do
  sed -E 's/"apiKey": "[^"]*"/"apiKey": "REPLACE_WITH_YOUR_API_KEY"/g' "$LIVE/$f" > "$REPO/$f"
done
```

## Agent Profiles

The same 11 core agents exist in three profiles with different models. `switch-config.sh <profile>` repopulates `agents/` with per-file symlinks to the chosen profile's `.md` files (OpenCode does not follow directory symlinks).

| Profile | Implementation agents | Reviewer + QA agents | Extras |
|---------|------------------------|----------------------|--------|
| `cloud` | `ollama-cloud/glm-5.3-flash` | `ollama-cloud/minimax-m3.1-flash` | `security-agent`: `ollama-cloud/glm-5.3` |
| `spark` | `soludevtech/qwen3.6-35b` | `soludevtech/ornith-1.5-35b` | `security-agent`: `soludevtech/ornith-1.5-35b` |
| `hybrid` | `soludevtech/qwen3.6-35b` | `ollama-cloud/glm-5.3-flash` | `security-agent`: `ollama-cloud/glm-5.3-flash` + `agno-engineer`, `langchain-engineer`, `promptfoo-engineer` |

```bash
./switch-config.sh            # show active profile
./switch-config.sh hybrid     # switch (restart TUI sessions afterwards)
```

## Specialized Agents

11 core agents per profile, each designed for a specific phase of development:

| Agent | Purpose |
|-------|---------|
| `product-owner` | Requirements analysis, acceptance criteria, user stories |
| `test-writer` | TDD tests for the detected stack (pytest / Jest+Supertest / Vitest+RTL) |
| `fastapi-hexagonal` | FastAPI backend with hexagonal architecture |
| `nestjs-hexagonal` | NestJS backend with hexagonal architecture |
| `react-hexagonal` | React frontend with hexagonal architecture |
| `code-reviewer-python` | Python code review — 6 dimensions, auto-loads matching skills |
| `code-reviewer-nestjs` | NestJS code review — 6 dimensions, auto-loads matching skills |
| `code-reviewer-react` | React code review — 6 dimensions, auto-loads matching skills |
| `tester-qa` | E2E QA (docker stack relaunch + curl/Chrome DevTools MCP) and Playwright spec transcription |
| `k3s-devops` | K3s/Flux CD infrastructure management (GitOps) |
| `security-agent` | Security questions, focused vulnerability reviews, and the full 6-phase audit/pen-test workflow via the exclusive `security-audit` skill |

The `hybrid` profile adds: `agno-engineer`, `langchain-engineer`, `promptfoo-engineer`.

### Authorization model

Every agent declares its permissions in frontmatter — **deny all skills, allow only its own**:

```yaml
permissions:
  - action: "mcp_*"
    resource: "*"
    effect: deny
  - action: skill
    resource: "*"
    effect: deny
  - action: skill
    resource: <own-skills>
    effect: allow
```

- `opencode.json` additionally scopes the built-in `plan` agent (all skills denied) and `build` agent (explicit skill allowlist).
- The `security-audit` skill is exclusive to `security-agent`: no other agent or profile allows it.
- Every agent starts with a **blocking skill gate** (STEP 0): its skills must be loaded before any file is read.

## Skills

33 skills providing specialized capabilities:

| Skill | Purpose |
|-------|---------|
| `async-nestjs-patterns` | NestJS async: Observables interop, event emitter, Bull queues, microservices, WebSockets |
| `async-python-patterns` | Python asyncio: event loop, TaskGroup, concurrency pitfalls, testing |
| `async-react-patterns` | Suspense, `use()`, server components, streaming SSR, TanStack Query |
| `book-to-skill` | Convert books/epubs into structured skills |
| `brainstorming` | Design-first workflow with visual companion and spec review loop |
| `code-reviewer` | 6-dimension review rubric (correctness, security, performance, maintainability, testability, architecture) |
| `code-simplifier` | Clarity/maintainability refactoring preserving behavior |
| `dbanalyze` | Schema analysis: SchemaCrawler lint, 1NF/2NF/3NF, Alembic migrations |
| `documentation-writer` | README + API documentation with curl examples |
| `feature-implementation` | 6-phase dev workflow (skills version) |
| `feature-implementation-agents` | Same workflow, delegating every step to dedicated agents |
| `feature-implementation-light` | Fast 4-step loop (TDD → implement → review → simplify) |
| `githubpr` | PR lifecycle: branch, commit, push, PR, CI polling (no auto-merge) |
| `gof-design-patterns` | Gang of Four design patterns reference |
| `hexagonal-nestjs-patterns` | NestJS hexagonal architecture rules |
| `hexagonal-python-patterns` | FastAPI/Python hexagonal architecture rules |
| `hexagonal-react-patterns` | React/TypeScript hexagonal architecture rules |
| `iac-review` | Terraform/Kubernetes/Flux review checklists |
| `linter` | ruff + pyright (Python) / eslint + prettier (TypeScript) |
| `loop-implementation-review` | Implementation loop wrapping feature-implementation with e2e QA + review gate |
| `loop-implementation-review-agents` | Same loop, agent-driven |
| `loop-implementation-review-agents-light` | Lightweight agent loop |
| `performance-audit` | Deep performance audit for Python and React |
| `popeyescan` | Kubernetes cluster health (Popeye) |
| `security-audit` | Cloudflare security-audit-skill: 6-phase audit/pen-test workflow (exclusive to `security-agent`) |
| `sonarfix` | SonarQube issue remediation |
| `test-writer-nestjs` | Behavioral Jest/Supertest tests on the real AppModule |
| `test-writer-python` | Behavioral pytest/httpx tests on the real FastAPI app |
| `test-writer-react` | Component/e2e Vitest + RTL + MSW tests |
| `telegram` | Telegram notifications via Bot API — loop completion (summary + PR links) and question/blocked alerts |
| `tester-qa` | Docker stack relaunch + curl/Chrome DevTools QA, Playwright transcription |
| `trivyfix` | Trivy vulnerability remediation |
| `vercel-react-best-practices` | React/Next.js performance rules from Vercel Engineering |

`skills/_shared/` holds the trace protocol helpers shared by the loop skills. `commands/` contains one command shim per skill so each is invocable as `/skill-name`.

## Development Workflow

The `feature-implementation` skill orchestrates the full development cycle through 6 sequential phases:

```
  PHASE 1: REQUIREMENTS
  ┌──────────────────────────────────────────────────────────────────┐
  │ product-owner                                                    │
  │ Clarify requirements, acceptance criteria, edge cases            │
  └───────────────────────────────────┬──────────────────────────────┘
                                      ▼
  PHASE 2: TEST-FIRST DEVELOPMENT
  ┌──────────────────────────────────────────────────────────────────┐
  │ test-writer (python / nestjs / react, detected stack)            │
  │ Write failing tests (TDD Red-Green-Refactor)                     │
  └───────────────────────────────────┬──────────────────────────────┘
                                      ▼
  PHASE 3: IMPLEMENTATION
  ┌──────────────────────────────────────────────────────────────────┐
  │ fastapi-hexagonal / nestjs-hexagonal / react-hexagonal           │
  │ Implement using hexagonal architecture, make tests pass          │
  └───────────────────────────────────┬──────────────────────────────┘
                                      ▼
  PHASE 4: QUALITY ASSURANCE
  ┌──────────────────────────────────────────────────────────────────┐
  │ code-reviewer → code-simplifier → linter → sonarfix → trivyfix   │
  │ Review, simplify, lint, fix static analysis, fix vulnerabilities │
  └───────────────────────────────────┬──────────────────────────────┘
                                      ▼
  PHASE 5: DOCUMENTATION & VERIFICATION
  ┌──────────────────────────────────────────────────────────────────┐
  │ tester-qa → documentation-writer                                 │
  │ E2E testing (Playwright), update docs                           │
  └───────────────────────────────────┬──────────────────────────────┘
                                      ▼
  PHASE 6: OPEN PR
  ┌──────────────────────────────────────────────────────────────────┐
  │ githubpr                                                         │
  │ Branch → Push → Draft PR → CI polling → Ready (merge is manual)   │
  └──────────────────────────────────────────────────────────────────┘
                                       ▼
  PHASE 7: NOTIFY
  ┌──────────────────────────────────────────────────────────────────┐
  │ telegram                                                         │
  │ Telegram completion notification (summary + PR links)            │
  └──────────────────────────────────────────────────────────────────┘
```

Phase 4 includes feedback loops: if sonarfix or trivyfix find issues, iterate back to implementation and re-run the check.

The `telegram` skill is also used **mid-loop**: whenever the loop is blocked waiting for user input (ambiguous stack, decision needed, rejected step), it sends a Telegram question alert before waiting. Notifications are best-effort — a missing config or failed send never invalidates the completed work.

### Security auditing (optional)

For security questions, focused vulnerability reviews, or explicit full audits/pen-tests, invoke the `security-agent`. It carries the `security-audit` skill (Cloudflare's security-audit-skill): reconnaissance → coverage-led hunting waves → candidate validation → structured findings (`findings.json` validated against `report-schema.json`) → independent record verification → target-neutral report. By default it answers in guidance mode; the full 6-phase workflow and its output directory run only on explicit request.

### Brainstorming workflow (optional, before implementation)

For new features or creative work, invoke `brainstorming` before `feature-implementation`:

1. Explore project context
2. Ask clarifying questions (one at a time)
3. Propose 2-3 approaches with trade-offs
4. Present design sections, get user approval
5. Write spec to `docs/specs/YYYY-MM-DD-<topic>-design.md`
6. Automated spec review loop (subagent, max 5 iterations)
7. User reviews written spec
8. Hand off to `feature-implementation`

## Architecture & Principles

All implementation agents enforce:

### Hexagonal Architecture (Ports & Adapters)

```
┌───────────────────────────────────────────────────┐
│  INFRASTRUCTURE                                     │
│  (adapters: REST, DB, email, external services)     │
│                                                     │
│  ┌───────────────────────────────────────────────┐  │
│  │  APPLICATION                                   │  │
│  │  (use cases, DTOs, routes/controllers)         │  │
│  │                                                │  │
│  │  ┌─────────────────────────────────────────┐   │  │
│  │  │  DOMAIN                                  │   │  │
│  │  │  (entities, ports, services)            │   │  │
│  │  │  Pure language — zero external imports  │   │  │
│  │  └─────────────────────────────────────────┘   │  │
│  └───────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

### SOLID + KISS

- **SRP**: 1 class = 1 responsibility, 1 use case = 1 business action
- **OCP**: Extension via new adapters, never modify ports
- **LSP**: All implementations respect their port's contract
- **ISP**: Small, focused interfaces
- **DIP**: Use cases depend on ports (abstractions), never on adapters
- **KISS**: Direct transformations, no unnecessary abstractions, readable code over clever code

### Testing Philosophy

- **Real implementations** for all internal components (repositories, services, use cases)
- **Testcontainers** for real infrastructure (Postgres, Redis, Kafka) — no SQLite fallback, fail fast when Docker is unavailable
- **Mocks only** for outbound adapters toward external systems (APIs, email, S3, Stripe)
- **Behavioral tests from the router**: httpx AsyncClient on the real FastAPI app / Supertest on the real NestJS AppModule / RTL on the real component
- **TDD**: Write failing tests before implementation

## Supported Technology Stacks

### FastAPI (Python)

| Component | Technology |
|-----------|------------|
| Runtime | Python 3.11+ |
| Package Manager | UV |
| Validation | Pydantic V2 |
| Testing | pytest, pytest-asyncio |
| Domain | Pure Python + Pydantic |

### NestJS (TypeScript)

| Component | Technology |
|-----------|------------|
| Runtime | Node.js 20+ |
| Package Manager | pnpm |
| Validation | Zod |
| Testing | Jest, Supertest |
| DI | Injection tokens, abstract classes as ports |

### React (TypeScript)

| Component | Technology |
|-----------|------------|
| Runtime | Bun |
| Build | Vite or Next.js |
| Styling | Tailwind CSS |
| Data Fetching | TanStack Query |
| Validation | Zod |
| Testing | Vitest, React Testing Library |
| Linting | Biome |

### K3s Infrastructure

| Component | Technology |
|-----------|------------|
| Kubernetes | K3s |
| GitOps | Flux CD |
| Identity | Logto (OIDC/OAuth2) |
| Auth Gateway | OAuth2 Proxy |
| Secrets | OpenBao |
| Storage | MinIO |
| Observability | OpenObserve |
| DNS/Access | Cloudflare Tunnels |
| CI/CD | GitHub Actions |

## MCP Integrations

| Server | Type | Purpose |
|--------|------|---------|
| `chrome-devtools` | local (`npx chrome-devtools-mcp@0.21.0`) | Browser inspection and E2E testing (tester-qa agent) |

## Installation

### 1. Copy the configuration

```bash
# From this repo into your OpenCode global config
cp -r ai-driven/agents-cloud ai-driven/agents-spark ai-driven/agents-hybrid ~/.config/opencode/
rsync -a ai-driven/skills/  ~/.config/opencode/skills/
rsync -a ai-driven/commands/ ~/.config/opencode/commands/
cp ai-driven/AGENTS.md ai-driven/switch-config.sh ai-driven/cli.json ~/.config/opencode/
cp ai-driven/opencode.json ~/.config/opencode/opencode.json
```

### 2. Set your API keys

Edit `~/.config/opencode/opencode.json` and replace every `REPLACE_WITH_YOUR_API_KEY` with your real provider keys (LiteLLM, Ollama Cloud…). Never commit the file with real keys back to this repo — the sync convention above re-redacts them.

### 3. Activate a profile

```bash
chmod +x ~/.config/opencode/switch-config.sh
~/.config/opencode/switch-config.sh cloud   # or spark / hybrid
```

Restart your OpenCode TUI sessions to reload the agent list.

## Customization

### Adding a new agent

Create a markdown file in `ai-driven/agents-<profile>/` with the frontmatter used by the existing agents (description, model, mode, permissions with deny-all + own allowlist), then run `switch-config.sh <profile>`.

### Adding a new skill

Create a directory in `skills/` with a `SKILL.md` (frontmatter: `name`, `description`), add a command shim in `commands/`, and allow it in the agents that need it (keep deny-all as the default for every other agent).

## Resources

- [OpenCode Documentation](https://opencode.ai/docs)
- [Cloudflare security-audit-skill](https://github.com/cloudflare/security-audit-skill)
- [Model Context Protocol](https://modelcontextprotocol.io/)
