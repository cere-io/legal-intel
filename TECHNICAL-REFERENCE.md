# Claim Intelligence Engine — Technical Reference

**For Fred. For the board. For investors. For Rocky.**

---

## What It Is (30 seconds)

Same compound intelligence engine as the hiring pipeline. Same agents, same cubbies, same Event/Context/CubbyClient interfaces. Instead of scoring candidates against 9 fixed trait dimensions, it scores evidence against dynamic legal claims that emerge, evolve, and compound with attorney feedback.

When Rocky sends an email about Goopal's CEO, 4 agents fire in sequence: extract signals → propose/enrich claims → score relevance → detect cross-case implications. Section 16 (Vivian Liu Token Theft) updates with specific legal analysis. 4 cases get impact assessments. 5 attorneys get personalized action items. The whole thing runs on cubby-native storage — same architecture that DDC will provide at production scale.

---

## Architecture (1:1 with HiringPipeline)

### The Pipeline

```
Evidence arrives (email, report, filing, blockchain tx)
       |
       v
[1. Evidence Extractor]
       Reads: raw evidence content
       Writes: evidence/{id} cubby (structured signals)
       Output: entities, jurisdictions, urgency, claim relevance scores
       |
       v
[2. Claim Proposer]  ← NEW (no hiring equivalent)
       Reads: evidence/{id} + claims/* + templates/*
       Writes: claims/{id} cubby (enrichments + new proposals)
       Output: which claims are strengthened, which elements proven,
               what new legal theories emerge, specific legal analysis
               with quotes from the evidence
       |
       v
[3. Claim Scorer]
       Reads: evidence/{id} + claims/* + meta/claim_weights/default
       Writes: scores/{id} cubby
       Output: per-claim relevance scores weighted by dynamic claim weights
       |
       v
[4. Cross-Case Analyzer]
       Reads: evidence/{id} + cases/*
       Writes: cases/{id}/impacts cubby
       Output: which proceedings affected, attorney action items with SLAs
       |
       v
[Attorney feedback] → [Distillation Agent] → meta/claim_weights/default
       Every attorney assessment shifts claim weights.
       Next evidence scored with updated weights.
       The system learns how each attorney values evidence.
```

### Hiring Pipeline Mapping

| Hiring | Legal | Same Interface? |
|---|---|---|
| Trait Extractor | Evidence Extractor | Yes — same `handle(event, context)` |
| Scorer | Claim Scorer | Yes — reads weights from meta cubby |
| Interview Analyzer | Cross-Case Analyzer | Yes — secondary analysis layer |
| Distillation Agent | Distillation Agent | Yes — feedback → weight updates |
| Concierge | Concierge | Yes — orchestrates pipeline |
| **(none)** | **Claim Proposer** | New — claims are dynamic, not fixed |

### Why the Claim Proposer Is New

In hiring, the 9 trait dimensions are fixed. "skills," "years_of_experience," "hard_things_done" — they never change. Only the WEIGHTS shift.

In legal, the claims themselves emerge from evidence. When Rocky's email arrives, the system might propose a new claim ("fraud on the court") that didn't exist before. Or it might enrich an existing claim with new evidence that changes an element's status from "partial" to "proven."

The Claim Proposer decides: enrich existing, or propose new? It reads the full evidence content (not just extracted signals) and the detailed element structure of each relevant claim. The prompt demands specific legal analysis — entity names, dates, what changed and why it matters.

---

## Data Model: Cubbies as Graph Nodes

### The Graph Structure

Each cubby entry is a node. JSON references between entries are edges. The application traverses these references to build the knowledge graph.

```
claims/vivian-theft
  ├── elements[].supporting_evidence → ["big-report", "kenzi-files-pdf"]  ← EDGES to evidence cubbies
  ├── elements[].contradicting_evidence → []
  ├── connected_claims → { "syndicate": 0.92, "embezzlement": 0.85 }     ← EDGES to other claim cubbies
  ├── evidence_chain → ["big-report", "kenzi-files-pdf"]                  ← ORDERED traversal path
  └── key_entities → ["Kenzi Wang", "Vivian Liu", "0xb08f..."]           ← Entity references

evidence/big-report
  ├── claims_implicated → [{ claim_id: "vivian-theft", relevance: 0.97 }] ← BACK-EDGE to claim
  ├── connected_evidence → [{ id: "dhty-report", relationship: "corroborates" }] ← EDGES between evidence
  └── connected_sections → ["section-16", "section-17"]                    ← EDGES to document sections

cases/goopal-v-jin
  ├── connected_claims → ["vivian-theft", "syndicate", "aliases"]          ← EDGES to claims
  └── participants → [{ name: "Rocky Lee", role: "defense_coordinator" }]  ← Entity references
```

