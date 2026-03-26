# Legal Agents on TAZZ

**Same compound intelligence engine as Hiring Pipeline. Instead of scoring candidates against trait dimensions, we score evidence against dynamic legal claims.**

---

## Overview

The Claim Intelligence Engine runs 4 sequential agents on Cere's sovereign infrastructure (TAZZ/DDC). Each agent reads from and writes to cubbies — the same Event/Context/CubbyClient interfaces as the Hiring Pipeline.

**Use case:** Multi-jurisdictional fraud litigation (Kenzi Wang case — $267M, 18 crimes, 7 cases, 4 jurisdictions)

**Demo:** `localhost:3001/document` (full case) | `localhost:3001/clean` (empty → claims emerge)

---

## Agent Pipeline

```
Evidence arrives (email, report, filing, blockchain tx)
       │
       ▼
[1. Evidence Extractor]
       │
       ▼
[2. Claim Proposer]  ← NEW (no hiring equivalent)
       │
       ▼
[3. Claim Scorer]
       │
       ▼
[4. Cross-Case Analyzer]
```

---

## Agent 1: Evidence Extractor

**Hiring equivalent:** Resume Parser
**Input:** Raw evidence content (email text, PDF content, bank statement, blockchain tx)
**Output:** `evidence/{id}` cubby

| Field | Description |
|-------|-------------|
| source_credibility | 0-10 score |
| jurisdictions | ["NDCA", "Dubai", "Delaware", "BVI"] |
| entities | Person/company names mentioned |
| urgency | 0-10 score |
| claims_implicated | Array of {claim_id, relevance, reasoning} |

**Cubby reads:** `claims/*` (to know what existing claims to score against)
**Cubby writes:** `evidence/{id}`
**LLM:** Gemini 2.5 Flash

---

## Agent 2: Claim Proposer

**Hiring equivalent:** No direct equivalent — this is NEW
**Purpose:** The core innovation. Proposes new legal claims OR enriches existing ones based on evidence.

**Input:** Evidence signals + all existing claims + claim templates
**Output:** Enrichments to existing claims + new claim proposals

| Action | Description |
|--------|-------------|
| Enrich | Updates element status (unproven → partial → proven), adds understanding, adjusts strength |
| Propose | Creates new claim from template when evidence suggests a new legal theory |
| Connect | Links claims that share evidence or entities |

**Cubby reads:** `evidence/{id}`, `claims/*`, `templates/*`
**Cubby writes:** `claims/{id}` (create or update)
**LLM:** Gemini 2.5 Flash

**Key difference from Hiring:** In hiring, trait dimensions are fixed (9 traits). In legal, claims are DYNAMIC — they emerge from evidence and evolve with each intake. A single email can create new claims, enrich existing ones, and create connections between previously unrelated claims.

---

## Agent 3: Claim Scorer

**Hiring equivalent:** Trait Scorer
**Input:** Evidence ID + all claims
**Output:** Relevance scores per claim

| Field | Description |
|-------|-------------|
| claim_id | Which claim this score applies to |
| overall | 0.0 - 1.0 relevance score |
| reasoning | Why this evidence is relevant to this claim |

**Cubby reads:** `evidence/{id}`, `claims/*`, `meta/claim_weights/default`
**Cubby writes:** `scores/{evidence_id}`
**LLM:** Gemini 2.5 Flash

**Dynamic weights:** Claim weights shift based on attorney feedback (via Distillation agent). Same compound learning as hiring trait weights.

---

## Agent 4: Cross-Case Analyzer

**Hiring equivalent:** No direct equivalent
**Purpose:** Detects which of 7 active proceedings are affected by new evidence. Generates per-attorney action items with SLA deadlines.

**Input:** Evidence + claims + cases
**Output:** Case impacts + attorney actions + alerts

| Output | Description |
|--------|-------------|
| impacts | Array of {case_name, impact_level, reasoning} |
| actions | Array of {assigned_to, title, priority, sla_hours} |
| alerts | Critical notifications (e.g., "Fraud on the court detected") |

**Cubby reads:** `evidence/{id}`, `claims/*`, `cases/*`
**Cubby writes:** `cases/{id}/impacts`
**LLM:** Gemini 2.5 Flash

---

## Agent 5: Distillation (Feedback Loop)

**Hiring equivalent:** Distillation agent (identical architecture)
**Purpose:** Attorney feedback shifts claim weights over time. "This evidence was highly useful for embezzlement" → embezzlement weight increases.

