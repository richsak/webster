# Planner Agent Spec — Product Requirements

## Overview

**Problem**: Webster's weekly council can critique and redesign, but Layer 11 needs an experiment-aware planning brain before the critics run. Without a schema-valid `webster-planner` Managed Agent spec, later orchestration work (#52) has no registered agent to invoke and no stable `plan.md` contract to hand to critics (#53).
**Solution**: Add `agents/webster-planner.json` as an Opus 4.7 Managed Agent spec that matches the existing Managed Agents beta schema, reads marshaled memory context supplied by the orchestrator, and emits a `plan.md` containing a strict JSON object with `classification`, `next_action`, `direction_hint`, optional `new_critic_request`, and `rationale`.
**Branch**: `ralph/planner-agent-spec-v5`

---

## Goals & Success

### Primary Goal

Ship the planner agent spec and tests that prove it is schema-valid and aligned with Webster's registration/invocation pattern, without implementing the later orchestrator memory marshaling or council integration features.

### Success Metrics

| Metric | Target | How Measured |
|--------|--------|--------------|
| Managed Agent schema validity | `agents/webster-planner.json` passes the committed schema | `bun run validate:agents` and `bun test` |
| Planner output contract coverage | Tests verify required `plan.md` JSON fields and `next_action` enum values | New/updated Bun tests |
| Registration-flow alignment | Tests assert planner uses `POST /v1/agents`-compatible fields and no research-preview fields | New/updated Bun tests referencing existing schema and critic-genealogy flow |
| Scope containment | No orchestrator prompt, memory helper, or council fan-out implementation changes | Git diff review |

### Non-Goals (Out of Scope)

- Implementing orchestrator memory marshaling or planner invocation — explicitly owned by feature #52.
- Passing `plan.md` into critics/redesigner or spawning genealogy from planner output — explicitly owned by feature #53.
- Building cold-start orchestration behavior beyond planner spec instructions — feature #54 owns runtime cold-start plumbing.
- Changing the Managed Agent schema shape unless strictly required for the new `orchestrator` metadata role already allowed by `scripts/schemas/agent.schema.json`.

---

## User & Context

### Target User

- **Who**: Webster implementation operators preparing the Layer 11 planner + experiment-aware council.
- **Role**: They maintain Managed Agent specs, validation gates, and orchestration scripts for the hackathon submission.
- **Current Pain**: Later features cannot safely invoke a planner because there is no registered-agent spec or tested `plan.md` output contract.

### User Journey

1. **Trigger**: Operator picks feature #50 from `context/FEATURES.md` and needs a schema-valid planner agent spec.
2. **Action**: Operator adds `agents/webster-planner.json`, runs validation/tests, and confirms it follows the beta Managed Agents registration shape.
3. **Outcome**: Feature #52 can register/invoke this planner via `/v1/agents`, `/v1/sessions`, events, and polling, then persist the returned `plan.md`.

---

## UX Requirements

### Interaction Model

Backend/spec-only. Users do not interact with UI. The planner is registered through the same Managed Agents beta API shape used by existing specs and later invoked by orchestration code using the five-step pattern visible in `scripts/critic-genealogy.ts:440-556`: find/register agent, create session, send `user.message`, poll session status, inspect output.

### States to Handle

| State | Description | Behavior |
|-------|-------------|----------|
| Empty | Memory tail and prior verdicts are absent in week 1 | Planner instructions must choose `next_action: "explore_broadly"` and explain cold-start classification. |
| Loading | Runtime session is polling after a planner `user.message` | Out of scope for #50; covered by existing pattern in `scripts/critic-genealogy.ts:503-556` and future #52. |
| Error | Marshaled memory is contradictory, malformed, or missing key sections | Planner instructions must still emit valid `plan.md` JSON and state uncertainty in `rationale`. |
| Success | Planner has memory tail, verdicts, and monitor anomaly report | Planner emits a single `plan.md` JSON object with an allowed `next_action` and concrete `direction_hint`. |

---

## Technical Context

