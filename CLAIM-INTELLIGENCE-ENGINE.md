# Claim Intelligence Engine

**Same compound intelligence engine as the hiring pipeline. Instead of fixed trait dimensions with shifting weights, dynamic claim nodes emerge from evidence and evolve with every intake.**

---

## The Problem

Legal cases are knowledge graphs that lawyers build manually. A paralegal cross-referencing a single email against 18 crime categories, 7 active cases, and 19 exhibits takes 2+ hours. Multiply by hundreds of evidence items across years of litigation, and you get the current state: spreadsheets, folder diving, and institutional memory that walks out the door when people leave.

Evidence item #200 is processed with the same understanding as evidence item #1. No learning. No compounding.

The data exists. The feedback loop does not.

---

## The Insight

Every legal case follows the same pattern:
1. Evidence arrives from multiple sources
2. Claims **emerge** from evidence (they're discovered, not predefined)
3. Claims evolve as more evidence accumulates
4. Connections between claims strengthen or weaken
5. Attorney feedback sharpens everything

This is exactly the same pattern as our hiring pipeline — but the dimensions are dynamic instead of fixed.

| Hiring Pipeline | Claim Intelligence Engine |
|---|---|
| 9 fixed trait dimensions | Dynamic claim nodes (emerge from evidence) |
| TraitWeights (sum to 1.0) | ClaimWeights (sum to 1.0) |
| CandidateTraits extracted from resume | EvidenceSignals extracted from email/report/filing |
| Scorer reads traits + weights → composite score | Claim Scorer reads signals + weights → relevance scores |
| Interview Analyzer (4 dimensions) | Cross-Case Analyzer (jurisdictional impacts) |
| Human feedback (1-10) updates weights | Attorney assessment updates weights |
| hiring-meta = compound intelligence | case-meta = compound intelligence |
| Every hire makes the next one smarter | Every evidence item makes every claim smarter |

---

## How It Works

### The Engine

```
Evidence arrives (email, report, filing, blockchain tx)
    |
    v
[Evidence Extractor] → extracts structured signals → case-evidence cubby
    |
    v
[Claim Proposer] → proposes NEW claims or enriches existing ones → case-claims cubby
    |
    v
[Claim Scorer] → scores evidence against all claims using dynamic weights → case-scores cubby
    |
    v
[Cross-Case Analyzer] → detects implications across proceedings → case-cases cubby
    |
    v
[Attorney reviews, confirms/rejects, rates impact]
    |
    v
[Distillation Agent] → updates claim weights + enriches claim knowledge → case-meta cubby
    |
    v
Next evidence item is scored with smarter weights against richer claim nodes
```

### Living Claim Nodes

Each claim is a cubby entry that evolves with every evidence intake:

```
case-claims/embezzlement-investor-funds:
  title: "Embezzlement of Investor Funds ($4.87M)"
  status: active
  proposed_by: ai (confirmed by Rocky Lee)
  current_understanding: "Kenzi diverted $4.15M from 79 investors
    in Private + Influencer rounds. Ascent Fund Services found shadow
    ledger. DHTY confirmed $4,432,400 to personal wallets. Practus
    concluded theft. [UPDATED 2026-03-23: Goopal CEO revelation
    suggests same pattern extended to Vivian Liu's tokens]"
  evidence_chain: [dhty-report, ascent-audit, practus-report, rocky-goopal-email]
  strength: 0.94
  connected_claims:
    vivian-token-theft: 0.92
    syndicate-collaboration: 0.85
    broker-dealer-violation: 0.70
  key_entities: [Kenzi Wang, Vivian Liu, Goopal Digital Limited]
  jurisdictions: [NDCA, Dubai]
  evolution_log:
    - 2024-02-28: "DHTY report confirms $4.4M gap"
    - 2024-11-07: "Practus concludes Kenzi stole stablecoins"
    - 2026-03-23: "Rocky's Goopal email links to Vivian theft pattern"
```

When new evidence arrives, the system doesn't just score it — it **enriches the claim nodes**, strengthens or weakens cross-claim connections, and updates the knowledge graph. The next piece of evidence is then scored against this richer understanding.

---

## The Demo: Rocky's Email

The system is seeded with real case data from the Kenzi Wang multi-jurisdictional fraud case:
- 18 crime categories (from the Kenzi Files master document)
- 7 active cases across NDCA, Dubai, Delaware
- 8 forensic reports (DHTY, Practus, BIG, QRI x3, Ascent)
- 13 participants (5 attorneys, 3 plaintiffs, 1 defendant, 4 witnesses)

### What happens when Rocky's actual email arrives:

**The email:** Rocky Lee (Milliard Law) reports that Goopal's CEO confirmed he never authorized the RICO lawsuit (3:26-cv-00857). Vivian Liu likely doesn't know Kenzi stole her 33.3M CERE tokens. BVI counsel confirmed only one Goopal Digital Limited entity exists.

**The pipeline (5 agents, ~15 seconds):**

1. **Evidence Extractor** extracts signals: source credibility 9/10, urgency 9/10, jurisdictions [NDCA, Dubai, BVI], entities [Goopal, Vivian Liu, Kenzi Wang, Brad Bao]

2. **Claim Proposer** enriches existing claim nodes:
   - `vivian-token-theft`: strength 0.87 → 0.94 (Vivian reclassified from plaintiff to victim)
   - `syndicate-collaboration`: strength 0.82 → 0.90 (corporate identity fraud added)
   - New connection: `vivian-token-theft ↔ fraud-on-court` (0.88)

3. **Claim Scorer** scores against all 18 claims with dynamic weights:
   - Vivian Liu Token Theft: 0.95
   - Digital Crime Syndicate: 0.92
   - False Identities/Aliases: 0.88 (corporate-level identity fabrication)
   - Embezzlement: 0.85 (same wallet pattern)

4. **Cross-Case Analyzer** detects impacts on 4+ proceedings:
   - Goopal v. Jin (3:26-cv-00857): **DIRECT** — the complaint itself is fraudulent
   - Cere v. Wang (3:23-cv-2444): **SUPPORTING** — corroborates pattern
   - Dubai Criminal (31801/2025): **SUPPORTING** — unauthorized corporate action
   - Qu v. Jin: **SUPPORTING** — undermines all Kenzi-orchestrated litigation

5. **Action items route to attorneys with SLAs:**
   - Rocky Lee (24h): Secure Goopal CEO sworn declaration
   - Susanna Chenette (48h): Prepare motion to dismiss unauthorized plaintiff
   - Matt Miller (48h): Targeted discovery on authorization documents
   - Tarek Saad (72h): Forward to Dubai prosecutors
   - Brad Bao (24h): Schedule call with Goopal counsel

6. **Alerts fire:**
   - BOMBSHELL: Goopal CEO denies authorizing RICO lawsuit
   - CROSS-CASE: Evidence impacts 4+ active proceedings simultaneously
   - DEADLINE: Amended complaint expected early next week

### Clean Example (Second Screen)

Same engine, empty case. Shows:
1. First evidence arrives → system proposes 3 initial claims from zero
2. Attorney confirms 2, rejects 1 → weights adjust
3. More evidence → existing claims enrich, new claim emerges
4. Second victim's evidence → playbook pattern detected across victims
5. Knowledge graph builds in real-time

---

## Why This Matters

### For the Kenzi Case
The legal team currently manages evidence across Google Drive folders, email threads, and a 260-page master document. Cross-referencing is manual. When Rocky discovers Goopal's CEO didn't authorize the lawsuit, someone has to manually check which of the 18 crime categories it affects, which cases it impacts, and which attorneys need to act. That takes hours. The system does it in seconds.

### For the Product
This is the first legal evidence platform with:
- **Dynamic claim nodes** that emerge from evidence (not predefined categories)
- **Cross-case pattern detection** (no other tool operates across cases)
- **Compound intelligence** that learns from attorney feedback
- **Sovereign infrastructure** via DDC (tamper-proof, per-case encrypted, jurisdiction-pinned)
- **Multi-victim coordination** with network effects (more victims = stronger intelligence)

### For CEF/DDC
This is what DDC was always supposed to demonstrate:
- Cubbies doing what they were designed for — persistent, evolving, per-entity knowledge
- RAFT events triggering real agent pipelines with real consequences
- DDC storage solving a real sovereignty problem no cloud tool can solve
- Compound intelligence that actually compounds

---

## Architecture

### Same Constitution as Hiring Pipeline (v1.0.0)
- Spec-Driven Development (SDD-First)
- Cubby abstraction (CubbyClient.put/get, never raw HTTP)
- Agent isolation (single-responsibility, RAFT events, stateless)
- Zod schema validation on all cubby writes
- No raw evidence in cubbies (signals only, no privilege waiver risk)
- Full observability (structured logs on every cubby write, agent run, weight update)

### 6 Agents

| # | Agent | Writes To | Hiring Equivalent |
|---|---|---|---|
| 0 | Concierge | (orchestrator) | Concierge |
| 1 | Evidence Extractor | `case-evidence` | Trait Extractor |
| 2 | Claim Proposer | `case-claims` | **(new)** |
| 3 | Claim Scorer | `case-scores` | Scorer |
| 4 | Cross-Case Analyzer | `case-cases` | Interview Analyzer |
| 5 | Distillation | `case-meta` + `case-outcomes` | Distillation |

### 6 Cubbies

| Cubby | Purpose |
|---|---|
| `case-claims/{claim_id}` | Living knowledge nodes — dynamic, emerge from evidence |
| `case-evidence/{id}` | Structured signals per evidence item |
| `case-scores/{id}` | Relevance scores per evidence-claim pair |
| `case-cases/{id}` | Cross-case impact analysis |
| `case-meta` | Claim weights + routing patterns (compound intelligence) |
| `case-outcomes/{id}` | Attorney feedback |

### Tech Stack
- Same Event/Context/CubbyClient interfaces as HiringPipeline
- Postgres as intermediate storage (cubby-compatible schema)
- Mock cubby runtime (swappable to real DDC when node stabilizes)
- Gemini 2.5 Flash for all agent LLM calls
- Express + SSE for real-time dashboard
- OpenClaw skill YAML for conversational interface

---

## Market

### The Gap Nobody Fills

| Capability | Harvey ($11B) | Everlaw ($2B) | Relativity ($3.6B) | Darrow | Chainalysis | Us |
|---|---|---|---|---|---|---|
| Evidence management | -- | Review only | Review only | -- | Blockchain only | Yes |
| Dynamic claim nodes | -- | -- | -- | -- | -- | **Yes** |
| Cross-case detection | -- | -- | -- | Public data only | -- | **Yes** |
| Compound intelligence | -- | -- | -- | -- | -- | **Yes** |
| Evidence integrity | -- | -- | -- | -- | -- | **DDC** |
| Multi-victim coordination | -- | -- | -- | Class action | -- | **Yes** |
| Sovereign/self-hosted | -- | -- | Partial (dying) | -- | -- | **DDC** |

Legal tech market: ~$30B, growing 9% CAGR. $6B raised in 2025 alone.

### Three Wedges

**Wedge 1: Multi-Victim Fraud Playbook Intelligence** (launch wedge)
- Serial fraudsters reuse the same scheme. Proving this pattern is done with spreadsheets today.
- Dogfood: Kenzi case (8+ victims, same playbook, 7 cases, 4 jurisdictions)
- Market: $5.6B in crypto fraud losses reported to FBI in 2023. 150K+ complaints. Zero multi-victim tools.

**Wedge 2: Sovereign Evidence OS for SMB Firms**
- 75% of firms have <10 attorneys. Affordable eDiscovery exists (GoldFynch, Nextpoint) but none has AI claim intelligence, cross-matter search, or sovereign deployment.
- Market: $14B+ eDiscovery, SMB segment underserved by modern AI tools.

**Wedge 3: Regulatory Whistleblower Submission Platform**
- SEC/DOJ submissions done with Word memos. Evidence-to-regulator pipeline entirely manual.
- Market: SEC whistleblower $2B+ in awards. Total FCA recoveries $75B+.

---

## Competitive Moat

Ranked by defensibility:

| Moat | Strength | Timeline |
|---|---|---|
| Multi-victim network effects | Strong | 18+ months to activate |
| Legal knowledge graph architecture | Strong | Day one, compounds |
| Practitioner credibility (dogfood) | Strong but depreciating | 12-month window |
| Claim template library at scale | Moderate | Grows with case volume |
| Air-gapped sovereign deployment | Moderate | Only if true local inference |
| Cross-case intelligence | Weak now, strong later | Requires 500+ cases |

**12-24 month window** before Harvey/Relativity/Everlaw close the gap. Their architecture is document-centric (classify documents). Ours is claim-centric (build knowledge). Retrofitting claim logic onto document management is like adding project management to Dropbox — possible but awkward.

---

## Lessons from Legal Tech Failures

| Failure Mode | Who Died | Our Answer |
|---|---|---|
| Point-solution AI without workflow | Kira, Ravel, Lex Machina | Full pipeline: intake → extraction → scoring → routing → feedback |
| Per-GB pricing | DISCO (stock -90%) | Per-matter or flat-rate |
| Building on hype-cycle AI platform | ROSS (Watson) | Moat is knowledge graph, not the LLM |
| Targeting only BigLaw | Most failures | Start with whistleblower firms + crypto boutiques (5-50 attorneys) |
| Assuming lawyers change behavior | Nearly all | Evidence arrives via email, actions go out via Slack. No new habits. |

**What Clio and Relativity did right:** Own the workflow end-to-end. Start with an underserved segment. Build ecosystem lock-in. Be patient — legal tech is a marathon.

---

## Go-to-Market

### First 10 Customers (6-12 months)

| # | Who | How |
|---|---|---|
| 1-2 | Kenzi case + 1 attorney from network | Free beta |
| 3-5 | TAF (Taxpayers Against Fraud) members | Founder pricing |
| 6-8 | Crypto litigation boutiques (Silver Miller, Freedman Normand) | Direct pitch |
| 9-10 | CLE presentation + ABA TECHSHOW Startup Alley | Inbound |

### Target Firms

**Whistleblower:** Phillips & Cohen, Constantine Cannon, Kohn Kohn & Colapinto, Zuckerman Law
**Crypto:** Silver Miller, Freedman Normand, Quinn Emanuel, Selendy Gay
**Mass tort:** Simmons Hanly Conroy, Beasley Allen, Motley Rice

### Pricing
- Base: $200-500/month
- Per active matter add-on
- Free tier: first matter free
- Founder pricing: 50% off for life for first 10 customers

### Channels
1. Peer referral (most powerful in legal — tribal profession)
2. CLE presentations at state bars (free, positions as expert)
3. Guest posts: Above the Law, Bob Ambrogi's LawSites
4. TAF conference (every serious qui tam attorney in one room)
5. ABA TECHSHOW Startup Alley

---

## DDC Evidence Admissibility

### What Works Today
- FRE 902(13): blockchain-anchored hashes viable as "certified records from electronic process"
- Vermont 12 V.S.A. § 1913: explicit evidentiary presumption for blockchain-registered records
- Hash-based integrity verification: 20+ years of case law
- CAS (content-addressed storage): structurally superior — hash IS the address

### What Needs Work
- No US appellate decision on blockchain anchoring alone satisfying chain of custody
- CAS proves file hasn't changed but doesn't prove accurate capture at source
- GDPR Article 48: need geographic pinning (permissioned DDC, not global nodes)
- Dubai courts: still rely on notarization; blockchain timestamps not yet a substitute

### Product Positioning
> "We provide tamper-evident, auditable, timestamped storage and transparent analysis tools. The attorney makes the judgment."

Human-in-the-loop is legally required post-Mata v. Avianca. Scoring is assistive, not determinative.

---

## Status

| Component | Status |
|---|---|
| Constitution v1.0.0 | Done |
| spec.md + ADR | Done |
| Types (Event, Context, CubbyClient + legal domain) | Done |
| 5 agents (Evidence Extractor, Crime Scorer, Cross-Case Analyzer, Distillation, Concierge) | Done |
| Mock cubby runtime | Done |
| Postgres schema + seed (18 crimes, 7 cases, 13 participants) | Done |
| Dashboard with SSE real-time updates | Done |
| OpenClaw skill YAML | Done |
| Market validation (6 research agents) | Done |
| Competitive landscape analysis | Done |
| **Claim Proposer agent (dynamic claim nodes)** | Next |
| **`case-claims` cubby with living knowledge** | Next |
| **Clean example case (second demo screen)** | Next |
| **Two-screen demo** | Next |
| Zod validation on all writes | Partial |
| Feature specs in /specs/ | Structure only |
| Tests | Not started |

---

## The Pitch (30 seconds)

Same engine as our hiring pipeline. Same agents, same cubbies, same compound intelligence. But instead of scoring candidates against fixed traits, we score evidence against dynamic claims that emerge and evolve as a case builds. Rocky's actual email goes in, 4 agents fire, 18 crime nodes update, 7 cases cross-reference, 4 attorneys get action items. The whole thing runs on DDC — tamper-proof, sovereign, per-case encrypted. No legal AI tool does cross-case intelligence. No one builds dynamic claim nodes. No one fuses evidence integrity with evidence intelligence. We built it because we needed it for the Kenzi case. Now every law firm dealing with complex fraud needs it too.

---

## What the Demo Shows (as of March 2026)

The living document at `localhost:3001/document` is a **litigation command center** with:

- **$267M case** — 18 crime sections, 7 RICO predicate acts, 40+ numbered exhibits
- **AI prosecution strategy** — recommends RICO as primary theory, identifies 7 time-barred claims saved as predicate acts
- **Per-section intelligence** — burden of proof (BRD/PoE), statute of limitations countdown, evidence admissibility tags (FRE 902), gap analysis with remedies
- **Motion readiness tracker** — 5 motions ready to file with dependencies and deadlines
- **Risk scenario analysis** — 6 "what if" scenarios (DHTY excluded, RICO rejected, etc.) with mitigations
- **Damages calculation** — RICO treble multipliers, $15-45M settlement corridor
- **D3 knowledge graphs** — 18-node case graph + per-claim evidence modals with legend
- **Live evidence intake** — 4-agent pipeline processes Rocky's email in real-time via SSE
- **Witness credibility matrix** — 6 witnesses with scores, section coverage, impeachment risks
- **Attorney action items** — per-attorney task lists across 4 jurisdictions
- **Export tools** — legal citation generator, case brief to clipboard, court-filing print stylesheet