### Traversal Example

"Show me all evidence that supports Element 1 (Fiduciary) of the Vivian Liu claim":

```javascript
// Application code traversal — no Cypher needed
const claim = cubby.get('claims/vivian-theft');
const fiduciary = claim.elements.find(e => e.id === 'fiduciary');
const evidence = fiduciary.supporting_evidence.map(id => cubby.get('evidence/' + id));
// Returns: [{ title: "Kenzi Files PDF", ... }]
```

"Show me all claims affected by Rocky's email":

```javascript
const evidence = cubby.get('evidence/rocky-goopal-12345');
const affected = evidence.claims_implicated
  .filter(c => c.relevance >= 0.5)
  .map(c => cubby.get('claims/' + c.claim_id));
// Returns: [vivian-theft (0.95), fabrication (0.88), syndicate (0.85), ...]
```

### No Cypher. No RedisGraph. Application-Layer Traversal.

The Cere/CEF roadmap has moved away from RedisGraph/Cypher. Cubbies are JSON key-value stores with hierarchical paths. Graph traversal happens in application code by following JSON references. This is the correct pattern per current architecture direction.

---

## Cubby Schema (69+ entries)

### Path Hierarchy

```
claims/{claim_id}          — 18 dynamic claim nodes with element structures
evidence/{evidence_id}     — 8+ evidence items with structured signals
scores/{evidence_id}       — Per-evidence claim relevance scores
cases/{case_id}            — 7 active proceedings with participants
meta/claim_weights/default — Dynamic weights (sum to 1.0, shift with feedback)
templates/{template_id}    — 6 claim type templates (RICO, embezzlement, etc.)
document/sections/{id}     — 14 document sections (the Kenzi Files narrative)
document/meta              — Document metadata (title, section order)
graphs/{evidence_id}       — 6 evidence knowledge sub-graphs
```

### Claim Node (core entity)

```json
{
  "id": "vivian-theft",
  "title": "Vivian Liu Token Theft (33.3M CERE)",
  "template_id": "embezzlement",
  "status": "active",
  "proposed_by": "attorney",
  "confirmed_by": "Rocky Lee",
  "elements": [
    {
      "id": "fiduciary",
      "name": "Exclusive Communicator",
      "status": "partial",
      "supporting_evidence": ["kenzi-files-pdf"],
      "contradicting_evidence": [],
      "gap_description": "Need exact Slack screenshot of Kenzi taking over Vivian communication (Dec 23, 2021)",
      "strength": 0.75
    },
    {
      "id": "property",
      "name": "Tokens Identified",
      "status": "proven",
      "supporting_evidence": ["big-report", "kenzi-files-pdf"],
      "strength": 0.95
    },
    {
      "id": "conversion",
      "name": "Wallet Substitution + Bridge + Dump",
      "status": "proven",
      "supporting_evidence": ["big-report"],
      "strength": 0.95
    },
    {
      "id": "intent",
      "name": "Premeditated",
      "status": "proven",
      "supporting_evidence": ["big-report"],
      "strength": 0.90
    }
  ],
  "connected_claims": {
    "syndicate": 0.92,
    "embezzlement": 0.85,
    "ponzi-laundering": 0.75
  },
  "evidence_chain": ["big-report", "kenzi-files-pdf"],
  "strength": 0.89,
  "key_entities": ["Kenzi Wang", "Vivian Liu", "Goopal Digital Limited", "0xb08f..."],
  "jurisdictions": ["NDCA", "Dubai", "BVI"],
  "current_understanding": "Kenzi stole 33.3 million CERE tokens from investor Vivian Liu...",
  "evolution_log": [
    { "date": "2026-02-13", "delta": "BIG report connects bridge wallet to CERE, RAZE, SKYRIM" },
    { "date": "2026-03-23", "delta": "Master evidence document compiled" }
  ]
}
```

### What Happens When Rocky's Email Arrives

1. **Evidence Extractor** writes `evidence/rocky-goopal-{timestamp}`:
   - entities: [Rocky Lee, Goopal, Vivian Liu, Kenzi, Brad Bao, Fred Jin, ...]
   - urgency: 9/10
   - claims_implicated: [{vivian-theft: 0.95}, {fabrication: 0.88}, {syndicate: 0.85}, ...]