### Patterns to Follow

- **Managed Agent spec pattern**: `agents/webster-redesigner.json` — Opus 4.7 agent with `name`, `description`, `model`, long `system`, `tools`, `mcp_servers`, and `metadata`.
- **Monitor context pattern**: `agents/webster-monitor.json` — reads analytics inputs, handles missing prior week, and writes structured output without proposing fixes.
- **Registration + session pattern**: `scripts/critic-genealogy.ts:440-556` — `findAgentByName`, `registerAgent`, `createSession`, `sendUserMessage`, and `pollUntilIdle` use `/v1/agents`, `/v1/sessions`, `/events`, and polling with `managed-agents-2026-04-01` beta headers.
- **Schema validation pattern**: `scripts/schemas/agent.schema.json` — requires `name`, `description`, `model`, `system`, and `tools`; rejects `system_prompt`, `callable_agents`, and unknown models.
- **Agent validation tests**: `scripts/__tests__/validate-agents.test.ts` — compiles the schema with AJV 2020 and validates every `agents/*.json` file.
- **Registration gotcha tests**: `scripts/__tests__/critic-genealogy.test.ts` — verifies generated specs preserve tools/MCP servers and remain valid against `agent.schema.json`.

### Types & Interfaces

```typescript
// Existing schema-level contract from scripts/schemas/agent.schema.json
type PlannerAgentSpec = {
  name: string;
  description: string;
  model: "claude-opus-4-7" | "claude-opus-4-7-20260101";
  system: string;
  tools: Array<{ type: "agent_toolset_20260401" } | { type: "mcp_toolset"; mcp_server_name: string }>;
  mcp_servers?: Array<{ type: "url"; name: string; url: string }>;
  metadata?: { role?: "orchestrator"; scope?: string };
};

type PlannerPlan = {
  classification: string;
  next_action: "promote_and_experiment" | "hold_baseline" | "revert_and_retry" | "explore_broadly";
  direction_hint: string;
  new_critic_request?: {
    scope: string;
    rationale: string;
    evidence_refs: string[];
  };
  rationale: string;
};
```

### Architecture Notes

- The planner is an Opus 4.7 Managed Agent per Q1 ADR-0001 and `context/FEATURES.md` feature #50.
- The agent must not read repository files itself for memory; #50's spec should state that the orchestrator supplies marshaled `memory.jsonl` tail, last two weeks of verdicts, and monitor anomaly report in `user.message`.
- The planner output contract is `plan.md` whose body contains one JSON object; tests can assert the system prompt includes the required schema fields and enum values.
- The spec should likely reuse the GitHub MCP toolset pattern from `webster-redesigner`/`webster-monitor` only if the planner is instructed to commit `plan.md` itself. Feature #52 says the orchestrator extracts output and writes `history/<week>/plan.md`, so the planner spec can be agent-toolset-only unless existing Managed Agent registration expectations require MCP parity.
- Metadata should use `role: "orchestrator"` and `scope: "planning"` because `scripts/schemas/agent.schema.json` already allows `orchestrator` but not `planner`.

---

## Implementation Summary

### Story Overview

| ID | Title | Priority | Dependencies |
|----|-------|----------|--------------|
| US-001 | Add schema-valid planner Managed Agent spec | 1 | — |
| US-002 | Add planner output contract tests | 2 | US-001 |
| US-003 | Add registration-flow guard tests and validate | 3 | US-001, US-002 |

### Dependency Graph

```text
US-001 (agent spec)
    ↓
US-002 (plan.md output contract tests)
    ↓
US-003 (registration-flow guard tests + validation)
```

---

## Validation Requirements

Every story must pass:

- [ ] Type-check: `bun run type-check`
- [ ] Lint: `bun run lint --max-warnings 0`
- [ ] Tests: `bun run test`
- [ ] Format: `bun run format:check`
- [ ] Agent schema validation: `bun run validate:agents`
- [ ] Full validation before completion: `bun run validate`

---

*Generated: 2026-04-24T00:00:00.000Z*