**Input:** Attorney feedback (evidence rating, usefulness, admissibility assessment)
**Output:** Updated claim weights

**Cubby reads:** `meta/claim_weights/default`, feedback payload
**Cubby writes:** `meta/claim_weights/default`
**LLM:** Gemini 2.5 Flash

---

## Cubby Schema (DDC-Ready)

```sql
CREATE TABLE cubbies (
  path VARCHAR(500) PRIMARY KEY,
  data JSONB NOT NULL,
  version INTEGER DEFAULT 1,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Cubby Paths

| Path Pattern | Content | Count |
|-------------|---------|-------|
| `claims/{id}` | Dynamic legal claims with elements | 18 |
| `evidence/{id}` | Extracted evidence signals | 40+ |
| `cases/{id}` | Active proceedings | 7 |
| `templates/{id}` | Claim templates (RICO, embezzlement, etc.) | 6 |
| `document/sections/{id}` | Document section content | 18 |
| `graphs/{id}` | Evidence sub-graphs | 6 |
| `meta/claim_weights/default` | Dynamic scoring weights | 1 |
| `scores/{evidence_id}` | Per-evidence scoring records | N |

**Total:** ~108 cubby entries for the Kenzi case

### Claim Node Structure

```json
{
  "id": "embezzlement",
  "title": "Embezzlement of Investor Funds ($4.87M)",
  "status": "active",
  "strength": 1.0,
  "elements": [
    {
      "id": "sole-intermediary",
      "name": "Sole Intermediary",
      "status": "proven",
      "supporting_evidence": ["dhty-report", "ascent-audit"],
      "contradicting_evidence": []
    }
  ],
  "evidence_chain": ["dhty-report", "ascent-audit", "docusign-saft"],
  "key_entities": ["Kenzi Wang", "Fred Jin"],
  "connected_claims": {"vivian-theft": 0.85, "syndicate": 0.90},
  "current_understanding": "...",
  "evolution_log": [...]
}
```

**Key insight:** JSON references between cubby entries serve as graph edges. `connected_claims` links claims. `supporting_evidence` links evidence to elements. Application-layer traversal (no Cypher/RedisGraph — per DDC roadmap).

---

## 1:1 Mapping with Hiring Pipeline

| Hiring Pipeline | Legal Pipeline | Same Interface? |
|----------------|---------------|-----------------|
| Resume Parser | Evidence Extractor | ✅ Event/Context |
| (none) | Claim Proposer | ✅ Event/Context |
| Trait Scorer | Claim Scorer | ✅ Event/Context |
| (none) | Cross-Case Analyzer | ✅ Event/Context |
| Distillation | Distillation | ✅ Identical |
| 9 fixed traits | Dynamic claims (18+) | Same weights mechanism |
| CubbyClient | CubbyClient | ✅ Identical |
| Candidate cubbies | Claim cubbies | Same storage |

---

## Demo Features (Document View)

- **Prosecution Strategy** — AI-generated narrative
- **$267M Damages Calculation** — RICO treble multipliers
- **Motion Readiness Tracker** — 5 motions ready to file
- **Risk Scenario Analysis** — 6 "what if" scenarios
- **Per-section:** burden of proof, SOL countdown, evidence admissibility (FRE), gap analysis
- **D3 Knowledge Graphs** — 18-node case graph + per-claim modals
- **Live Evidence Intake** — 4-agent pipeline with real-time SSE
- **40-Exhibit Index** — formal court filing ready

---

## Technical Stack

| Component | Technology |
|-----------|-----------|
| Runtime | Node.js + Express |
| LLM | Gemini 2.5 Flash (OpenAI-compatible API) |
| Storage | PostgreSQL (cubby-native, zero-transformation DDC migration) |
| Frontend | Server-rendered HTML + D3.js |
| Real-time | SSE (Server-Sent Events) |
| Graph | Application-layer traversal via JSON references |

---

## What This Proves for DDC

1. **Same architecture scales to legal** — Event/Context/CubbyClient handles evidence as well as candidates
2. **Dynamic nodes > fixed dimensions** — Legal claims emerge and evolve; hiring traits are static. The cubby model handles both.
3. **Cross-entity intelligence** — One email affects 18 claims across 7 cases. No other legal AI does this.
4. **Sovereign infrastructure matters** — Attorney-client privilege requires per-case encryption and jurisdictional data isolation. DDC provides this at the storage layer.
5. **Compound learning works** — Attorney feedback shifts claim weights over time, just like hiring feedback shifts trait weights.