2. **Claim Proposer** reads the FULL email content + claim details, writes enrichments:
   - `claims/vivian-theft` updated:
     - Element "fiduciary" reasoning: "Rocky Lee's email explicitly states 'Kenzi was the exclusive communicator with Vivian since December 23, 2021' and confirms 'We have a screenshot of Kenzi telling Fred he will take over communication with Vivian'"
     - Strength: 0.89 → 0.91
     - Evolution log: new entry with specific findings

3. **Claim Scorer** writes `scores/rocky-goopal-{timestamp}`:
   - vivian-theft: 0.95 (weighted by current claim weights)
   - fabrication: 0.88
   - syndicate: 0.85
   - aliases: 0.80
   - embezzlement: 0.78
   - confrontation: 0.72

4. **Cross-Case Analyzer** writes `cases/rocky-goopal-{timestamp}/impacts`:
   - Cere v. Wang: DIRECT
   - Goopal v. Jin: DIRECT
   - Qu v. Jin: SUPPORTING
   - Dubai Criminal I: SUPPORTING

---

## Versioning & Audit Trail

### Postgres Intermediate (current)

```sql
-- Every cubby write creates a version record
cubbies (path, data JSONB, version INTEGER, updated_at)
cubby_versions (path, data JSONB, version INTEGER, changed_by, changed_at)
```

### DDC Target (future)

- Append-only immutable storage — every write creates a new content-addressed object
- DAC (Data Activity Capture) signs every operation cryptographically
- Archive API snapshots entire subtrees at a point in time (CID-based)
- "What did we know before Rocky's email?" → restore snapshot from before that timestamp

### Zero-Transformation Migration

The Postgres schema (`cubbies` table with path + JSONB) maps 1:1 to DDC cubby paths. Migration = read each row, write to real cubby at same path. No schema transformation needed.

---

## Graph Visualization

### Main Case Graph (all 18 claims)

- 18 nodes representing claims, sized by strength score
- 23 edges representing cross-claim connections with strength values
- Color: green (strong, >90%), orange (moderate, 70-90%), gray (weak, <70%)
- Click any node → opens per-claim evidence graph

### Per-Claim Evidence Graph (e.g., Vivian Liu)

- Center: the claim node (large)
- Child circles: legal elements, colored by status (green=proven, orange=partial, red=unproven)
- Squares: evidence items connected to elements via SUPPORTS edges
- Dashed red lines: CONTRADICTS edges
- Smaller circles: connected claims with strength scores
- Diamonds: key entities (people, wallets, companies)
- Below graph: element detail table + current understanding text

### Traversal-First Design

The graph renders what application code discovers by following cubby references:
1. Start at claim node
2. Follow `elements[]` → render element nodes
3. Follow `elements[].supporting_evidence[]` → fetch evidence cubbies → render evidence nodes
4. Follow `connected_claims{}` → fetch connected claim cubbies → render connected claim nodes
5. Follow `key_entities[]` → render entity nodes

Each node is clickable → clicking navigates to that cubby's own graph view. This is what "traversable" means.

---

## Compound Intelligence Loop

### How Weights Shift

```
Initial: all 18 claims at ~0.056 each (uniform distribution, sum = 1.0)

Rocky rates the Goopal email 9/10 for impact:
  → Distillation Agent reads which claims the evidence scored highest on
  → vivian-theft weight: 0.056 → 0.076 (+0.02 boost)
  → syndicate weight: 0.056 → 0.071 (+0.015 boost)
  → All 18 weights renormalize to sum = 1.0

Next evidence arrives:
  → Claim Scorer uses UPDATED weights
  → Evidence touching vivian-theft now scores higher
  → The system learned that Rocky values Vivian-related evidence more
```

### Template Refinement (across cases)

After handling 20 crypto fraud cases:
- The embezzlement template knows that "wallet substitution + 19-month dormancy + bridge + dump in 24h" is the standard evidence pattern
- The RICO template knows that "3+ victims with identical MO" typically satisfies the "pattern" element
- New cases start with these refined templates instead of generic ones

---

## What Each Person Sees

### Rocky Lee (Lead Counsel)

**An email:**
> Rocky, your Goopal CEO finding impacts 4 cases. Here's what changed:
>
> **Goopal v. Jin** — DIRECT: Motion to dismiss now viable. Goopal CEO declaration needed before opposing counsel files amended complaint.
>
> **Cere v. Wang** — DIRECT: Corroborates pattern of corporate identity fabrication.
>
> **Action:** Secure Goopal CEO declaration → 24h SLA

Rocky never touches the dashboard. He gets an email with his specific action items.

### Susanna Chenette (NDCA Counsel)

