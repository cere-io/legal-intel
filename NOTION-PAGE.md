# Claim Intelligence Engine

## One-liner
Same compound intelligence engine as the hiring pipeline — but instead of fixed trait dimensions with shifting weights, dynamic claim nodes EMERGE from evidence and evolve with every intake.

---

## The Thesis

Every legal case is a knowledge graph that evolves:
- **Nodes** = claims (emerge from evidence, not predefined)
- **Edges** = cross-claim connections (strengthen as evidence accumulates)
- **Weights** = claim importance (shift with attorney feedback)

The system discovers claims, scores evidence against them, enriches them with every new intake, and learns from attorney feedback — making every evidence assessment smarter than the last.

---

## Architecture: Hiring Pipeline → Legal Pipeline (1:1)

| Hiring Pipeline | Claim Intelligence Engine | Why It's the Same |
|---|---|---|
| 9 trait dimensions | Dynamic claim nodes | The structured signal space |
| TraitWeights (sum to 1.0) | ClaimWeights (sum to 1.0) | Weights that shift with feedback |
| CandidateTraits | EvidenceSignal | Structured extraction from raw input |
| CandidateScore (0-100) | ClaimRelevance (0.00-1.00) | AI assessment per dimension |
| Interview Analyzer | Cross-Case Analyzer | Secondary analysis layer |
| Human feedback (1-10) | Attorney assessment | The learning signal |
| hiring-meta/trait_weights | case-meta/claim_weights | The compound intelligence |
| Notion webhook | Attorney feedback | Outcome trigger |

## 6-Agent Architecture

| # | Agent | Trigger | Cubby | Hiring Equivalent |
|---|---|---|---|---|
| 0 | Concierge | NEW_EVIDENCE event | (orchestrator) | Concierge |
| 1 | Evidence Extractor | Raw evidence | `case-evidence` | Trait Extractor |
| 2 | **Claim Proposer** | Evidence signals | **`case-claims`** | **(new — no equivalent)** |
| 3 | Claim Scorer | Claims + evidence | `case-scores` | Scorer |
| 4 | Cross-Case Analyzer | Scores stored | `case-cases` | Interview Analyzer |
| 5 | Distillation | Attorney feedback | `case-meta` + `case-outcomes` | Distillation |

## The Key Innovation: Dynamic Claim Nodes

**Hiring:** 9 fixed dimensions → weights shift → same dimensions, smarter weights
**Legal:** 0 starting claims → evidence proposes claims → claims evolve → graph grows → weights shift across DYNAMIC nodes

Each claim is a living cubby entry:
```
case-claims/{claim_id}:
  title, status (proposed|active|merged|dropped),
  proposed_by (ai|attorney), confirmed_by,
  current_understanding (evolves with every evidence intake),
  evidence_chain, strength, connected_claims,
  key_entities, jurisdictions, evolution_log
```

## Cubbies

| Cubby | Purpose | Key Pattern |
|---|---|---|
| `case-claims/{claim_id}` | Living knowledge nodes per claim — DYNAMIC, emerge from evidence | `{claim_id}` |
| `case-evidence/{id}` | Structured signals extracted from raw evidence | `{evidence_id}` |
| `case-scores/{id}` | How each evidence item relates to each claim | `{evidence_id}` |
| `case-graph/connections` | Cross-claim connection weights | Global |
| `case-meta/claim_weights` | Claim importance weights (compound intelligence) | Per case type |
| `case-outcomes/{id}` | Attorney feedback on evidence utility | `{evidence_id}` |

## Three Wedges

### Wedge 1: Multi-Victim Fraud Playbook Intelligence
Serial fraudsters reuse the same scheme. Proving this "playbook" is done with paralegal hours today. Our engine detects patterns across victims automatically.
- **Dogfood:** Kenzi Wang case (8+ victims, same playbook, 7 cases, 4 jurisdictions)
- **Market:** $17B stolen in crypto fraud 2025. 150K complaints. Zero multi-victim coordination tools.

