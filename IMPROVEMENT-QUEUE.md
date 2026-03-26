# Improvement Queue — Claim Intel Demo

144 rounds completed. All critical and UX items DONE. 50+ features verified via Playwright.

## CRITICAL (must work for Fred demo) — ALL DONE

- [x] Main case graph renders — 18 nodes, 23 links, D3 force-directed with legend
- [x] Per-claim evidence graph opens in modal — circles/rects/diamonds with "Go to Section" button
- [x] Section 16 updates with Rocky's email — AI-generated legal analysis, not generic text
- [x] Affected sections auto-open and scroll into view after pipeline
- [x] Evidence sub-graphs highlight when parent claim is enriched
- [x] Alert banners appear — BOMBSHELL, cross-case collision, deadline
- [x] Notification popups fire per attorney stakeholder
- [x] "Graph View" button toggles main graph
- [x] "View Evidence Graph" button opens per-claim modal

## UX / LAWYER PERSPECTIVE — ALL DONE (except clean onboarding)

- [x] Introduction overlay — 5 KPIs, feature summary, "Explore the Case" CTA
- [x] Lawyer-friendly graph labels (not IDs)
- [x] Element status indicators (green checkmark, orange circle, red X)
- [x] Graph legend (circles = claims, squares = evidence, diamonds = entities)
- [x] "What's New" human-readable lawyer summary with metric cards + next steps
- [x] Landing page design consistent (warm cream/Playfair)
- [ ] Clean example onboarding (Tab 2 in /dashboard) — NOT BUILT (separate page, not part of main demo)

## EVIDENCE GRAPH CONTENT — ALL DONE

- [x] Evidence nodes show title, source, credibility score
- [x] Element nodes show name, status, # supporting evidence
- [x] Edge labels (supports/contradicts with strength %)
- [x] Hover tooltips on graph nodes
- [x] Click evidence node shows summary
- [x] Before/after strength deltas when new evidence arrives (AI-computed from relevance scores)

## DATA SOURCES — EMAIL DONE

- [x] Email intake simulation (Rocky's email with impact analysis preview)
- [ ] Document upload simulation (not implemented)
- [ ] Court filing intake simulation (not implemented)
- [ ] Blockchain transaction intake simulation (not implemented)

## ONBOARDING (clean example) — NOT BUILT

- [ ] Step 1-5 clean example flow (separate from main Kenzi demo)

## POLISH — ALL DONE

- [x] Landing ↔ document navigation smooth
- [x] Warm cream/Playfair design consistent + dark mode
- [x] Loading states — 4-agent pipeline visualization (Extractor→Proposer→Scorer→Analyzer pills)
- [x] Error handling — SSE auto-reconnect, graceful fallbacks
- [x] Reset button re-seeds all data properly

## BONUS FEATURES (rounds 76-144)

- [x] Prosecution strategy narrative (AI-generated)
- [x] Litigation KPIs (5 motions, 14 meet burden, 7 SOL expired, $267M, 4 jurisdictions)
- [x] Next Best Action recommendation engine
- [x] Damages calculation table ($267.86M with RICO treble, $15-45M settlement)
- [x] SOL Advisory (7 expired + preserved via RICO analysis)
- [x] Motion Readiness Tracker (7 motions, 5 ready)
- [x] Risk Scenario Analysis (6 "what if" scenarios)
- [x] Jurisdiction Strategy Matrix (NDCA/Dubai/Delaware/BVI)
- [x] Burden of proof per section (BRD 95% / PoE 51%)
- [x] Evidence admissibility tags (FRE 902, SELF-AUTH, EXPERT, etc.)
- [x] Evidence provenance chains (Sources → Evidence → Elements → Claim → Cases)
- [x] Evidence gap analysis with actionable remedies
- [x] Evidence cross-citations ("Also in §3, §12, §17")
- [x] Load-bearing dependency badges
- [x] Witness Credibility Matrix (6 witnesses, scores, risks)
- [x] Attorney Action Items (4 attorneys, per-person tasks)
- [x] Case Activity Feed
- [x] Exhibit Index (40 numbered items)
- [x] Export Brief button (case summary to clipboard)
- [x] Cite button (legal citation per section)
- [x] Readiness filter (Court-Ready/Near-Ready/Needs Work)
- [x] Keyboard shortcuts (J/K/E/G/T/?/Escape)
- [x] 10-step demo guide for Fred
- [x] Section breadcrumb in sticky bar
- [x] Case Strength Score tooltip (methodology)
- [x] Navigation pill tooltips (strength + readiness)
- [x] Dynamic "Updated: Just now" timestamps on enrichment
- [x] Print stylesheet (court-filing quality)
- [x] Comment header with file structure map