**A different email, focused on her motions:**
> Susanna, new evidence affects your NDCA cases.
>
> **Goopal v. Jin** — Prepare motion to dismiss unauthorized plaintiff. Initiate CCP §128.7 safe harbor.
>
> **Qu v. Jin** — New evidence strengthens motion to dismiss. Review for incorporation.

### Fred Jin (CEO)

**The full dashboard.** Claims graph, evidence traversal, cubby inspector. He sees the architecture.

### Martijn (Case Manager)

**The document view.** The Kenzi Files as a living document with sections that glow when affected, evidence graphs that update, and action items that route.

---

## Tech Stack

| Component | Technology | Mirrors |
|---|---|---|
| Runtime interfaces | Event, Context, CubbyClient (TypeScript) | HiringPipeline identical |
| Agent execution | 6 agents in sequence via Concierge | HiringPipeline 5 agents |
| LLM | Gemini 2.5 Flash via OpenAI-compatible API | HiringPipeline scorer.ts |
| Storage (intermediate) | PostgreSQL (`cubbies` table, JSONB) | HiringPipeline Postgres |
| Storage (target) | DDC Cubbies on Cere Network | Same migration path |
| Cubby runtime | PgCubby class with namespace isolation | HiringPipeline MockCubby |
| Real-time updates | Server-Sent Events (SSE) | HR-2026-E2E pattern |
| Dashboard | Server-rendered HTML (Express) | HR-2026-E2E dashboard-v5 |
| Graph visualization | D3.js v7 (force-directed + hierarchical) | New for legal vertical |
| Landing page | Warm cream/serif design (Playfair Display) | New |
| Governance | Constitution v1.0.0, spec.md, ADR | HiringPipeline identical |
| Validation | Zod schemas on cubby writes | HiringPipeline pattern |
| Chat interface | OpenClaw skill YAML | HiringPipeline openclaw/ |

---

## Seed Data (the Kenzi Case)

| Data | Count | Source |
|---|---|---|
| Claims with element structures | 18 | Kenzi Files master document |
| Evidence items with knowledge graphs | 8 | DHTY, Practus, BIG, QRI x3, Ascent, Kenzi Files PDF |
| Active cases | 7 | NDCA (4), Dubai (2), Delaware (1) |
| Claim templates | 6 | RICO, securities fraud, embezzlement, extortion, evidence destruction, money laundering |
| Document sections | 14 | Kenzi Files sections 1-18 (14 seeded with full content) |
| Evidence knowledge sub-graphs | 6 | Per forensic report |
| Participants | 13 | 5 attorneys, 3 plaintiffs, 1 defendant, 4 witnesses |
| Total cubby entries | 69+ | Growing with each evidence intake |

---

## The Three Wedges

### Wedge 1: Multi-Victim Fraud Playbook Intelligence (launch)
- Serial fraudsters reuse the same scheme. Proving the "playbook" is done with spreadsheets today.
- Dogfood: Kenzi case (8+ victims, 7 cases, 4 jurisdictions)
- Market: $5.6B in crypto fraud reported to FBI in 2023

### Wedge 2: Sovereign Evidence OS for SMB Firms
- 75% of firms have <10 attorneys. Affordable eDiscovery exists but none has AI claim intelligence or sovereign deployment.
- Market: $14B+ eDiscovery market

### Wedge 3: Regulatory Whistleblower Submission Platform
- SEC/DOJ submissions done with Word memos. Evidence-to-regulator pipeline entirely manual.
- Market: SEC whistleblower $2B+ in awards, total FCA recoveries $75B+

---

## The Narrative (for Fred's meeting)

Every legal AI company optimizes the output layer — document review, brief drafting, contract analysis. The value lives in the input layer: the process by which a lawyer turns raw evidence into structured claims, the sequence of judgment calls, the element-by-element analysis of what's proven and what's missing.

That process is invisible in the finished work product. Our system encodes it. Each claim is a living knowledge node that evolves as evidence accumulates. Each attorney interaction compounds the intelligence. The same engine that runs our hiring pipeline — same agents, same cubbies, same compound learning — now processes legal evidence.

We built it because we needed it. We're litigating a $58M fraud case against our own co-founder. 18 crimes. 7 cases. 4 jurisdictions. 600+ pages of evidence. When Rocky's email arrived about Goopal's CEO, we needed to know in seconds what it meant for every claim, every case, every attorney.

No tool could do this. So we built one. And it runs on DDC.

---

## Litigation Command Center Features (as of Round 140)

The document view at `/document` is a complete litigation command center built across 140 rounds of continuous improvement. 710KB rendered HTML, 21 verified JavaScript functions, zero errors.

