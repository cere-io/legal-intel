# ADR: Evidence Scoring & Compound Intelligence Loop

**Date**: March 25, 2026
**Status**: Implementing (Demo Prototype)
**Authors**: Martijn, Fred Jin

## The Goal

Move from manual evidence cross-referencing (paralegal hours, spreadsheets) to an **AI-driven evidence intelligence engine** using the Cere DDC Network. Same architecture as the HiringPipeline compound intelligence system, applied to legal evidence.

We need to ingest evidence from attorney emails, forensic reports, and court filings, extract structured signals (crime relevance, jurisdictional impact, urgency), and store them in Cere Cubbies. The system must feature a **closed feedback loop** (Compound Intelligence): as attorneys assess evidence utility (useful/not useful, admissible/excluded), the system autonomously recalibrates how heavily it weighs certain crime categories and evidence types, making the scoring process continuously smarter.

---

## 1. Architecture Evolution

### Phase 0: The Constitution
We established `.specify/memory/constitution.md` to dictate the rules of engagement — mirroring the HiringPipeline constitution v1.1.0.
- **Spec-Driven Development:** No implementation without prior review.
- **Cubby Abstraction:** All state must persist in Redis-backed hierarchical Cubbies using the SDK.
- **Agent Isolation:** Single-responsibility agents communicating via RAFT events, never direct function calls.

### Phase 1: Evidence Intake & Signal Extraction
Move from raw evidence storage to an event-driven `Evidence Extractor` agent that normalizes unstructured evidence (emails, reports, filings) into a deterministic schema within the `legal-evidence` Cubby.

### Phase 2: Compound Intelligence & Demo UI
Implement the `Crime Scorer`, `Cross-Case Analyzer`, and `Distillation` agents. Due to DDC node instability, build with Postgres + mock cubby runtime as intermediate storage (approved approach per Sergej). Dashboard demonstrates real-time crime scoring and cross-case detection triggered by simulated evidence intake.

---

## 2. The 5-Agent Architecture

Mirrors the HiringPipeline's 4-agent design with one addition (Cross-Case Analyzer) required by multi-jurisdictional evidence management.

| # | Agent | Trigger | Cubby | Hiring Equivalent |
|---|-------|---------|-------|-------------------|
| 0 | Concierge | NEW_EVIDENCE event | (orchestrator) | Concierge |
| 1 | Evidence Extractor | Raw evidence text | `legal-evidence` | Trait Extractor |
| 2 | Crime Scorer | Evidence signals stored | `legal-scores` | Scorer |
| 3 | Cross-Case Analyzer | Scores stored | `legal-cases` | Interview Analyzer |
| 4 | Distillation Agent | ATTORNEY_FEEDBACK event | `legal-meta` + `legal-outcomes` | Distillation Agent |

---

## 3. Domain Mapping: Hiring → Legal

| Hiring Concept | Legal Equivalent | Rationale |
|----------------|-----------------|-----------|
| Candidate | Evidence Item | The entity being evaluated |
| Resume text | Evidence content (email, report, filing) | Raw input to extract signals from |
| 9 trait dimensions | 18 crime categories | The structured signal space |
| TraitWeights (sum to 1.0) | CrimeWeights (sum to 1.0) | Dynamic weights that shift with feedback |
| Composite score (0-100) | Relevance score per crime (0.00-1.00) | The AI assessment |
| Interview Analyzer (4 dims) | Cross-Case Analyzer (jurisdiction impacts) | Secondary analysis layer |
| Human feedback score (1-10) | Attorney assessment (useful/admissible/excluded) | The learning signal |
| hiring-meta/trait_weights | legal-meta/crime_weights | The compound intelligence |
| Notion webhook | Attorney feedback via dashboard/Slack | Outcome trigger |

---

## 4. Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| **Same Event/Context/CubbyClient interfaces** | Proves the engine is identical; only domain objects change |
| **Postgres as intermediate storage** | DDC node unstable; Postgres schema cubby-compatible; same approach approved for HiringPipeline |
| **18 crime categories as dimensions** | Directly from the Kenzi Files master document; each is independently scoreable |
| **CrimeWeights normalized to 1.0** | Same constraint as TraitWeights; prevents degenerate solutions |
| **Attorney assessment as learning signal** | Equivalent to human feedback score in hiring; Rocky/Susanna's assessments train the model |
| **Cross-Case Analyzer as additional agent** | Required because multi-jurisdictional cases create cross-references not present in single-case hiring |

**Version**: 1.0.0 | **Last Updated**: 2026-03-25
