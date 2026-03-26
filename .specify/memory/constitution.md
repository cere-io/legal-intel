<!--
Sync Impact Report
==================
Version Change: 0.0.0 → 1.0.0
Principles Added:
  - Spec-Driven Development (SDD-First)
  - Testing & Validation Standards
  - Cubby Access & Data Architecture
  - Agent Design & Communication
  - TypeScript Strictness & Conventions
  - Observability & Accountability

Templates Requiring Updates:
  ✅ plan-template.md - Constitution Check section aligns with SDD gates
  ✅ spec-template.md - User stories support testable scenarios
  ✅ tasks-template.md - Task ordering maintained

Follow-up TODOs: None
-->

# Legal Evidence Pipeline Constitution

## Core Principles

### I. Spec-Driven Development (SDD-First)

**NON-NEGOTIABLE**: All implementation MUST be preceded by a reviewed specification. The specification is the source code; the implementation is a compiled byproduct.

1. **Specify**: Write prioritized User Stories (P1/P2/P3) with Given/When/Then acceptance criteria before touching code
2. **Clarify**: Resolve ambiguities through structured questioning before planning
3. **Plan**: Produce a technical plan that passes Constitution Check before generating tasks
4. **Implement**: Execute tasks organized by user story, not by technical layer

**Rationale**: The "70% Trap" — AI gets you 70% of the way instantly, but the final 30% (cross-case detection, attorney routing, evidence integrity) takes exponentially longer without upfront structural planning. Specs force you to think about interfaces, error paths, and edge cases before the first line of code.

**Rules**:
- No implementation without a reviewed spec (spec.md must exist before plan.md)
- Specs MUST contain independently testable user stories
- Plans MUST pass Constitution Check before task generation
- Tasks MUST be organized by user story, enabling independent delivery

### II. Testing & Validation Standards

Tests are organized by scope. Each test type validates a specific layer.

**Unit Tests** (`*.test.ts`):
- Location: Co-located with source or in `tests/unit/`
- Tools: vitest
- Scope: Business logic, crime scoring, evidence extraction, weight calculations
- Required: All scoring algorithms, weight calculations, evidence signal generation

**Integration Tests** (`*.integration.test.ts`):
- Location: `tests/integration/`
- Scope: Cubby read/write flows, cross-case detection, attorney routing
- Required: Dual-write scenarios (Postgres + cubby), agent-to-agent data flow

**E2E Tests**:
- Location: `tests/e2e/`
- Scope: Full pipeline flow from evidence intake to attorney action item
- Mode: Mocked external services by default

**LLM-as-Judge Evaluations** (optional):
- Location: `tests/eval/`
- Scope: Semantic correctness of crime scoring, Distillation Agent fairness
- Tools: DeepEval or custom eval harness with Gemini judge

**Rationale**: Unit tests check syntax; integration tests check plumbing; evals check intent. The Distillation Agent's weight updates cannot be validated by deterministic tests alone — semantic evaluation is required to assess scoring accuracy and bias.

### III. Cubby Access & Data Architecture

All cubby operations MUST flow through the CubbyClient abstraction. No direct HTTP calls to CEF APIs.

**Rules**:
- ALWAYS use `CubbyClient.put(cubbyName, key, value)` — never raw `fetch()` to cubby endpoints
- ALWAYS use `evidence_id` as the cubby key for per-evidence cubbies
- ALWAYS validate payload schema with zod before writing to any cubby
- NEVER store raw evidence content (email bodies, full reports) in cubby payloads — use hashes, structured signals, and anonymized references only
- NEVER read/write `legal-meta` directly from application code — only the Distillation Agent modifies weights

**Cubbies**:

| Cubby | Writer | Key Pattern | Contains Raw Content? |
|-------|--------|-------------|----------------------|
| `legal-evidence` | Evidence Extractor | `{evidence_id}` | No — signals only |
| `legal-scores` | Crime Scorer | `{evidence_id}` | No |
| `legal-cases` | Cross-Case Analyzer | `{evidence_id}` | No — impact signals only |
| `legal-outcomes` | Attorney feedback | `{evidence_id}` | No |
| `legal-meta` | Distillation Agent ONLY | `crime_weights/*`, `routing_patterns` | No |

```typescript
// CORRECT
const evidenceSignal: EvidenceSignal = EvidenceSignalSchema.parse(extractedData);
await cubbyClient.put('legal-evidence', evidenceId, evidenceSignal);

// FORBIDDEN
await fetch(`${CEF_URL}/cubbies/legal-evidence/${evidenceId}`, {
  method: 'PUT',
  body: JSON.stringify(rawEmailContent), // no schema validation, raw HTTP, raw content
});
```

