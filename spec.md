# Spec: Legal Evidence Pipeline — Compound Intelligence

**Status:** Ready for review
**Owner:** Martijn
**Existing system:** [HR-2026-E2E](https://github.com/cere-io/HR-2026-E2E) (production hiring pipeline — same architecture)

---

## Problem

We manage a multi-jurisdictional fraud case across 7 active proceedings, 18 crime categories, 8+ victims, and 5 law firms. Evidence arrives from email, forensic reports, court filings, blockchain analysis, and witness statements. Today, cross-referencing a single email against 18 crimes, 7 cases, and 19 exhibits takes a paralegal 2+ hours of manual work. No tool exists that automatically scores new evidence against known crime patterns, detects cross-case implications, or routes action items to the right attorney.

Evidence item #200 is processed with the same weight model as evidence item #1. No learning. No compounding.

The data exists. The feedback loop does not.

## Objective

Wire the Kenzi Wang evidence base into CEF so that:

1. Each piece of new evidence produces structured signals in cubbies
2. AI scores relevance against 18 crime categories using dynamic weights
3. Cross-case collisions are detected automatically across 7 proceedings
4. Attorney feedback (useful/not useful, admissible/excluded) feeds backward into scoring weights
5. Every evidence assessment makes the next one smarter

## Architecture

```
DATA SOURCES                           CUBBIES
+--------------+                       +------------------+
| Gmail (Rocky)|                       | legal-evidence   |
| Court filings|---+                   | legal-scores     |
| Forensic rpts|   |                   | legal-cases      |
| Blockchain   |   |                   | legal-outcomes   |
+--------------+   |                   | legal-meta (!)   |
                   v                   +------------------+
            +------------+                    ^
            | client SDK |                    |
            | legal-     |                    |
            | stream     |                    |
            +-----+------+                    |
                  |                           |
                  v                           |
            +------------+                    |
            | RAFT       |                    |
            | categorize |                    |
            | by type    |                    |
            +-----+------+                    |
                  |                           |
     +------+----+----+------+               |
     v      v         v      v               |
  +----+ +-----+ +-------+ +-------+        |
  |Evid| |Crime| |Cross- | |Distil.|--------+
  |Ext. | |Scorer| |Case  | |Agent  |
  +----+ +-----+ +-------+ +-------+
   F1      F2       F3     F4 -> legal-meta
```

## Existing Inventory (Kenzi Files)

| Component | Source | Status |
|-----------|--------|--------|
| 18 crime categories | Kenzi Files master document | Seeded in Postgres |
| 19 exhibits with provenance chain | MASTER_EXHIBITS.md | Seeded |
| 7 active cases (NDCA, Dubai, Delaware) | Case tracking | Seeded |
| 8 forensic reports (DHTY, Practus, BIG, QRI x3, Ascent) | Forensic analysts | Seeded |
| 13 participants (attorneys, parties, witnesses) | Legal team roster | Seeded |
| Rocky's Goopal CEO email | Gmail thread | Demo trigger |

## Agents

| Agent | Input | Output | Cubby |
|-------|-------|--------|-------|
| Evidence Extractor | Raw evidence (email, report, filing) | Structured evidence signals | `legal-evidence` |
| Crime Scorer | Evidence signals + weights from `legal-meta` | Per-crime relevance scores | `legal-scores` |
| Cross-Case Analyzer | Evidence signals + active cases | Cross-case impact analysis | `legal-cases` |
| Distillation (KEY) | Attorney feedback event | Updated crime weights | `legal-meta`, `legal-outcomes` |

## Cubbies

| Cubby | Purpose | Key Pattern |
|-------|---------|-------------|
| `legal-evidence` | Per-evidence structured signal extraction | `{evidence_id}` |
| `legal-scores` | AI crime relevance scores | `{evidence_id}` |
| `legal-cases` | Cross-case impact analysis | `{evidence_id}` |
| `legal-outcomes` | Attorney feedback on evidence utility | `{evidence_id}` |
| `legal-meta` | **Compound intelligence** — crime weights that shift with every attorney assessment | `crime_weights/*`, `routing_patterns` |

## Implementation Phases

**Phase 1 (Bridge):** Wire existing evidence data into cubbies — seed from Postgres
**Phase 2 (Scoring):** Evidence → crime scoring → cross-case detection → attorney routing
**Phase 3 (Full Loop):** Attorney feedback → weight update → smarter scoring, weight drift dashboard