### Executive Summary (14 panels)
- **Prosecution Strategy** — AI-generated narrative recommending RICO as primary theory
- **Case Strength Score** — 90% with methodology tooltip (avg across 18 claims, 64/74 elements proven)
- **Litigation KPIs** — 5 motions ready, 14 meet burden, 7 SOL expired, $267M max recovery, 4 jurisdictions
- **Next Best Action** — priority-ranked recommendation engine (SOL RISK > MOTION > EVIDENCE > BRD GAP)
- **Damages Calculation** — $267.86M table with RICO treble multipliers, settlement range ($15-45M)
- **RICO Tracker** — 7/7 predicate acts with section links and evidence sources
- **SOL Advisory** — 7 expired standalone / 6 preserved via RICO, with statute citations
- **Motion Readiness Tracker** — 7 motions (5 ready, 2 preparing), dependencies, urgency
- **Risk Scenario Analysis** — 6 "what if" scenarios with impact, consequence, mitigation
- **Jurisdiction Strategy Matrix** — 4-column posture across NDCA/Dubai/Delaware/BVI
- **Smoking Gun** — bridge wallet chain visualization (0xb08f)
- **Modus Operandi** — 4-step pattern (Infiltrate → Embed → Extract → Retaliate)
- **Victims & Witnesses** — 6 cards with cooperation status
- **Timelines** — criminal activity (2016-2024) + case proceedings (2023-2026)

### Per-Section Features (18 sections × 12 features)
- Severity badge (FELONY/FRAUD/RICO/etc.)
- Strength % with evidence confidence tag (HIGH/MED/LOW)
- Prosecution readiness bar (Court-Ready / Near-Ready / Needs Work)
- Burden of proof indicator (BRD 95% / PoE 51% threshold with visual bar)
- Statute of limitations countdown with statute citation
- Evidence admissibility tags (SELF-AUTH, SWORN, EXPERT, FRE 902(13), AUTH REQ, FOUNDATION)
- Evidence provenance chain (Sources → Evidence → Elements → Claim → Cases)
- Evidence gap analysis with actionable remedies
- Evidence cross-citations ("Also in §3, §12, §17")
- Load-bearing dependency badge (sections with 3+ dependents)
- Key quote in Playfair Display italic
- Cross-reference callouts (clickable, scroll to target)

### Navigation & Interaction (12 tools)
- Table of Contents (expanded, 27 links with proper anchor IDs)
- Case Strength Heatmap (18 blocks + burden-of-proof row, clickable)
- Quick navigation pills (18, with strength/readiness tooltips)
- Jurisdiction filter (NDCA/Dubai/Delaware/BVI)
- Readiness filter (Court-Ready/Near-Ready/Needs Work)
- Section search (real-time filtering)
- Expand All / Collapse All
- Keyboard shortcuts (J/K/E/G/T/?/Escape)
- Dark mode toggle
- Print stylesheet (court-filing quality, page breaks, color preservation)
- Export Brief (one-click case summary to clipboard)
- Cite button (per-section legal citation generator)

### Sidebar (8 panels)
- Cases by jurisdiction with deadlines and completeness bars
- Witness Credibility Matrix (6 witnesses, scores, impeachment risks)
- Syndicate Network map (SVG, 7 nodes around KW center)
- Opposing Counsel
- Attorney Action Items (4 attorneys, per-person tasks with urgency)
- Case Activity Feed (chronological with milestones)
- Quick Lookup (22 clickable entity tags)

### Demo Features
- Intro overlay (5 KPIs, feature summary, "Explore the Case" CTA)
- Email preview with "Why This Matters" impact analysis
- 4-agent pipeline visualization (Extractor → Proposer → Scorer → Analyzer pills)
- What's New lawyer summary (metric cards, key insight, recommended next steps)
- Before/after strength deltas (AI-computed from relevance scores)
- Dynamic "Updated: Just now · AI-enriched" timestamps
- Attorney email previews (Rocky vs Susanna, per-stakeholder)
- 10-step demo guide for Fred
- Section breadcrumb in sticky demo bar
- "Go to Section" button in graph modal

### Graphs (D3 force-directed)
- Main case graph (18 claim nodes, 23 connection edges, legend)
- Per-claim evidence graph modal (circles=claims/elements, rectangles=evidence, diamonds=entities)
- In-section evidence sub-graphs (6 forensic report graphs)

### Key Technical Notes
- Template literal escaping: use `\u2019` for apostrophes, `String.fromCharCode(10)` for newlines
- SSE for real-time updates (EventSource auto-reconnect)
- Cubby-native Postgres storage (single `cubbies` table, JSON references as edges)
- 4 Gemini agents called sequentially (~2 min pipeline)