**Rationale**: CubbyClient provides retry logic, schema validation, and audit logging. Direct HTTP calls bypass these safeguards. Raw evidence in cubbies creates privilege waiver risk and violates data minimization principles.

### IV. Agent Design & Communication

Each agent has a single responsibility and writes to exactly one cubby. Agent-to-agent communication flows through RAFT categories, not direct calls.

**Rules**:
- Each agent MUST validate its input schema before processing
- Each agent MUST write to exactly one primary cubby (except Distillation Agent: `legal-meta` + `legal-outcomes`)
- Agent-to-agent triggering MUST use RAFT categories, not direct function calls
- Agents MUST be stateless — all state lives in cubbies

**RAFT Configuration**:

| Category | Label | Trigger | Agent |
|----------|-------|---------|-------|
| A | Ingest | New evidence (email, report, filing) | Evidence Extractor |
| B | Score | Evidence signals stored | Crime Scorer |
| C | Analyze | Scores stored | Cross-Case Analyzer |
| D | Outcome | Attorney feedback submitted | Distillation Agent |

**Rationale**: Single-responsibility agents are independently testable, deployable, and replaceable. RAFT decouples the pipeline — if the Crime Scorer is down, evidence still gets extracted and queued.

### V. TypeScript Strictness & Conventions

**Rules**:
- `strict: true` in tsconfig — no exceptions
- No `any` types — use `unknown` with runtime validation (zod) or concrete types
- All async functions MUST have try/catch or propagate errors explicitly
- All public functions MUST have JSDoc with `@param` and `@returns`

**Naming**:

| Thing | Convention | Example |
|-------|-----------|---------|
| Agents | kebab-case files | `evidence-extractor.ts` |
| Cubby names | kebab-case | `legal-evidence` |
| Types/Interfaces | PascalCase | `EvidenceSignal`, `CrimeScore` |
| Functions | camelCase, verb-first | `extractSignals`, `scoreCrimes` |
| Constants | UPPER_SNAKE_CASE | `MAX_RETRY_ATTEMPTS` |

**Rationale**: TypeScript strict mode catches entire classes of runtime errors at compile time. Consistent naming reduces cognitive load across the team.

### VI. Observability & Accountability

**Rules**:
- Every cubby write MUST produce a structured log entry: `{ event: 'cubby_write', cubby, key, success, duration_ms }`
- Every agent invocation MUST log: `{ event: 'agent_run', agent, evidence_id, input_source, output_cubby, duration_ms }`
- Weight updates in `legal-meta` MUST log the full delta: `{ event: 'weight_update', version, changes, triggered_by }`
- Attorney overrides (via feedback) MUST log: `{ event: 'attorney_feedback', evidence_id, ai_score, attorney_assessment, delta }`

**Rationale**: The Distillation Agent's weight updates are the most consequential operation in the system. Without audit logs, we cannot debug why the system underrated a piece of evidence or trace bias in weight drift.

## Quality Gates

### Before Implementation

1. Spec reviewed and approved
2. Plan passes Constitution Check
3. Tasks organized by user story
4. Edge cases identified in spec

### Before PR Merge

1. All tests pass
2. No linter errors (eslint --fix)
3. Schema validation on all cubby writes
4. No raw evidence content in cubby payloads
5. Type safety confirmed (no `any`)

### Before Production

1. Integration tests pass with mocked external services
2. Observability logs confirmed (cubby writes, agent runs)
3. Rollback plan documented

## Governance

### Amendment Process

1. Propose amendment via PR to this file
2. Discuss rationale and alternatives with team
3. Update constitution and increment version
4. Propagate changes to dependent templates (plan, spec, tasks)
5. Communicate changes to all contributors

### Version Semantics

- **MAJOR**: Backward-incompatible principle removals or redefinitions
- **MINOR**: New principles added or materially expanded guidance
- **PATCH**: Clarifications, wording fixes, non-semantic refinements

### Compliance Review

- All PRs MUST verify compliance with constitution principles
- SDD violation (implementation before spec) results in immediate PR rejection
- Raw evidence content in cubby payloads is a blocking issue regardless of other approvals
- Constitution supersedes all other coding practices

**Version**: 1.0.0 | **Ratified**: 2026-03-25 | **Last Amended**: 2026-03-25