### Wedge 2: Sovereign Evidence OS for SMB Firms
75% of law firms have <10 attorneys with zero eDiscovery. Relativity killed on-prem. DDC provides sovereignty no cloud tool can.
- **Market:** $15-17B eDiscovery market. SMB segment almost entirely unserved.

### Wedge 3: Regulatory Whistleblower Submission Platform
SEC/DOJ submissions done with Word memos and ad hoc exhibit binders. Evidence-to-regulator pipeline is entirely manual.
- **Market:** SEC whistleblower $2B+ in awards. Qui tam $70B+ in recoveries.

## Demo

Two-screen demo:
1. **Kenzi Case** — Real data, real email from Rocky Lee, real 18 crimes, real 7 cases
2. **Clean Example** — Generic multi-victim fraud case showing the same engine from zero

### Demo Flow (Kenzi)
1. Dashboard shows 7 cases, 18 crime nodes, 8 existing evidence items
2. Click "Simulate Rocky's Email" → Concierge dispatches to 5 agents
3. Evidence Extractor extracts signals
4. Claim Proposer enriches crime nodes (Vivian reclassified from plaintiff to victim)
5. Claim Scorer scores against all 18 crimes with dynamic weights
6. Cross-Case Analyzer detects 4+ case impacts
7. Action items route to attorneys with SLA countdowns
8. Alerts fire (BOMBSHELL, cross-case collision, deadline warning)

### Demo Flow (Clean Example)
1. Empty dashboard — zero claims, zero evidence
2. First evidence arrives → system proposes 3 initial claims
3. Attorney confirms 2, rejects 1 → weights adjust
4. More evidence → existing claims enrich, 1 new claim emerges
5. Second victim's evidence → playbook pattern detected across victims
6. Full knowledge graph visible with claim nodes, evidence chains, cross-references

## Tech Stack

- Same Event/Context/CubbyClient interfaces as HiringPipeline
- Same constitution (SDD-first, cubby abstraction, agent isolation, zod validation)
- Postgres as intermediate storage (cubby-compatible, approved approach)
- Mock cubby runtime (same as HiringPipeline) — swappable to real DDC
- Gemini 2.5 Flash for all agent LLM calls
- Express + SSE for real-time dashboard updates
- OpenClaw skill YAML for conversational interface

## Status

| Component | Status |
|---|---|
| Constitution v1.0.0 | ✅ Complete |
| spec.md | ✅ Complete |
| ADR | ✅ Complete |
| Types (Event, Context, CubbyClient + legal domain) | ✅ Complete |
| Evidence Extractor agent | ✅ Complete |
| Crime Scorer agent | ✅ Complete |
| Cross-Case Analyzer agent | ✅ Complete |
| Distillation agent | ✅ Complete |
| Concierge orchestrator | ✅ Complete |
| Mock cubby runtime | ✅ Complete |
| Postgres schema + seed (Kenzi data) | ✅ Complete |
| Dashboard with SSE | ✅ Complete |
| OpenClaw skill YAML | ✅ Complete |
| **Claim Proposer agent** | 🔴 Next |
| **Dynamic claim cubby (`case-claims`)** | 🔴 Next |
| **Clean example case** | 🔴 Next |
| **Two-screen demo** | 🔴 Next |
| Zod validation on all cubby writes | 🟡 Partial |
| Feature specs in /specs/ | 🟡 Structure only |
| Tests | 🔴 Not started |

## Links

- Repo: `~/Projects/kenzi-intel/`
- Dashboard: `http://localhost:3001/dashboard`
- HiringPipeline (reference): `~/Projects/HiringPipeline/`
- HR-2026-E2E (production): `~/Projects/cere-io/HR-2026-E2E/`
- Kenzi Files PDF: `~/Downloads/Kenzi Files - Definitive Story (All in one).pdf`
- Master Exhibits: `~/clawd/kenzi-exhibits/MASTER_EXHIBITS.md`
