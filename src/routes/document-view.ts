/**
 * Document-first litigation command center — The Kenzi Files
 * 137 rounds of continuous improvement. ~2900 lines. ~709KB rendered.
 *
 * STRUCTURE:
 *   1. CSS (lines ~60-260): Variables, layout, print, dark mode
 *   2. Sidebar (lines ~260-470): Cases, witnesses, syndicate map, counsel, attorney actions, activity feed, entity lookup
 *   3. Demo bar + email preview (lines ~470-650): Trigger, reset, panels, email with impact analysis
 *   4. Executive summary (lines ~650-1180): Strategy, score, damages, RICO tracker, SOL advisory, motions, risks, jurisdiction matrix, timelines, victims, heatmap
 *   5. Per-section rendering (lines ~1180-1750): 18 sections × (severity, strength+confidence, readiness, BRD/PoE, SOL, jurisdictions, case impacts, elements+admissibility, provenance chain, gap analysis, quotes, cross-refs, key facts, evidence sub-graphs, cite)
 *   6. Exhibit index + footer (lines ~1750-1850)
 *   7. Client JS (lines ~1850-2915): SSE handlers, enrichment animations, graph integration, keyboard shortcuts, demo guide, scroll tracking
 *
 * KEY JS FUNCTIONS (21 verified):
 *   togglePanel, toggleSection, triggerKenzi, resetKenzi, filterByReadiness,
 *   filterByJurisdiction, searchSections, toggleDarkMode, printDocument,
 *   exportBrief, copyCitation, copyLink, showClaimGraphFromSection,
 *   connectSSE, handleEvent, escapeHtml, addLog, showNotification,
 *   renderMainGraph (graph-renderer.js), showClaimGraph (graph-renderer.js),
 *   toggleEvGraph
 *
 * CRITICAL: Template literal escaping — use \\u2019 for apostrophes in JS strings,
 *   String.fromCharCode(10) for newlines, addEventListener instead of inline onclick
 *   with escaped quotes. See rounds 111 and 127 for bug history.
 */

import type { Request, Response } from 'express';
import { dumpCubbies, getCubbyTree } from '../runtime.js';
import type { LegalCase } from '../types/index.js';
import type { DocumentSection, EvidenceGraph } from '../data/seed-document.js';

export function renderDocument(_req: Request, res: Response) {
  const allData = dumpCubbies();

  // Load document sections
  const sections: DocumentSection[] = Object.entries(allData)
    .filter(([k]) => k.startsWith('document/sections/'))
    .map(([, v]) => v as DocumentSection)
    .sort((a, b) => a.number - b.number);

  // Load evidence graphs
  const graphs: Record<string, EvidenceGraph> = {};
  Object.entries(allData).filter(([k]) => k.startsWith('graphs/')).forEach(([k, v]) => {
    const id = k.replace('graphs/', '');
    graphs[id] = v as EvidenceGraph;
  });

  // Load cases
  const cases: LegalCase[] = Object.entries(allData)
    .filter(([k]) => k.startsWith('cases/') && !k.includes('/impacts'))
    .map(([, v]) => v as LegalCase);

  const meta = allData['document/meta'] as { title: string; subtitle: string; submitted: string } | undefined;
  const cubbyTree = getCubbyTree();

  // Map section numbers to claim evidence counts
  const sectionToClaimMap: Record<string, string> = {'1':'fabrication','2':'grand-theft','3':'aliases','4':'market-manipulation','5':'taint','6':'confrontation','7':'reputation','8':'intimidation','9':'term-sheet','10':'confession','11':'board-investigation','12':'embezzlement','13':'evidence-destruction','14':'digital-seizure','15':'ponzi-laundering','16':'vivian-theft','17':'syndicate','18':'broker-dealer'};
  const claimEvidenceCounts: Record<string, number> = {};
  Object.entries(allData).filter(([k]) => k.startsWith('claims/')).forEach(([, v]) => {
    const c = v as { id: string; evidence_chain?: string[] };
    claimEvidenceCounts[c.id] = c.evidence_chain?.length || 0;
  });
  const daysUntil = (d: string) => Math.max(0, Math.round((new Date(d).getTime() - Date.now()) / 86400000));

  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${meta?.title || 'Claim Intelligence Engine'} | Claim Intel</title>
<meta name="description" content="Living legal intelligence document — 18 crime sections, 40+ evidence items, 7 active cases across 4 jurisdictions. Powered by sovereign AI infrastructure.">
<meta property="og:title" content="${meta?.title || 'The Ken Zi Wang Crime'} — Claim Intel">
<meta property="og:description" content="18 crimes. 7 cases. $58M+ in claims. A living legal document powered by compound intelligence.">
<meta property="og:type" content="article">
<meta name="twitter:card" content="summary">
<meta name="twitter:title" content="Claim Intel — Legal Evidence Intelligence">
<meta name="twitter:description" content="Same compound intelligence engine. Dynamic claim nodes. Cross-case detection. Sovereign infrastructure.">
<meta name="robots" content="noindex, nofollow">
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='6' fill='%23c47a4a'/><text x='16' y='22' text-anchor='middle' font-size='18' font-weight='bold' fill='white'>CI</text></svg>">
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,800;1,400;1,700&family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
:root{--bg:#f5f0eb;--surface:#fff;--surface2:#ede8e1;--surface3:#e5ddd4;--border:#d8d0c6;--text:#1a1714;--text2:#6b6259;--text3:#9a9087;--primary:#c47a4a;--red:#b84233;--orange:#c47a4a;--green:#5a8a5e;--purple:#7a6398;--cyan:#5a8a8a;--font:'Inter',sans-serif;--mono:'JetBrains Mono',monospace;--serif:'Playfair Display',Georgia,serif}
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:var(--font);background:var(--bg);color:var(--text)}

/* Layout */
.layout{display:grid;grid-template-columns:220px 1fr;min-height:100vh}

/* Sidebar */
.sidebar{background:var(--surface);border-right:1px solid var(--border);overflow-y:auto;padding:16px 0}
.sb-brand{padding:0 16px 14px;border-bottom:1px solid var(--border)}
.sb-brand h1{font-size:13px;font-weight:700;color:var(--text);letter-spacing:2px;text-transform:uppercase}
.sb-brand p{font-size:9px;color:var(--text3);margin-top:2px}
.sb-section{padding:14px 16px 4px;font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:var(--text3)}
.sb-case{padding:6px 16px;font-size:11px;border-left:3px solid transparent;cursor:pointer}
.sb-case:hover{background:var(--surface2)}
.sb-case .name{font-weight:600}
.sb-case .meta{font-size:9px;color:var(--text3);margin-top:1px}
.sb-case .dl{font-size:9px;color:var(--orange)}
.sb-case[data-type="criminal"]{border-left-color:rgba(184,66,51,.3)}
.sb-case[data-type="civil"]{border-left-color:rgba(59,130,246,.3)}
.sb-person{padding:4px 16px;font-size:10px;color:var(--text2)}

/* Main content */
.main{overflow-y:auto;max-height:100vh}

/* Document header */
.doc-header{padding:32px 48px 24px;border-bottom:1px solid var(--border);background:var(--surface)}
.doc-header .submitted{font-size:10px;color:var(--primary);font-weight:600;text-transform:uppercase;letter-spacing:2px}
.doc-header h1{font-family:var(--serif);font-size:32px;font-weight:700;margin-top:6px;letter-spacing:-.5px}
.doc-header .subtitle{font-size:12px;color:var(--text2);margin-top:4px}
.doc-header .doc-stats{display:flex;gap:24px;margin-top:16px;font-size:11px;color:var(--text3)}
.doc-header .doc-stats .stat-val{font-weight:700;color:var(--text);margin-right:4px}

/* Demo bar */
.demo-bar{padding:8px 48px;background:rgba(255,255,255,.85);backdrop-filter:blur(12px);border-bottom:1px solid var(--border);display:flex;align-items:center;gap:10px;position:sticky;top:0;z-index:20;font-size:11px}
.btn{padding:8px 18px;border-radius:6px;border:none;font-size:12px;font-weight:600;cursor:pointer;font-family:var(--font)}
.btn-primary{background:var(--text);color:var(--bg);border:1px solid var(--text);border-radius:20px;font-size:11px;padding:6px 16px}
.btn-primary:hover{opacity:.9}
.btn-secondary{background:transparent;color:var(--text);border:1px solid var(--border);border-radius:20px}
.btn-sm{padding:5px 12px;font-size:10px}
#demo-status{font-size:11px;color:var(--text2)}

/* Alert banner */
.alert-banner{margin:0 48px;padding:14px 20px;border-radius:10px;display:none;animation:fadeIn .5s}
.alert-banner.critical{background:rgba(184,66,51,.06);border:1px solid rgba(184,66,51,.2);margin-top:16px}
.alert-banner.high{background:rgba(196,122,74,.06);border:1px solid rgba(196,122,74,.2);margin-top:8px}
.alert-banner .ab-title{font-size:13px;font-weight:700}
.alert-banner.critical .ab-title{color:var(--red)}
.alert-banner.high .ab-title{color:var(--orange)}
.alert-banner .ab-body{font-size:11px;color:var(--text2);margin-top:4px;line-height:1.5}
@keyframes fadeIn{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}
.spinner{width:14px;height:14px;border:2px solid var(--border);border-top-color:var(--primary);border-radius:50%;animation:spin .8s linear infinite;display:inline-block}
@keyframes spin{to{transform:rotate(360deg)}}

/* Print styles */
@media print{
  .sidebar,.demo-bar,.log,.graph-toggle,.tech-panel,.email-panel,#intro-overlay,#alert-banners,.section-toggle,#email-preview-bar,#email-preview-content,#notif-container,#demo-guide,.ready-filter,.jur-filter,#section-search,.scroll-top-btn,#scroll-progress{display:none !important}
  .btn{display:none !important}
  .layout{display:block !important;grid-template-columns:none !important}
  .main{overflow:visible !important;max-height:none !important;padding:0 !important}
  .doc-section{break-inside:avoid;border:1px solid #ccc !important;margin-bottom:12px !important;page-break-inside:avoid}
  .section-content{display:block !important;max-height:none !important}
  .section-content.open{display:block !important}
  .section-header{background:#f5f0eb !important;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .section-preview{display:none !important}
  body{font-size:10px;background:#fff !important;color:#000 !important;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .doc-header{padding:20px 0 !important;border-bottom:2px solid #000 !important}
  .doc-header h1{font-size:24px !important}
  .doc-body{padding:0 20px !important}
  a{color:inherit !important;text-decoration:none !important}
  /* Preserve colored badges and progress bars in print */
  [style*="background"]{-webkit-print-color-adjust:exact !important;print-color-adjust:exact !important}
  /* Page headers */
  @page{margin:0.75in;@top-center{content:"The Ken Zi Wang Crime — CONFIDENTIAL"}}
  @page:first{margin-top:0.5in}
  /* Exhibit index — keep together */
  #exhibit-index{page-break-before:always}
  #exhibit-index table{font-size:9px !important}
  /* Key facts */
  .key-facts{page-break-inside:avoid}
  /* Evidence graphs — skip in print */
  .evidence-graph{display:none !important}
  /* Connection callouts */
  .connection-callout{border:1px solid #ccc !important;margin-bottom:4px !important}
}

/* Dark mode */
body.dark{--bg:#1a1d24;--surface:#22262f;--surface2:#2a2f3a;--surface3:#333845;--border:#3a4050;--text:#d8dbe2;--text2:#9aa0ae;--text3:#6a7080;--primary:#d49060;--red:#e06050;--green:#6aaa6e;--purple:#9a80c0;--cyan:#70a0a0}
body.dark .doc-header{background:var(--surface)}
body.dark .email-card{background:var(--surface);color:var(--text)}
body.dark .email-card h3{color:var(--text)}
body.dark .email-card .ep-meta{color:var(--text3)}
body.dark .email-card .ep-case{background:var(--surface2);border-left-color:var(--primary)}
body.dark .email-card .ep-case h4{color:var(--primary)}
body.dark .email-card .ep-action{background:var(--surface2);border-left-color:var(--primary)}

/* Document body */
.doc-body{padding:24px 48px 80px}

/* Section */
.doc-section{margin-bottom:2px;border:1px solid var(--border);border-radius:10px;overflow:hidden;transition:all .4s}
.doc-section.affected{border-color:var(--primary);box-shadow:0 0 20px rgba(196,122,74,.1);animation:sectionPulse 2s ease-out}
@keyframes sectionPulse{0%{box-shadow:0 0 30px rgba(196,122,74,.2)}100%{box-shadow:0 0 20px rgba(196,122,74,.1)}}
.section-header{padding:16px 20px;background:var(--bg);cursor:pointer;display:flex;justify-content:space-between;align-items:center;user-select:none}
.section-header:hover{background:var(--surface2)}
.section-left{display:flex;align-items:center;gap:12px}
.section-num{font-size:10px;font-weight:700;color:var(--text2);background:var(--surface);padding:3px 8px;border-radius:4px;min-width:28px;text-align:center;border:1px solid var(--border)}
.section-title{font-family:var(--serif);font-size:15px;font-weight:700}
.section-right{display:flex;align-items:center;gap:10px}
.section-badge{font-size:9px;padding:2px 8px;border-radius:4px;font-weight:600}
.section-badge.evidence{background:rgba(90,138,138,.1);color:var(--cyan)}
.section-badge.connections{background:rgba(122,99,152,.1);color:var(--purple)}
.section-badge.gap{background:rgba(184,66,51,.1);color:var(--red)}
.section-badge.updated{background:rgba(196,122,74,.1);color:var(--primary);animation:fadeIn .5s}
.section-toggle{font-size:16px;color:var(--text3);transition:transform .2s}
.section-toggle.open{transform:rotate(90deg)}

/* Section content */
.section-content{max-height:0;overflow:hidden;padding:0 20px;border-top:0 solid var(--border);background:var(--surface);transition:max-height .3s ease-out,padding .3s ease-out,border-top-width .1s}
.section-content.open+.section-preview,.section-content.open~.section-preview{display:none}
.section-preview{border-bottom:1px solid var(--border)}
.section-content.open{max-height:5000px;padding:20px;border-top-width:1px;transition:max-height .4s ease-in,padding .3s ease-in}
.section-text{font-size:13px;line-height:1.8;color:var(--text2);max-width:720px}
.section-text p{margin-bottom:12px}

/* Inline connection callout */
.connection-callout{background:rgba(122,99,152,.04);border-left:3px solid var(--purple);padding:10px 14px;border-radius:0 8px 8px 0;margin:12px 0;font-size:11px;transition:all .15s}
.connection-callout:hover{background:rgba(122,99,152,.08);transform:translateX(4px)}
.connection-callout .cc-label{font-weight:700;color:var(--purple);font-size:10px;text-transform:uppercase;letter-spacing:.5px}
.connection-callout .cc-text{color:var(--text2);margin-top:3px;line-height:1.5}
.connection-callout.new{background:rgba(196,122,74,.06);border-left-color:var(--primary);animation:fadeIn .6s}
.connection-callout.new .cc-label{color:var(--primary)}

/* Key facts */
.key-facts{margin-top:16px}
.key-facts h4{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:var(--text3);margin-bottom:8px}
.fact{font-size:11px;color:var(--text2);padding:4px 0;padding-left:14px;position:relative;line-height:1.5}
.fact::before{content:'';position:absolute;left:0;top:10px;width:6px;height:6px;border-radius:50%;background:var(--green)}
.gap{font-size:11px;color:var(--orange);padding:4px 0;padding-left:14px;position:relative;font-style:italic;line-height:1.5}
.gap::before{content:'';position:absolute;left:0;top:10px;width:6px;height:6px;border-radius:50%;background:var(--orange)}

/* Evidence sub-graph */
.evidence-graph{margin-top:16px;background:var(--bg);border:1px solid var(--border);border-radius:8px;overflow:hidden}
.eg-header{padding:10px 14px;cursor:pointer;display:flex;justify-content:space-between;align-items:center;font-size:11px;font-weight:600;color:var(--text2)}
.eg-header:hover{background:var(--surface2)}
.eg-header .eg-type{font-size:8px;text-transform:uppercase;letter-spacing:.5px;color:var(--cyan);padding:1px 6px;background:rgba(90,138,138,.08);border-radius:3px}
.eg-content{display:none;padding:14px;border-top:1px solid var(--border);font-size:11px;color:var(--text2);line-height:1.6}
.eg-content.open{display:block}
.eg-finding{padding:3px 0;padding-left:12px;position:relative}
.eg-finding::before{content:'';position:absolute;left:0;top:9px;width:4px;height:4px;border-radius:50%;background:var(--primary)}
.eg-connected{margin-top:10px;font-size:10px;color:var(--text3)}
.eg-connected a{color:var(--purple);cursor:pointer}

/* Regeneration indicator */
.regen-log{margin-top:16px;padding-top:12px;border-top:1px solid var(--border)}
.regen-log h4{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:var(--text3);margin-bottom:6px}
.regen-entry{font-size:10px;color:var(--text3);padding:2px 0}
.regen-entry strong{color:var(--text2)}
.regen-entry.new{color:var(--cyan);font-weight:600}

/* Process log */
.log{margin:12px 48px;background:var(--surface);border-radius:8px;padding:10px;font-family:var(--mono);font-size:10px;max-height:140px;overflow-y:auto;display:none;border:1px solid var(--border)}
.log.active{display:block}
.log-line{padding:2px 0;color:var(--text3)}
.log-line .tag{font-weight:600}
.log-line .tag.ok{color:var(--green)}
.log-line .tag.run{color:var(--cyan)}

/* Toggle sections */
.toggle-row{padding:8px 48px;cursor:pointer;font-size:10px;color:var(--text3);display:flex;align-items:center;gap:6px;border-top:1px solid var(--border);margin-top:24px}
.toggle-row:hover{color:var(--text2)}

/* Technical panel (hidden by default) */
.tech-panel{display:none;padding:16px 48px}
.tech-panel.open{display:block}
.inspector{background:var(--surface);border-radius:8px;padding:12px;font-family:var(--mono);font-size:10px;max-height:250px;overflow-y:auto;border:1px solid var(--border)}
.inspector-path{padding:2px 0;cursor:pointer;color:var(--text3);display:flex;gap:8px}
.inspector-path:hover{color:var(--cyan)}
.inspector-path .ip-path{color:var(--purple)}
.inspector-detail{background:var(--surface2);border-radius:6px;padding:8px;margin:4px 0;font-size:9px;white-space:pre-wrap;word-break:break-all;max-height:180px;overflow-y:auto}

/* Email preview panel */
.email-panel{display:none;padding:0 48px 24px}
.email-panel.open{display:block}
.email-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.email-card{background:#fff;color:#1a1a1a;border-radius:10px;padding:20px;font-size:12px;line-height:1.6;max-height:350px;overflow-y:auto}
.email-card h3{font-size:14px;margin-bottom:6px}
.email-card .ep-meta{font-size:10px;color:#666;margin-bottom:10px}
.email-card .ep-case{background:#f0f4ff;border-left:3px solid #3b82f6;padding:8px 12px;margin:6px 0;border-radius:0 6px 6px 0}
.email-card .ep-case h4{font-size:11px;color:#1e40af;margin-bottom:2px}
.email-card .ep-action{background:#fef3c7;border-left:3px solid #f59e0b;padding:6px 12px;margin:4px 0;border-radius:0 6px 6px 0;font-weight:600;font-size:10px}

/* Graph visualization toggle */
.graph-toggle{display:none;padding:0 48px 24px;width:100%;box-sizing:border-box}
.graph-toggle.open{display:block}
#main-graph-container{min-height:500px;width:100%}
#main-graph-container{width:100%;min-height:500px;background:var(--surface);border-radius:12px;border:1px solid var(--border);overflow:hidden}
#main-graph-container svg{width:100%;height:500px}
</style>
</head>
<body>
<div class="layout">
<div class="sidebar">
  <div class="sb-brand">
    <a href="/" style="text-decoration:none;color:inherit;display:block">
      <div style="font-size:9px;color:var(--text3);margin-bottom:4px">&larr; Claim Intel</div>
      <h1>KENZI FILES</h1>
      <p>Living Evidence Intelligence</p>
    </a>
  </div>
  <div class="sb-section">Active Cases (${cases.length})</div>
  ${(() => {
    const byJurisdiction: Record<string, typeof cases> = {};
    cases.forEach(c => { (byJurisdiction[c.jurisdiction] = byJurisdiction[c.jurisdiction] || []).push(c); });
    return Object.entries(byJurisdiction).map(([jur, jurCases]) =>
      `<div style="padding:6px 16px 2px;font-size:8px;font-weight:700;letter-spacing:1.5px;color:var(--text3);text-transform:uppercase;margin-top:4px">${jur}</div>` +
      jurCases.map(c => {
        const d = daysUntil(c.next_deadline);
        const urgStyle = d <= 3 ? 'color:var(--red);font-weight:700' : d <= 7 ? 'color:var(--orange)' : '';
        const filed = c.filed_date ? new Date(c.filed_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '';
        // Calculate evidence completeness from connected claims
        const connClaims = (c.connected_claims || []) as string[];
        let totalEl = 0, provenEl = 0;
        connClaims.forEach(cid => {
          const cl = allData['claims/' + cid] as { elements?: Array<{ status: string }> } | undefined;
          if (cl?.elements) { totalEl += cl.elements.length; provenEl += cl.elements.filter(e => e.status === 'proven').length; }
        });
        const completeness = totalEl > 0 ? Math.round((provenEl / totalEl) * 100) : 0;
        const compColor = completeness >= 90 ? 'var(--green)' : completeness >= 70 ? 'var(--primary)' : completeness > 0 ? 'var(--red)' : 'var(--text3)';
        // Readiness checklist per case
        const caseChecklist: Record<string, Array<{item: string; status: string}>> = {
          'goopal-v-jin': [
            { item: 'Motion to dismiss (unauthorized plaintiff)', status: 'ready' },
            { item: 'Goopal CEO sworn declaration', status: 'pending' },
            { item: 'CCP 128.7 safe harbor letter', status: 'drafting' },
            { item: 'Proof of counsel authority demand', status: 'ready' },
          ],
          'cere-v-wang': [
            { item: 'Discovery responses', status: 'ready' },
            { item: 'Forensic evidence package', status: 'ready' },
            { item: 'Expert witness designation', status: 'pending' },
          ],
          'dubai-criminal-1': [
            { item: '260-page evidence submission', status: 'ready' },
            { item: 'Victim statements (Dylan, Vijay)', status: 'drafting' },
            { item: 'Passport seizure extension', status: 'ready' },
          ],
          'wang-v-cerebellum': [
            { item: 'Motion to dismiss (response)', status: 'drafting' },
            { item: 'Counterclaim preparation', status: 'pending' },
          ],
        };
        const checklist = caseChecklist[c.id] || [];
        return `<div class="sb-case" data-type="${c.case_type}" onclick="var cl=this.querySelector('.case-checklist');if(cl)cl.style.display=cl.style.display==='none'?'block':'none'" style="cursor:pointer">
          <div class="name">${c.short_name}</div>
          <div class="meta">${c.case_number}${filed ? ' &middot; Filed ' + filed : ''}</div>
          ${totalEl > 0 ? `<div style="height:3px;background:var(--border);border-radius:2px;margin:3px 0;overflow:hidden"><div style="height:100%;width:${completeness}%;background:${compColor};border-radius:2px"></div></div>
          <div style="font-size:8px;color:${compColor}">${provenEl}/${totalEl} elements &middot; ${completeness}% complete</div>` : ''}
          <div class="dl" style="${urgStyle}">${d <= 0 ? '<span style="color:var(--red);font-weight:700">OVERDUE</span>' : d + 'd'} &rarr; ${c.next_deadline_desc}</div>
          ${checklist.length > 0 ? `<div class="case-checklist" style="display:none;margin-top:6px;padding-top:6px;border-top:1px solid var(--border)">
            ${checklist.map(item => {
              const icon = item.status === 'ready' ? '&#x2705;' : item.status === 'drafting' ? '&#x270F;' : '&#x23F3;';
              const stColor = item.status === 'ready' ? 'var(--green)' : item.status === 'drafting' ? 'var(--primary)' : 'var(--red)';
              return `<div style="font-size:9px;padding:2px 0;display:flex;gap:4px;align-items:center"><span>${icon}</span><span style="flex:1">${item.item}</span><span style="color:${stColor};font-weight:600;font-size:8px;text-transform:uppercase">${item.status}</span></div>`;
            }).join('')}
          </div>` : ''}
        </div>`;
      }).join('')
    ).join('');
  })()}
  <div class="sb-section">Legal Team</div>
  ${[
    { name: 'Rocky Lee', firm: 'Milliard Law', jur: 'all', role: 'Lead Coordinator' },
    { name: 'Susanna Chenette', firm: 'Hanson Bridgett', jur: 'NDCA', role: 'NDCA Litigation' },
    { name: 'Matt Miller', firm: 'Hanson Bridgett', jur: 'NDCA', role: 'NDCA Litigation' },
    { name: 'Tarek Saad', firm: 'BLK Partners', jur: 'Dubai', role: 'Dubai Criminal' },
  ].map(p => `<div class="sb-person" onclick="filterByJurisdiction('${p.jur}');document.querySelector('.doc-body').scrollIntoView({behavior:'smooth'})" style="cursor:pointer;border-radius:4px;padding:5px 16px;transition:background .15s" onmouseover="this.style.background='var(--surface2)'" onmouseout="this.style.background='transparent'" title="Click to filter: ${p.role}"><span style="font-weight:600">${p.name}</span><br><span style="font-size:9px;color:var(--text3)">${p.firm} &middot; ${p.role}</span></div>`).join('')}
  <div class="sb-section">Witness Credibility Matrix</div>
  ${[
    { name: 'Dylan Dewdney', org: 'RAZE Network', status: 'ready', credibility: 9, sections: [15, 16, 17], can_testify: 'Kenzi controlled RAZE allocations via AU21. Closes bridge wallet loop.', risk: 'None — independent victim' },
    { name: 'Vijay Garg', org: 'Inclusion Capital', status: 'ready', credibility: 8, sections: [8, 17], can_testify: '$40M claim. Describes MO: "Tell a big story, then shakes you down."', risk: 'Financial interest in outcome' },
    { name: 'Vivian Liu', org: 'Goopal', status: 'reclassified', credibility: 7, sections: [16, 3, 17], can_testify: 'Reclassified from adversary to VICTIM. Goopal CEO confirms no lawsuit authorization.', risk: 'Prior adverse filing may be raised' },
    { name: 'Brad Bao', org: 'Lime / Ind. Director', status: 'ready', credibility: 9, sections: [1, 11, 12], can_testify: 'Board investigation. Witnessed fabricated credentials and missing $3M.', risk: 'None — independent director' },
    { name: 'Emmie Chang', org: 'SuperBloom / QRI', status: 'ready', credibility: 8, sections: [1, 5], can_testify: 'Independently verified Columbia/Wharton credentials were fabricated.', risk: 'None — third-party investigator' },
    { name: 'Fred Jin', org: 'Cere Network CEO', status: 'ready', credibility: 7, sections: [2, 6, 8, 9, 12, 13, 14], can_testify: 'Primary victim. Direct witness to threats, coercion, and fund diversions.', risk: 'Interested party — corroboration essential' },
  ].map(w => {
    const stColor = w.status === 'ready' ? 'var(--green)' : w.status === 'reclassified' ? 'var(--primary)' : 'var(--text3)';
    const credColor = w.credibility >= 9 ? 'var(--green)' : w.credibility >= 7 ? 'var(--primary)' : 'var(--red)';
    return `<div style="padding:6px 16px;cursor:pointer;border-bottom:1px solid var(--border)" onclick="toggleSection('section-${w.sections[0]}');document.getElementById('section-${w.sections[0]}').scrollIntoView({behavior:'smooth'})" title="Jump to Section ${w.sections[0]}">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <span style="font-size:11px;font-weight:600">${w.name}</span>
        <div style="display:flex;gap:3px;align-items:center">
          <span style="font-size:8px;font-weight:700;color:${credColor}">${w.credibility}/10</span>
          <span style="font-size:7px;padding:1px 5px;border-radius:3px;background:${stColor}15;color:${stColor};font-weight:600;text-transform:uppercase">${w.status}</span>
        </div>
      </div>
      <div style="font-size:9px;color:var(--text3)">${w.org}</div>
      <div style="font-size:8px;color:var(--text2);margin-top:2px;line-height:1.3">${w.can_testify}</div>
      <div style="display:flex;gap:3px;margin-top:3px;flex-wrap:wrap">
        <span style="font-size:7px;color:var(--text3)">Sections:</span>
        ${w.sections.map(sn => `<span style="font-size:7px;padding:0 3px;border-radius:2px;background:var(--bg);color:var(--text2);font-weight:600">${sn}</span>`).join('')}
      </div>
      ${w.risk !== 'None — independent victim' && w.risk !== 'None — independent director' && w.risk !== 'None — third-party investigator' ? `<div style="font-size:7px;color:var(--orange);margin-top:2px">&#x26A0; ${w.risk}</div>` : ''}
    </div>`;
  }).join('')}
  <div class="sb-section">Syndicate Network</div>
  <div style="padding:8px 16px">
    <div style="position:relative;height:160px;font-size:8px">
      <!-- Kenzi center -->
      <div style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:40px;height:40px;border-radius:50%;background:var(--red);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:9px;z-index:2;border:2px solid var(--surface)">KW</div>
      <!-- Connections -->
      ${[
        { name: 'Kevin Xu', role: 'BlockVC', x: 10, y: 15, color: '#b84233' },
        { name: 'Nailwal', role: 'Polygon', x: 80, y: 10, color: '#c47a4a' },
        { name: 'Vivian', role: 'Goopal', x: 85, y: 70, color: '#7a6398' },
        { name: 'Mike C.', role: 'MM', x: 10, y: 75, color: '#9a9087' },
        { name: 'Ch. Guo', role: 'Gate.io', x: 5, y: 45, color: '#9a9087' },
        { name: 'Kamiya', role: 'Symbolic', x: 85, y: 40, color: '#c47a4a' },
        { name: 'K. Ding', role: 'Josef Qu', x: 50, y: 5, color: '#9a9087' },
      ].map(p => `<div style="position:absolute;left:${p.x}%;top:${p.y}%;text-align:center;z-index:2">
        <div style="width:28px;height:28px;border-radius:50%;background:${p.color};color:#fff;display:flex;align-items:center;justify-content:center;font-size:7px;font-weight:700;margin:0 auto;border:2px solid var(--surface)">${p.name.split(' ')[0].slice(0,2).toUpperCase()}</div>
        <div style="font-size:7px;color:var(--text2);margin-top:1px;white-space:nowrap">${p.name}</div>
        <div style="font-size:6px;color:var(--text3)">${p.role}</div>
      </div>`).join('')}
      <!-- Simple lines from center to each node (using SVG) -->
      <svg style="position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:1">
        ${[{x:24,y:29},{x:94,y:24},{x:99,y:84},{x:24,y:89},{x:19,y:59},{x:99,y:54},{x:64,y:19}].map(p =>
          `<line x1="50%" y1="50%" x2="${p.x}%" y2="${p.y}%" stroke="var(--border)" stroke-width="1" stroke-dasharray="3,3"/>`
        ).join('')}
      </svg>
    </div>
    <div style="font-size:8px;color:var(--text3);text-align:center;margin-top:4px">Click "Graph View" for interactive version</div>
  </div>
  <div class="sb-section">Opposing Counsel</div>
  ${[
    { name: 'John Ly', firm: 'Unknown', cases: 'Goopal v. Jin', status: 'active', note: 'Represents Goopal/Vivian. May lack client authorization.' },
    { name: 'Unknown', firm: 'Delaware counsel', cases: 'Wang v. Cerebellum', status: 'active', note: 'Kenzi retaliatory filing.' },
  ].map(oc => `<div style="padding:5px 16px">
    <div style="display:flex;justify-content:space-between;font-size:10px"><span style="font-weight:600;color:var(--text)">${oc.name}</span><span style="font-size:8px;color:var(--red);font-weight:600">${oc.status.toUpperCase()}</span></div>
    <div style="font-size:8px;color:var(--text3)">${oc.firm} &middot; ${oc.cases}</div>
    <div style="font-size:8px;color:var(--primary);margin-top:1px">${oc.note}</div>
  </div>`).join('')}
  <div class="sb-section">Action Items by Attorney</div>
  <div style="padding:4px 16px 10px">
    ${[
      { name: 'Rocky Lee', firm: 'Milliard (Lead)', color: '#b84233', items: [
        { action: 'File TRO / Asset Freeze', urgency: 'critical', deadline: 'ASAP' },
        { action: 'Obtain Rocky Lee declaration re: Goopal CEO', urgency: 'high', deadline: 'This week' },
        { action: 'Coordinate RICO complaint filing', urgency: 'high', deadline: '2 weeks' },
      ]},
      { name: 'Susanna Chenette', firm: 'Hanson Bridgett (NDCA)', color: '#3b82f6', items: [
        { action: 'File PI motion — social media hijacking', urgency: 'high', deadline: 'This week' },
        { action: 'Serve subpoenas: KuCoin + Gate.io', urgency: 'medium', deadline: '10 days' },
        { action: 'File anti-suit injunction vs Goopal', urgency: 'high', deadline: 'This week' },
      ]},
      { name: 'Tarek / BLK Partners', firm: 'Dubai DIFC', color: '#c47a4a', items: [
        { action: 'Confirm passport seizure status', urgency: 'medium', deadline: 'This week' },
        { action: 'Engage DIFC enforcement counsel', urgency: 'medium', deadline: '2 weeks' },
      ]},
      { name: 'Delaware Counsel', firm: 'TBD (Delaware)', color: '#7a6398', items: [
        { action: 'File SJ motion — Term Sheet void', urgency: 'medium', deadline: '30 days' },
        { action: 'Respond to Wang v. Cerebellum', urgency: 'high', deadline: 'Per schedule' },
      ]},
    ].map(atty => {
      return '<div style="margin-bottom:8px">' +
        '<div style="font-size:10px;font-weight:700;color:' + atty.color + ';margin-bottom:3px">' + atty.name + ' <span style="font-weight:400;color:var(--text3);font-size:8px">' + atty.firm + '</span></div>' +
        atty.items.map(item => {
          const urgColor = item.urgency === 'critical' ? 'var(--red)' : item.urgency === 'high' ? 'var(--primary)' : 'var(--text3)';
          return '<div style="display:flex;gap:4px;align-items:start;padding:2px 0;font-size:9px">' +
            '<span style="color:' + urgColor + ';flex-shrink:0;margin-top:1px">&#x25CF;</span>' +
            '<div style="flex:1;color:var(--text2);line-height:1.3">' + item.action + ' <span style="color:var(--text3);font-size:7px">(' + item.deadline + ')</span></div>' +
          '</div>';
        }).join('') +
      '</div>';
    }).join('')}
  </div>
  <div class="sb-section">Case Activity Feed</div>
  <div style="padding:4px 16px 8px">
    ${(() => {
      // Build activity feed from multiple sources
      const activities: Array<{ time: string; icon: string; text: string; color: string }> = [];

      // Recent evidence
      Object.entries(allData)
        .filter(([k]) => k.startsWith('evidence/'))
        .map(([, v]) => v as { id: string; title: string; type: string; extracted_at?: string })
        .filter(ev => ev.extracted_at)
        .sort((a, b) => (b.extracted_at || '').localeCompare(a.extracted_at || ''))
        .slice(0, 3)
        .forEach(ev => {
          const icon = ev.type === 'blockchain_tx' ? '&#x26D3;' : ev.type === 'report' ? '&#x1F50D;' : ev.type === 'filing' ? '&#x1F4C4;' : ev.type === 'email' ? '&#x2709;' : '&#x1F4CE;';
          activities.push({ time: (ev.extracted_at || '').split('T')[0], icon, text: (ev.title || ev.id).slice(0, 40), color: 'var(--text2)' });
        });

      // Add case milestones
      activities.push(
        { time: '2026-03-23', icon: '&#x2709;', text: 'Rocky Lee: Goopal CEO confirms no authorization', color: 'var(--primary)' },
        { time: '2026-03-23', icon: '&#x1F916;', text: '4 AI agents processed Rocky email → 8 sections enriched', color: 'var(--cyan)' },
        { time: '2026-02-28', icon: '&#x1F50D;', text: 'BIG Forensic Report: bridge wallet provenance confirmed', color: 'var(--green)' },
        { time: '2025-11-07', icon: '&#x1F4C4;', text: 'Practus LLP investigation report filed', color: 'var(--green)' },
        { time: '2025-07-07', icon: '&#x1F6A8;', text: 'Dubai arrest — passport seized, phone forensics ordered', color: 'var(--red)' },
      );

      // Sort by date and take latest 8
      activities.sort((a, b) => b.time.localeCompare(a.time));
      return activities.slice(0, 8).map(a =>
        '<div style="padding:3px 0;font-size:9px;display:flex;gap:6px;align-items:start;border-bottom:1px solid var(--border)">' +
          '<span style="flex-shrink:0">' + a.icon + '</span>' +
          '<div style="flex:1"><div style="color:' + a.color + ';line-height:1.3">' + a.text + '</div>' +
          '<div style="font-size:7px;color:var(--text3)">' + a.time + '</div></div></div>'
      ).join('');
    })()}
  </div>
  <div class="sb-section">Quick Lookup</div>
  <div style="padding:4px 16px 12px;display:flex;flex-wrap:wrap;gap:3px">
    ${['Kenzi Wang','Vivian Liu','Kevin Xu','Sandeep Nailwal','Chandler Guo','Sachi Kamiya','Fred Jin','Brad Bao','Dylan Dewdney','Vijay Garg','Emmie Chang','0xb08f','Gate.io','AU21','Symbolic','Republic','DHTY','Practus','BIG Report','KuCoin','Telegram','Huobi'].map(entity =>
      `<span onclick="document.getElementById('section-search').value='${entity.toLowerCase()}';searchSections('${entity.toLowerCase()}')" style="cursor:pointer;font-size:8px;padding:2px 6px;border:1px solid var(--border);border-radius:4px;color:var(--text3);transition:all .12s" onmouseover="this.style.borderColor='var(--primary)';this.style.color='var(--primary)'" onmouseout="this.style.borderColor='var(--border)';this.style.color='var(--text3)'">${entity}</span>`
    ).join('')}
  </div>
</div>
<div class="main">

  <!-- Today's Priority -->
  ${(() => {
    const urgentCases = cases
      .map(c => ({ ...c, days: daysUntil(c.next_deadline) }))
      .filter(c => c.days <= 7)
      .sort((a, b) => a.days - b.days);
    if (urgentCases.length === 0) return '';
    const most = urgentCases[0];
    const bgColor = most.days <= 2 ? 'rgba(184,66,51,.06)' : 'rgba(196,122,74,.06)';
    const borderColor = most.days <= 2 ? 'var(--red)' : 'var(--primary)';
    const icon = most.days <= 2 ? '&#x1F6A8;' : '&#x26A0;';
    return `<div style="padding:12px 48px;background:${bgColor};border-bottom:2px solid ${borderColor};display:flex;align-items:center;gap:12px">
      <span style="font-size:18px">${icon}</span>
      <div style="flex:1">
        <div style="font-size:11px;font-weight:700;color:${borderColor}">TODAY&rsquo;S PRIORITY: ${most.short_name} &mdash; ${most.days <= 0 ? 'OVERDUE' : most.days + ' day' + (most.days !== 1 ? 's' : '') + ' remaining'}</div>
        <div style="font-size:10px;color:var(--text2)">${most.next_deadline_desc}${urgentCases.length > 1 ? ' &middot; +' + (urgentCases.length - 1) + ' more deadline' + (urgentCases.length > 2 ? 's' : '') + ' this week' : ''}</div>
      </div>
      <span style="font-size:9px;color:var(--text3)">${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</span>
    </div>`;
  })()}

  <!-- Next Best Action -->
  <div style="padding:10px 48px;background:rgba(90,138,138,.04);border-bottom:1px solid rgba(90,138,138,.15);display:flex;align-items:center;gap:12px">
    <span style="font-size:14px">&#x1F3AF;</span>
    <div style="flex:1">
      ${(() => {
        // Compute the single most impactful next action across all signals
        const actions: Array<{ priority: number; action: string; reason: string; tag: string; tagColor: string }> = [];

        // 1. Check for urgent SOL deadlines
        const solUrgent = [
          { n: 14, name: 'Digital Asset Seizure (CFAA)', days: 159 },
        ];
        solUrgent.forEach(s => {
          if (s.days <= 180) actions.push({ priority: 95, action: 'File Section ' + s.n + ' claim before CFAA SOL expires in ' + s.days + ' days', reason: '2-year statute — shortest window in the case', tag: 'SOL RISK', tagColor: 'var(--red)' });
        });

        // 2. Check for ready motions not yet filed
        actions.push({ priority: 90, action: 'File TRO / Asset Freeze motion in NDCA — defendant actively dissipating assets via bridge wallet', reason: 'Every day of delay = potential asset loss. All declarations and forensic exhibits ready.', tag: 'MOTION', tagColor: 'var(--cyan)' });

        // 3. Evidence confidence gaps on load-bearing sections
        actions.push({ priority: 75, action: 'Obtain corroborating evidence for Section 12 (Embezzlement) — currently LOW confidence despite high strength', reason: 'Load-bearing section with 5 dependents. Single-source risk: if DHTY report is challenged, 5 other claims weaken.', tag: 'EVIDENCE', tagColor: 'var(--primary)' });

        // 4. BRD gap on critical criminal section
        actions.push({ priority: 70, action: 'Strengthen Section 15 (Money Laundering) from 88% to 95% BRD threshold', reason: '7% gap to Beyond Reasonable Doubt. Need: cross-chain tracing report from independent forensic firm.', tag: 'BRD GAP', tagColor: 'var(--red)' });

        // Sort by priority and pick the top one
        actions.sort((a, b) => b.priority - a.priority);
        const top = actions[0];
        return `<div style="font-size:11px">
          <span style="font-weight:700;color:var(--cyan)">NEXT BEST ACTION:</span>
          <span style="font-size:8px;padding:1px 6px;border-radius:3px;background:${top.tagColor}10;color:${top.tagColor};font-weight:700;margin:0 4px">${top.tag}</span>
          <span style="color:var(--text)">${top.action}</span>
        </div>
        <div style="font-size:9px;color:var(--text3);margin-top:2px">${top.reason}</div>
        ${actions.length > 1 ? '<div style="font-size:8px;color:var(--text3);margin-top:3px">+' + (actions.length - 1) + ' more recommended actions queued</div>' : ''}`;
      })()}
    </div>
  </div>

  <!-- Document Header -->
  <div class="doc-header">
    <div style="display:flex;justify-content:space-between;align-items:center">
      <div class="submitted">DOCUMENT SUBMITTED ${meta?.submitted || 'March 23, 2026'}</div>
      <div style="display:flex;gap:12px;font-size:9px;color:var(--text3)">
        <span>Last updated: <strong style="color:var(--text2)">${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</strong></span>
        <span style="display:flex;align-items:center;gap:4px"><span style="width:6px;height:6px;border-radius:50%;background:var(--green);animation:pulse 2s infinite"></span> Live</span>
      </div>
    </div>
    <h1>${meta?.title || 'THE KEN ZI WANG CRIME'}</h1>
    <div class="subtitle">${meta?.subtitle || 'THE KENZI FILES'} &mdash; Living Intelligence Document</div>
    <div class="doc-stats">
      <span><span class="stat-val">${sections.length}</span>crime sections</span>
      <span><span class="stat-val" id="stat-evidence">${Object.keys(graphs).length + Object.keys(allData).filter(k => k.startsWith('evidence/')).length}</span>evidence items</span>
      <span><span class="stat-val">${cases.length}</span>active cases</span>
      <span><span class="stat-val">4</span>jurisdictions</span>
    </div>
    <!-- Upcoming deadlines strip -->
    <div style="display:flex;gap:12px;margin-top:14px;flex-wrap:wrap">
      ${cases.sort((a, b) => new Date(a.next_deadline).getTime() - new Date(b.next_deadline).getTime()).slice(0, 4).map(c => {
        const d = daysUntil(c.next_deadline);
        const urgColor = d <= 3 ? 'var(--red)' : d <= 7 ? 'var(--orange)' : 'var(--text3)';
        return `<div style="font-size:10px;padding:6px 12px;border:1px solid var(--border);border-radius:6px;background:var(--surface);display:flex;gap:8px;align-items:center">
          <span style="font-weight:700;color:${urgColor}">${d}d</span>
          <span style="color:var(--text2)">${c.short_name} &mdash; ${c.next_deadline_desc}</span>
        </div>`;
      }).join('')}
    </div>
    <!-- Quick contacts -->
    <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap">
      ${[
        { name: 'Rocky Lee', email: 'rocky.lee@milliard.law', firm: 'Lead', color: '#b84233' },
        { name: 'Susanna', email: 'schenette@hansonbridgett.com', firm: 'NDCA', color: '#3b82f6' },
        { name: 'Matt', email: 'mmiller@hansonbridgett.com', firm: 'NDCA', color: '#3b82f6' },
        { name: 'Tarek', email: 'tarek@blkpartners.com', firm: 'Dubai', color: '#c47a4a' },
      ].map(p => `<a href="mailto:${p.email}" style="font-size:9px;padding:4px 10px;border:1px solid var(--border);border-radius:12px;color:var(--text2);text-decoration:none;display:inline-flex;align-items:center;gap:4px;transition:all .15s" onmouseover="this.style.borderColor='${p.color}';this.style.color='${p.color}'" onmouseout="this.style.borderColor='var(--border)';this.style.color='var(--text2)'"><span style="font-size:10px">&#x2709;</span> ${p.name} <span style="color:var(--text3)">(${p.firm})</span></a>`).join('')}
    </div>
  </div>

  <!-- Demo Bar (sticky) -->
  <div class="demo-bar">
    <button class="btn btn-primary" id="btn-trigger" onclick="triggerKenzi()">Simulate Rocky's Email</button>
    <button class="btn btn-secondary btn-sm" onclick="resetKenzi()">Reset</button>
    <span id="demo-status"></span>
    <span id="action-badge" style="display:none;padding:3px 10px;border-radius:10px;background:var(--red);color:#fff;font-size:10px;font-weight:700;animation:fadeIn .5s;cursor:pointer" onclick="document.getElementById('alert-banners').scrollIntoView({behavior:'smooth'})"></span>
    <div style="flex:1"></div>
    <button class="btn btn-secondary btn-sm" onclick="togglePanel('email-panel')">Attorney Emails</button>
    <button class="btn btn-secondary btn-sm" onclick="togglePanel('graph-toggle')">Graph View</button>
    <button class="btn btn-secondary btn-sm" onclick="togglePanel('tech-panel')">Technical</button>
    <a href="/clean" class="btn btn-secondary btn-sm" style="text-decoration:none;font-size:11px">New Case</a>
    <button class="btn btn-secondary btn-sm" onclick="exportBrief()" style="margin-left:4px" title="Copy case brief to clipboard">&#x1F4CB; Brief</button>
    <button class="btn btn-secondary btn-sm" onclick="printDocument()" title="Print document">&#x1F5A8;</button>
    <button class="btn btn-secondary btn-sm" onclick="toggleDarkMode()" id="dark-toggle" title="Toggle dark mode">&#x1F319;</button>
  </div>

  <!-- Namespace Isolation Indicator -->
  <div style="margin:0 48px 6px;padding:8px 16px;background:linear-gradient(90deg,rgba(90,138,90,.04),rgba(90,138,90,.08));border:1px solid rgba(90,138,90,.2);border-radius:8px;display:flex;align-items:center;gap:12px;font-size:10px">
    <span style="font-size:14px">&#128274;</span>
    <div style="display:flex;align-items:center;gap:6px">
      <span style="font-weight:700;color:var(--green);letter-spacing:0.5px">NAMESPACE:</span>
      <span style="font-family:var(--mono);color:var(--text);font-weight:600;padding:2px 8px;background:rgba(90,138,90,.08);border-radius:4px">kenzi-wang-2026</span>
    </div>
    <span style="color:var(--border)">|</span>
    <div style="display:flex;align-items:center;gap:4px">
      <span style="width:6px;height:6px;border-radius:50%;background:var(--green)"></span>
      <span style="color:var(--green);font-weight:600">Cryptographically Separated</span>
    </div>
    <span style="color:var(--border)">|</span>
    <div style="display:flex;align-items:center;gap:4px;color:var(--text3)">
      <span style="font-size:8px;font-weight:600;letter-spacing:0.5px">KEY FINGERPRINT:</span>
      <span style="font-family:var(--mono);font-size:9px;color:var(--text2)">a7:3f:b2:91:d4:0e:c8:56</span>
    </div>
    <div style="flex:1"></div>
    <span style="font-size:8px;color:var(--text3)">Per-case encryption &middot; Ethical wall enforced</span>
  </div>

  <!-- Email Preview (expandable context for the demo) -->
  <div id="email-preview-bar" style="margin:0 48px 8px;padding:12px 16px;background:var(--surface);border:1px solid var(--border);border-radius:8px;cursor:pointer;display:flex;align-items:center;gap:10px" onclick="var d=document.getElementById('email-preview-content');d.style.display=d.style.display==='none'?'block':'none'">
    <span style="font-size:16px">&#x2709;</span>
    <div style="flex:1">
      <div style="font-size:11px;font-weight:600">Incoming: Rocky Lee &mdash; Goopal CEO confirms no authorization</div>
      <div style="font-size:10px;color:var(--text3)">Click to preview the email that will be processed</div>
    </div>
    <span style="font-size:10px;color:var(--text3)">&#x25BC;</span>
  </div>
  <div id="email-preview-content" style="display:none;margin:0 48px 12px;padding:16px;background:var(--surface);border:1px solid var(--border);border-radius:8px;font-size:11px;color:var(--text2);line-height:1.7;max-height:400px;overflow-y:auto">
    <div style="margin-bottom:8px"><strong>From:</strong> Rocky Lee &lt;rocky.lee@milliard.law&gt;<br><strong>To:</strong> Susanna Chenette, Brad Bao, Fred Jin, Matt Miller, Martijn Broersma<br><strong>Date:</strong> March 23, 2026, 4:37 PM<br><strong>Subject:</strong> RE: [EXTERNAL] Re: ARTICLE re BRAD BAO</div>
    <div style="border-top:1px solid var(--border);padding-top:8px">We reached Goopal&rsquo;s CEO &mdash; and it appears that <strong>Goopal did not authorize the lawsuit</strong>. Vivian Liu owes shares to Goopal, and believes Cere owes her tokens &mdash; but <strong>Vivian does not know that it is Kenzi who took her tokens</strong>. Kenzi was the exclusive communicator with Vivian since Dec 2021. We have evidence Kenzi holds and controls these tokens.<br><br>The Goopal CEO unequivocally stated that he nor the company authorized this lawsuit. We confirmed in the BVI there is only one Goopal entity. This implicates <strong>potential fraud on the court, improper attorney conduct, and possible forgery of corporate authority</strong>.</div>
    <div style="border-top:1px dashed var(--border);margin-top:10px;padding-top:10px">
      <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:var(--primary);margin-bottom:6px">&#x1F50D; Why This Email Matters &mdash; Impact Preview</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:10px">
        <div><strong style="color:var(--text)">Sections affected:</strong><br>
          <span style="color:var(--text2)">&sect;16 Vivian Liu Token Theft &mdash; Vivian reclassified from adversary to victim<br>
          &sect;17 Criminal Syndicate &mdash; Kenzi manipulated Vivian as unwitting pawn<br>
          &sect;3 Aliases &mdash; Kenzi as sole communicator since Dec 2021<br>
          &sect;1 Fabrication &mdash; Pattern of impersonation and deception<br>
          &sect;12 Embezzlement &mdash; Token diversion scheme corroborated</span>
        </div>
        <div><strong style="color:var(--text)">Legal implications:</strong><br>
          <span style="color:var(--text2)">&bull; Fraud on the court (Goopal v. Jin may be unauthorized)<br>
          &bull; Anti-suit injunction now viable (no corporate authority)<br>
          &bull; Vivian becomes cooperating witness, not opposing party<br>
          &bull; Strengthens RICO enterprise theory (Kenzi controls all parties)<br>
          &bull; Affects all 7 cases across 4 jurisdictions</span>
        </div>
      </div>
      <div style="font-size:9px;color:var(--primary);margin-top:6px;font-weight:600">Click &ldquo;Simulate Rocky&rsquo;s Email&rdquo; above to watch the AI agents process this in real-time &rarr;</div>
    </div>
  </div>

  <!-- Process Log (hidden until triggered) -->
  <div class="log" id="process-log"></div>

  <!-- Alert Banners (appear when pipeline completes) -->
  <div id="alert-banners"></div>

  <!-- Email Preview Panel (hidden) -->
  <div class="email-panel" id="email-panel">
    <div class="email-grid">
      <div class="email-card" id="rocky-email"><p style="color:#999">Trigger the demo to see Rocky's personalized email.</p></div>
      <div class="email-card" id="susanna-email"><p style="color:#999">Trigger the demo to see Susanna's personalized email.</p></div>
    </div>
  </div>

  <!-- Graph Visualization -->
  <div class="graph-toggle" id="graph-toggle">
    <div style="font-size:11px;color:var(--text3);margin-bottom:8px">Click any claim node to see its evidence graph. Drag nodes to rearrange.</div>
    <div id="main-graph-container"></div>
  </div>

  <!-- Technical Panel (hidden) -->
  <div class="tech-panel" id="tech-panel">
    <div class="inspector" id="cubby-inspector">
      ${cubbyTree.map(t => `<div class="inspector-path" onclick="toggleCubby(this,'${t.path}')"><span class="ip-path">${t.path}</span></div>`).join('')}
    </div>
  </div>

  <!-- INTRODUCTION OVERLAY -->
  <div id="intro-overlay" style="position:fixed;inset:0;background:rgba(26,23,20,.6);z-index:300;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px)">
    <div style="background:var(--bg);border-radius:20px;max-width:600px;padding:40px 48px;border:1px solid var(--border);text-align:center">
      <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:var(--primary);margin-bottom:12px">Claim Intelligence Engine</div>
      <div style="font-family:var(--serif);font-size:28px;font-weight:700;margin-bottom:6px;line-height:1.2">The Ken Zi Wang Crime</div>
      <div style="font-size:13px;color:var(--text2);margin-bottom:24px">A living legal intelligence document &mdash; 18 crimes, 7 cases, 4 jurisdictions</div>

      <!-- Key numbers -->
      <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin-bottom:24px">
        <div style="padding:10px;border:1px solid var(--border);border-radius:8px"><div style="font-family:var(--serif);font-size:20px;font-weight:700;color:var(--red)">$267M</div><div style="font-size:8px;color:var(--text3)">Max Recovery</div></div>
        <div style="padding:10px;border:1px solid var(--border);border-radius:8px"><div style="font-family:var(--serif);font-size:20px;font-weight:700;color:var(--green)">7/7</div><div style="font-size:8px;color:var(--text3)">RICO Acts</div></div>
        <div style="padding:10px;border:1px solid var(--border);border-radius:8px"><div style="font-family:var(--serif);font-size:20px;font-weight:700">40+</div><div style="font-size:8px;color:var(--text3)">Exhibits</div></div>
        <div style="padding:10px;border:1px solid var(--border);border-radius:8px"><div style="font-family:var(--serif);font-size:20px;font-weight:700;color:var(--cyan)">5</div><div style="font-size:8px;color:var(--text3)">Motions Ready</div></div>
        <div style="padding:10px;border:1px solid var(--border);border-radius:8px"><div style="font-family:var(--serif);font-size:20px;font-weight:700;color:var(--primary)">4</div><div style="font-size:8px;color:var(--text3)">Jurisdictions</div></div>
      </div>

      <div style="text-align:left;font-size:11px;color:var(--text2);line-height:1.8;margin-bottom:24px;padding:16px;background:var(--surface);border-radius:8px;border:1px solid var(--border)">
        <div style="margin-bottom:6px"><strong style="color:var(--text)">This is a litigation command center:</strong></div>
        <div>&bull; <strong>Prosecution Strategy</strong> &mdash; AI-generated strategy narrative with RICO as primary theory</div>
        <div>&bull; <strong>Per-section analysis</strong> &mdash; burden of proof, SOL countdown, evidence admissibility (FRE), gap analysis</div>
        <div>&bull; <strong>Motion Readiness</strong> &mdash; 5 motions ready to file with dependencies and deadlines</div>
        <div>&bull; <strong>Risk Scenarios</strong> &mdash; 6 "what if" analyses with mitigations for trial prep</div>
        <div>&bull; <strong>Filter by readiness</strong> &mdash; Court-Ready / Near-Ready / Needs Work to triage sections</div>
        <div>&bull; <strong>Simulate evidence intake</strong> &mdash; click "Simulate Rocky&rsquo;s Email" to watch AI agents update the document live</div>
        <div>&bull; <strong>Press ?</strong> for keyboard shortcuts &middot; <strong>Click &#x1F3AC;</strong> for the 10-step demo guide</div>
      </div>

      <button onclick="document.getElementById('intro-overlay').style.display='none';localStorage.setItem('kenzi-intro-seen','1')" style="padding:12px 36px;font-size:14px;border-radius:24px;background:var(--text);color:var(--bg);border:none;cursor:pointer;font-family:var(--font);font-weight:600;transition:opacity .15s" onmouseover="this.style.opacity='0.85'" onmouseout="this.style.opacity='1'">Explore the Case &rarr;</button>
      <div style="margin-top:12px;font-size:9px;color:var(--text3)">Powered by Cere Network &middot; Sovereign AI Infrastructure</div>
    </div>
  </div>
  <script>if(localStorage.getItem('kenzi-intro-seen'))document.getElementById('intro-overlay').style.display='none';</script>

  <!-- THE DOCUMENT -->
  <div class="doc-body">
    <!-- Overall Case Score -->
    ${(() => {
      const allCl = Object.entries(allData).filter(([k]) => k.startsWith('claims/')).map(([,v]) => v as { strength?: number; elements?: Array<{ status: string }> });
      const avgStr = allCl.length > 0 ? Math.round(allCl.reduce((a, c) => a + (c.strength || 0), 0) / allCl.length * 100) : 0;
      const totalElements = allCl.reduce((a, c) => a + (c.elements?.length || 0), 0);
      const provenEl = allCl.reduce((a, c) => a + (c.elements?.filter(e => e.status === 'proven').length || 0), 0);
      const rating = avgStr >= 90 ? 'EXCELLENT' : avgStr >= 80 ? 'STRONG' : avgStr >= 65 ? 'MODERATE' : 'DEVELOPING';
      const ratingColor = avgStr >= 90 ? 'var(--green)' : avgStr >= 80 ? '#5a8a5e' : avgStr >= 65 ? 'var(--primary)' : 'var(--red)';
      const totalEv = Object.keys(allData).filter(k => k.startsWith('evidence/')).length;
      return `<div style="margin-bottom:24px;padding:24px 32px;background:var(--surface);border:1px solid var(--border);border-radius:16px;display:flex;align-items:center;gap:32px">
        <div style="text-align:center;min-width:120px;cursor:help" title="Average strength across ${allCl.length} claims. ${provenEl}/${totalElements} elements proven (${Math.round(provenEl/totalElements*100)}%). ${allCl.filter(c => (c.strength || 0) >= 0.9).length} claims above 90%. Computed from AI-scored evidence chains.">
          <div style="font-family:var(--serif);font-size:52px;font-weight:800;color:${ratingColor};line-height:1">${avgStr}</div>
          <div style="font-size:11px;font-weight:700;color:${ratingColor};letter-spacing:2px;margin-top:4px">${rating}</div>
          <div style="font-size:9px;color:var(--text3);margin-top:2px">Case Strength Score</div>
        </div>
        <div style="flex:1;border-left:1px solid var(--border);padding-left:24px">
          <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px;font-size:11px;color:var(--text2)">
            <div><span style="font-weight:700;color:var(--text);font-size:16px">${provenEl}</span><span style="color:var(--text3)">/${totalElements}</span><div style="font-size:9px;color:var(--text3)">Elements Proven</div></div>
            <div><span style="font-weight:700;color:var(--text);font-size:16px">${totalEv}</span><div style="font-size:9px;color:var(--text3)">Evidence Items</div></div>
            <div><span style="font-weight:700;color:var(--text);font-size:16px">7</span><span style="color:var(--green)">/7</span><div style="font-size:9px;color:var(--text3)">RICO Predicates</div></div>
            <div><span style="font-weight:700;color:var(--text);font-size:16px">3</span><div style="font-size:9px;color:var(--text3)">Independent Audits</div></div>
          </div>
          <div style="margin-top:12px;height:6px;background:var(--border);border-radius:3px;overflow:hidden">
            <div style="height:100%;width:${avgStr}%;background:${ratingColor};border-radius:3px;transition:width 1s"></div>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:8px;color:var(--text3);margin-top:4px">
            <span>0% — Insufficient</span>
            <span>50% — Developing</span>
            <span>75% — Strong</span>
            <span>100% — Airtight</span>
          </div>
          <!-- Litigation KPIs -->
          <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:12px;margin-top:14px;padding-top:12px;border-top:1px solid var(--border)">
            <div style="text-align:center;padding:6px;background:var(--bg);border-radius:6px">
              <div style="font-size:16px;font-weight:800;color:var(--green)">5</div>
              <div style="font-size:8px;color:var(--text3)">Motions Ready</div>
            </div>
            <div style="text-align:center;padding:6px;background:var(--bg);border-radius:6px">
              <div style="font-size:16px;font-weight:800;color:var(--green)">14</div>
              <div style="font-size:8px;color:var(--text3)">Meet Burden</div>
            </div>
            <div style="text-align:center;padding:6px;background:var(--bg);border-radius:6px">
              <div style="font-size:16px;font-weight:800;color:var(--red)">7</div>
              <div style="font-size:8px;color:var(--text3)">SOL Expired</div>
            </div>
            <div style="text-align:center;padding:6px;background:var(--bg);border-radius:6px">
              <div style="font-size:16px;font-weight:800;color:var(--primary)">$267M</div>
              <div style="font-size:8px;color:var(--text3)">Max Recovery</div>
            </div>
            <div style="text-align:center;padding:6px;background:var(--bg);border-radius:6px">
              <div style="font-size:16px;font-weight:800;color:var(--cyan)">4</div>
              <div style="font-size:8px;color:var(--text3)">Jurisdictions</div>
            </div>
          </div>
        </div>
      </div>`;
    })()}

    <!-- Table of Contents -->
    <div style="margin-bottom:24px;padding:20px;background:var(--surface);border:1px solid var(--border);border-radius:12px" id="toc">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
        <div style="font-family:var(--serif);font-size:16px;font-weight:700">Table of Contents</div>
        <button class="btn btn-secondary btn-sm" onclick="document.getElementById('toc-body').style.display=document.getElementById('toc-body').style.display==='none'?'block':'none'" style="font-size:9px">Toggle</button>
      </div>
      <div id="toc-body" style="column-count:2;column-gap:24px;font-size:11px;line-height:2">
        <div style="font-weight:700;color:var(--text3);font-size:9px;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Executive Brief</div>
        <div><a href="#" onclick="document.getElementById('exec-summary').scrollIntoView({behavior:'smooth'});return false" style="color:var(--text2);text-decoration:none;border-bottom:1px dotted var(--border)">Prosecution Strategy &amp; Executive Summary</a></div>
        <div><a href="#" onclick="document.querySelector('[data-section=\\'rico-tracker\\']')?.scrollIntoView({behavior:'smooth'})||document.getElementById('exec-summary').scrollIntoView({behavior:'smooth'});return false" style="color:var(--text2);text-decoration:none;border-bottom:1px dotted var(--border)">RICO Pattern Tracker (7 Predicate Acts)</a></div>
        <div style="font-weight:700;color:var(--text3);font-size:9px;text-transform:uppercase;letter-spacing:1px;margin-top:8px;margin-bottom:4px">Strategic Analysis</div>
        <div><a href="#" onclick="document.getElementById('sol-advisory').scrollIntoView({behavior:'smooth'});return false" style="color:var(--text2);text-decoration:none;border-bottom:1px dotted var(--border)"><span style="color:var(--red)">&#x23F0;</span> Statute of Limitations Advisory</a></div>
        <div><a href="#" onclick="document.getElementById('motion-tracker').scrollIntoView({behavior:'smooth'});return false" style="color:var(--text2);text-decoration:none;border-bottom:1px dotted var(--border)"><span style="color:var(--cyan)">&#x2696;</span> Motion Readiness Tracker (5 ready)</a></div>
        <div><a href="#" onclick="document.getElementById('damages-calc').scrollIntoView({behavior:'smooth'});return false" style="color:var(--text2);text-decoration:none;border-bottom:1px dotted var(--border)">Damages Calculation ($267.86M max)</a></div>
        <div><a href="#" onclick="document.getElementById('smoking-gun').scrollIntoView({behavior:'smooth'});return false" style="color:var(--text2);text-decoration:none;border-bottom:1px dotted var(--border)">Bridge Wallet — The Smoking Gun</a></div>
        <div><a href="#" onclick="document.getElementById('modus-operandi').scrollIntoView({behavior:'smooth'});return false" style="color:var(--text2);text-decoration:none;border-bottom:1px dotted var(--border)">Modus Operandi Pattern</a></div>
        <div><a href="#" onclick="document.getElementById('victims-witnesses').scrollIntoView({behavior:'smooth'});return false" style="color:var(--text2);text-decoration:none;border-bottom:1px dotted var(--border)">Victims &amp; Cooperating Witnesses</a></div>
        <div style="font-weight:700;color:var(--text3);font-size:9px;text-transform:uppercase;letter-spacing:1px;margin-top:8px;margin-bottom:4px">Appendices</div>
        <div><a href="#" onclick="document.getElementById('exhibit-index')?.scrollIntoView({behavior:'smooth'});return false" style="color:var(--text2);text-decoration:none;border-bottom:1px dotted var(--border)">Exhibit Index (${Object.keys(allData).filter(k => k.startsWith('evidence/')).length} items)</a></div>
        <div style="font-weight:700;color:var(--text3);font-size:9px;text-transform:uppercase;letter-spacing:1px;margin-top:8px;margin-bottom:4px">Facts &amp; Evidence (18 Sections)</div>
        ${sections.map(sec => {
          const cId = sectionToClaimMap[String(sec.number)];
          const cl = cId ? allData['claims/' + cId] as { strength?: number } | undefined : undefined;
          const str = cl?.strength ? Math.round(cl.strength * 100) : 0;
          return `<div><a href="#" onclick="toggleSection('${sec.id}');document.getElementById('${sec.id}').scrollIntoView({behavior:'smooth'});return false" style="color:var(--text2);text-decoration:none;border-bottom:1px dotted var(--border)">${sec.number}. ${sec.title} <span style="color:${str >= 90 ? 'var(--green)' : str >= 70 ? 'var(--primary)' : 'var(--text3)'};font-weight:600">(${str}%)</span></a></div>`;
        }).join('')}
      </div>
    </div>

    <!-- Executive Summary -->
    <div id="exec-summary"></div>
    <div style="margin-bottom:24px;padding:24px;background:var(--surface);border:1px solid var(--border);border-radius:12px">
      <div style="font-family:var(--serif);font-size:20px;font-weight:700;margin-bottom:12px">Executive Summary</div>
      <!-- Case strategy narrative -->
      <div style="padding:14px 18px;background:linear-gradient(135deg,rgba(26,23,20,.03),rgba(196,122,74,.04));border:1px solid rgba(196,122,74,.15);border-radius:10px;margin-bottom:16px">
        <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:var(--primary);margin-bottom:6px">Recommended Prosecution Strategy</div>
        <div style="font-family:var(--serif);font-size:14px;color:var(--text);line-height:1.7">
          ${(() => {
            const totalEvidence = Object.keys(allData).filter(k => k.startsWith('evidence/')).length;
            const provenClaims = sections.filter(sec => {
              const cid = sectionToClaimMap[String(sec.number)];
              const cl = cid ? allData['claims/' + cid] as { strength?: number } | undefined : undefined;
              return cl && cl.strength && cl.strength >= 0.51;
            }).length;
            const brdMet = sections.filter(sec => {
              const cid = sectionToClaimMap[String(sec.number)];
              const cl = cid ? allData['claims/' + cid] as { strength?: number } | undefined : undefined;
              const isCrim = [2,4,8,12,13,14,15,17].includes(sec.number);
              return cl && cl.strength && cl.strength >= (isCrim ? 0.95 : 0.51);
            }).length;
            return 'Lead with <strong>RICO (18 U.S.C. &sect; 1961-1968)</strong> as the primary theory &mdash; it preserves 7 time-barred state claims as predicate acts and unlocks treble damages. ' +
              'The bridge wallet forensics (Section 16) and DHTY audit (Section 12) provide the strongest evidentiary foundation. ' +
              'Of ' + sections.length + ' claims, <strong>' + provenClaims + ' meet their burden of proof</strong> today (' + brdMet + ' including criminal BRD standard). ' +
              'Prioritize closing the ' + (sections.length - brdMet) + ' remaining gaps before the <strong>Feb 2028 RICO SOL deadline</strong>. ' +
              'The realistic settlement corridor is <strong>$15-45M</strong> given defendant&rsquo;s known assets across UAE, US, and BVI jurisdictions. ' +
              'Coordinate filings across all 4 jurisdictions simultaneously to prevent asset flight.';
          })()}
        </div>
      </div>
      <div style="font-size:13px;color:var(--text2);line-height:1.7;margin-bottom:16px">
        This document presents ${sections.length} categories of documented illegal conduct against the defendant, supported by ${Object.keys(allData).filter(k => k.startsWith('evidence/')).length} evidence items across ${cases.length} active proceedings in 4 jurisdictions. Every assertion is backed by on-chain forensic analysis, court filings, independent investigations, and cooperating witness testimony.
      </div>
      <!-- Defendant profile -->
      <div style="padding:16px;background:var(--bg);border:1px solid var(--border);border-radius:8px;margin-bottom:16px;display:grid;grid-template-columns:auto 1fr;gap:16px">
        <div style="width:56px;height:56px;border-radius:50%;background:var(--red);color:#fff;display:flex;align-items:center;justify-content:center;font-family:var(--serif);font-size:22px;font-weight:700">KW</div>
        <div>
          <div style="font-family:var(--serif);font-size:18px;font-weight:700">Ken Zi Wang <span style="font-weight:400;color:var(--text3);font-size:14px">a.k.a. "Kenzi Wang"</span></div>
          <div style="font-size:11px;color:var(--text2);margin-top:4px;display:flex;flex-wrap:wrap;gap:6px">
            <span style="padding:2px 8px;background:rgba(184,66,51,.08);color:var(--red);border-radius:4px;font-weight:600">PASSPORT SEIZED</span>
            <span style="padding:2px 8px;background:rgba(184,66,51,.08);color:var(--red);border-radius:4px;font-weight:600">TRAVEL BAN</span>
            <span style="padding:2px 8px;background:rgba(196,122,74,.08);color:var(--primary);border-radius:4px">Dubai, UAE</span>
          </div>
          <div style="font-size:10px;color:var(--text3);margin-top:8px;line-height:1.6">
            <strong>Known aliases:</strong> Kenzi Nakamura, Miles Archer, @0xkenzi, @GPTAutist, @macrokenzi &middot;
            <strong>Criminal record:</strong> Grand Theft 487(a) CA &middot;
            <strong>Pattern:</strong> Fabricate credentials &rarr; embed in target &rarr; extract value &rarr; extort when caught &rarr; weaponize legal system
          </div>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px">
        ${(() => {
          const allClaims = Object.entries(allData).filter(([k]) => k.startsWith('claims/')).map(([,v]) => v as { title: string; strength: number; evidence_chain?: string[] });
          const avgStrength = allClaims.length > 0 ? Math.round(allClaims.reduce((a, c) => a + (c.strength || 0), 0) / allClaims.length * 100) : 0;
          const strongClaims = allClaims.filter(c => (c.strength || 0) >= 0.9).length;
          const totalEvidence = Object.keys(allData).filter(k => k.startsWith('evidence/')).length;
          const strongestClaim = allClaims.sort((a, b) => (b.strength || 0) - (a.strength || 0))[0];
          return `
            <div style="text-align:center;padding:12px;border:1px solid var(--border);border-radius:8px">
              <div style="font-family:var(--serif);font-size:28px;font-weight:700;color:var(--green)">${avgStrength}%</div>
              <div style="font-size:10px;color:var(--text3);margin-top:2px">Average Claim Strength</div>
            </div>
            <div style="text-align:center;padding:12px;border:1px solid var(--border);border-radius:8px">
              <div style="font-family:var(--serif);font-size:28px;font-weight:700;color:var(--primary)">${strongClaims}/${allClaims.length}</div>
              <div style="font-size:10px;color:var(--text3);margin-top:2px">Claims at 90%+ Strength</div>
            </div>
            <div style="text-align:center;padding:12px;border:1px solid var(--border);border-radius:8px">
              <div style="font-family:var(--serif);font-size:28px;font-weight:700">${totalEvidence}</div>
              <div style="font-size:10px;color:var(--text3);margin-top:2px">Evidence Items</div>
            </div>
            <div style="text-align:center;padding:12px;border:1px solid var(--border);border-radius:8px">
              <div style="font-family:var(--serif);font-size:28px;font-weight:700;color:var(--red)">${cases.length}</div>
              <div style="font-size:10px;color:var(--text3);margin-top:2px">Active Proceedings</div>
            </div>
          `;
        })()}
      </div>
      <!-- Damages summary -->
      <div style="margin-top:16px;padding:16px;background:var(--bg);border-radius:8px;border:1px solid var(--border)">
        <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:var(--text3);margin-bottom:10px">Documented Damages</div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px">
          <div>
            <div style="font-family:var(--serif);font-size:22px;font-weight:700;color:var(--red)">$4.87M</div>
            <div style="font-size:11px;color:var(--text2);margin-top:2px">Embezzled from 79 investors via wallet substitution scheme (DHTY + Ascent confirmed)</div>
          </div>
          <div>
            <div style="font-family:var(--serif);font-size:22px;font-weight:700;color:var(--red)">$198M</div>
            <div style="font-size:11px;color:var(--text2);margin-top:2px">Market cap destruction from sabotage campaign, social media hijacking, and token dumping</div>
          </div>
          <div>
            <div style="font-family:var(--serif);font-size:22px;font-weight:700;color:var(--red)">$40M+</div>
            <div style="font-size:11px;color:var(--text2);margin-top:2px">Additional victim claims (Vijay Garg / Inclusion Capital, Dylan Dewdney / RAZE Network)</div>
          </div>
        </div>
        <div style="font-size:11px;color:var(--text3);margin-top:10px;text-align:right">8+ identified victims &middot; $58M+ aggregate claims in active proceedings</div>
      </div>
      <!-- Damages breakdown by section & recovery theory -->
      <div id="damages-calc" style="margin-top:8px;padding:14px 16px;background:var(--surface);border-radius:8px;border:1px solid var(--border)">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
          <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:var(--text3)">Damages Calculation &mdash; Recovery Theories</div>
          <span style="font-size:8px;padding:2px 8px;border-radius:10px;background:rgba(184,66,51,.06);color:var(--red);font-weight:600">FOR COUNSEL USE ONLY</span>
        </div>
        <table style="width:100%;font-size:10px;border-collapse:collapse">
          <thead>
            <tr style="border-bottom:2px solid var(--border);text-align:left">
              <th style="padding:4px 8px;color:var(--text3);font-weight:600;font-size:9px">#</th>
              <th style="padding:4px 8px;color:var(--text3);font-weight:600;font-size:9px">Category</th>
              <th style="padding:4px 8px;color:var(--text3);font-weight:600;font-size:9px;text-align:right">Direct</th>
              <th style="padding:4px 8px;color:var(--text3);font-weight:600;font-size:9px;text-align:right">Multiplier</th>
              <th style="padding:4px 8px;color:var(--text3);font-weight:600;font-size:9px;text-align:right">Total</th>
              <th style="padding:4px 8px;color:var(--text3);font-weight:600;font-size:9px">Theory</th>
            </tr>
          </thead>
          <tbody>
            ${[
              { n: 2, cat: 'Grand Theft (laptop + IP)', direct: '$0.15M', mult: '1x', total: '$0.15M', theory: 'Cal. Penal Code &sect; 487' },
              { n: 12, cat: 'Embezzlement (79 investors)', direct: '$4.87M', mult: '3x RICO', total: '$14.61M', theory: '18 U.S.C. &sect; 1964(c) treble' },
              { n: 6, cat: '$3M Stablecoin Theft', direct: '$3.00M', mult: '3x RICO', total: '$9.00M', theory: '18 U.S.C. &sect; 1964(c) treble' },
              { n: 16, cat: 'Vivian Liu Token Theft', direct: '$0.20M', mult: '3x RICO', total: '$0.60M', theory: '18 U.S.C. &sect; 1964(c) treble' },
              { n: 15, cat: 'Ponzi/Laundering (bridge wallet)', direct: '$1.50M', mult: '2x', total: '$3.00M', theory: '18 U.S.C. &sect; 1956 forfeiture' },
              { n: 14, cat: 'Digital Asset Seizure', direct: '$0.50M', mult: '1x', total: '$0.50M', theory: '18 U.S.C. &sect; 1030(g) CFAA' },
              { n: 4, cat: 'Market Manipulation Losses', direct: '$198.0M', mult: '1x', total: '$198.0M', theory: '28 U.S.C. &sect; 1658(b)' },
              { n: 17, cat: 'Additional Victim Claims', direct: '$40.0M', mult: '1x', total: '$40.0M', theory: 'Dubai DIFC Courts' },
              { n: 8, cat: 'Emotional Distress / Extortion', direct: '$2.0M', mult: '1x', total: '$2.0M', theory: 'Cal. Civ. Code &sect; 52.1' },
            ].map(d => `<tr style="border-bottom:1px solid var(--border)">
              <td style="padding:4px 8px;color:var(--text3)">${d.n}</td>
              <td style="padding:4px 8px;color:var(--text)">${d.cat}</td>
              <td style="padding:4px 8px;text-align:right;font-family:var(--mono);font-weight:600">${d.direct}</td>
              <td style="padding:4px 8px;text-align:right;color:${d.mult.includes('3x') ? 'var(--red)' : d.mult.includes('2x') ? 'var(--primary)' : 'var(--text3)'};font-weight:600">${d.mult}</td>
              <td style="padding:4px 8px;text-align:right;font-family:var(--mono);font-weight:700;color:var(--text)">${d.total}</td>
              <td style="padding:4px 8px;font-size:8px;color:var(--text3)">${d.theory}</td>
            </tr>`).join('')}
            <tr style="border-top:2px solid var(--text)">
              <td colspan="4" style="padding:6px 8px;font-weight:700;color:var(--text)">Maximum Recoverable (all theories)</td>
              <td style="padding:6px 8px;text-align:right;font-family:var(--mono);font-weight:800;font-size:13px;color:var(--red)">$267.86M</td>
              <td style="padding:6px 8px;font-size:8px;color:var(--text3)">Includes RICO treble</td>
            </tr>
            <tr>
              <td colspan="4" style="padding:4px 8px;font-weight:600;color:var(--text2)">Conservative (direct damages only)</td>
              <td style="padding:4px 8px;text-align:right;font-family:var(--mono);font-weight:700;color:var(--text)">$250.22M</td>
              <td style="padding:4px 8px;font-size:8px;color:var(--text3)">Without multipliers</td>
            </tr>
            <tr>
              <td colspan="4" style="padding:4px 8px;font-weight:600;color:var(--text2)">Realistic settlement range</td>
              <td style="padding:4px 8px;text-align:right;font-family:var(--mono);font-weight:700;color:var(--primary)">$15-45M</td>
              <td style="padding:4px 8px;font-size:8px;color:var(--text3)">Based on defendant assets</td>
            </tr>
          </tbody>
        </table>
        <div style="font-size:8px;color:var(--text3);margin-top:8px;line-height:1.4;padding-top:8px;border-top:1px solid var(--border)">
          <strong>Note:</strong> RICO treble damages (3x) apply under 18 U.S.C. &sect; 1964(c) to any injury "by reason of" a RICO violation. Market cap damage ($198M) is listed at 1x pending expert testimony on proximate causation. Forfeiture under &sect; 1956 is 2x (double the laundered amount). Settlement range reflects estimated realizable assets across jurisdictions. Attorney&rsquo;s fees recoverable under RICO.
        </div>
      </div>
      <!-- Evidence by type -->
      <div style="margin-top:12px;padding:14px 16px;background:var(--bg);border-radius:8px;border:1px solid var(--border)">
        <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:var(--text3);margin-bottom:8px">Evidence Portfolio</div>
        <div style="display:flex;gap:16px;flex-wrap:wrap;font-size:11px">
          ${(() => {
            const typeCounts: Record<string, number> = {};
            Object.entries(allData).filter(([k]) => k.startsWith('evidence/')).forEach(([, v]) => {
              const ev = v as { type?: string };
              const t = ev.type || 'unknown';
              typeCounts[t] = (typeCounts[t] || 0) + 1;
            });
            const typeLabels: Record<string, { icon: string; label: string }> = {
              'screenshot': { icon: '&#x1F4F7;', label: 'Screenshots' },
              'report': { icon: '&#x1F50D;', label: 'Forensic Reports' },
              'blockchain_tx': { icon: '&#x26D3;', label: 'On-Chain Records' },
              'filing': { icon: '&#x1F4C4;', label: 'Court Filings' },
              'declaration': { icon: '&#x1F4DC;', label: 'Declarations' },
              'email': { icon: '&#x2709;', label: 'Email Evidence' },
              'invoice': { icon: '&#x1F4B3;', label: 'Financial Docs' },
            };
            return Object.entries(typeCounts)
              .sort(([,a], [,b]) => b - a)
              .map(([type, count]) => {
                const info = typeLabels[type] || { icon: '&#x1F4CE;', label: type };
                return '<span style="display:flex;align-items:center;gap:4px"><span>' + info.icon + '</span><strong>' + count + '</strong> ' + info.label + '</span>';
              }).join('');
          })()}
        </div>
      </div>
    </div>

    <!-- RICO Pattern Tracker -->
    <div style="margin-bottom:24px;padding:20px;background:var(--surface);border:1px solid var(--border);border-radius:12px;border-left:4px solid var(--red)">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
        <div>
          <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:var(--red)">RICO Pattern Tracker</div>
          <div style="font-size:11px;color:var(--text2);margin-top:2px">18 U.S.C. &sect;&sect; 1961-1968 &mdash; Requires &ge;2 predicate acts within 10 years</div>
        </div>
        <div style="text-align:center;padding:8px 16px;background:rgba(90,138,90,.06);border-radius:8px;border:1px solid rgba(90,138,90,.15)">
          <div style="font-family:var(--serif);font-size:24px;font-weight:700;color:var(--green)">7</div>
          <div style="font-size:9px;color:var(--text3)">Predicate Acts</div>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">
        ${[
          { act: 'Wire fraud — $4.87M investor fund diversion via DocuSign SAFTs', section: 12, status: 'proven', evidence: 'DHTY + Ascent forensics' },
          { act: 'Securities fraud — $26.3M Reg D offering without broker registration', section: 18, status: 'proven', evidence: 'Republic records + AU21 materials' },
          { act: 'Theft — 33.3M CERE tokens from Vivian Liu via wallet substitution', section: 16, status: 'proven', evidence: 'BIG forensic report + on-chain records' },
          { act: 'Extortion — 8-month coercion campaign extracting $2.49M + 18.8% equity', section: 8, status: 'proven', evidence: 'Facebook Messenger screenshots' },
          { act: 'Money laundering — stolen proceeds routed to Symbolic Ventures ($50M fund)', section: 15, status: 'proven', evidence: 'Fund formation records + RAZE/SKYRIM traces' },
          { act: 'Market manipulation — coordinated pump-and-dump of CERE tokens', section: 4, status: 'proven', evidence: 'Messenger logs + on-chain LD Capital payout' },
          { act: 'Obstruction — systematic destruction of evidence across platforms', section: 13, status: 'proven', evidence: 'Deleted messages + revoked access logs' },
        ].map(p => `<div style="padding:8px 12px;background:var(--bg);border-radius:6px;border-left:3px solid var(--green);display:flex;gap:8px;align-items:start;font-size:11px" onclick="toggleSection('section-${p.section}');document.getElementById('section-${p.section}').scrollIntoView({behavior:'smooth'})" style="cursor:pointer">
          <span style="color:var(--green);font-size:13px;flex-shrink:0">&#x2705;</span>
          <div>
            <div style="font-weight:600;color:var(--text)">${p.act}</div>
            <div style="font-size:9px;color:var(--text3);margin-top:2px">${p.evidence} &middot; <span style="cursor:pointer;color:var(--primary)" onclick="event.stopPropagation();toggleSection('section-${p.section}');document.getElementById('section-${p.section}').scrollIntoView({behavior:'smooth'})">Section ${p.section} &rarr;</span></div>
          </div>
        </div>`).join('')}
      </div>
      <div style="margin-top:12px;font-size:10px;color:var(--text2);line-height:1.5;padding:10px;background:rgba(90,138,90,.04);border-radius:6px">
        <strong style="color:var(--green)">RICO threshold exceeded:</strong> 7 proven predicate acts across an 8-year period (2018-2026). Minimum requirement is 2 acts within 10 years. The enterprise (Section 17) spans San Francisco, Dubai, Beijing, and Singapore. Multiple victims confirm identical modus operandi.
      </div>
    </div>

    <!-- SOL Strategy Advisory -->
    <div id="sol-advisory" style="margin-bottom:24px;padding:16px 20px;background:rgba(184,66,51,.03);border:1px solid rgba(184,66,51,.12);border-radius:12px;border-left:4px solid var(--red)">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
        <span style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:var(--red)">&#x23F0; Statute of Limitations Advisory</span>
        <span style="font-size:9px;padding:2px 8px;border-radius:10px;background:rgba(184,66,51,.08);color:var(--red);font-weight:600">7 claims at risk</span>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
        <div style="padding:10px;background:rgba(184,66,51,.04);border-radius:8px">
          <div style="font-size:9px;font-weight:700;color:var(--red);margin-bottom:4px">EXPIRED STANDALONE</div>
          <div style="font-size:10px;color:var(--text2);line-height:1.5">Sections 1 (Fabrication), 2 (Grand Theft), 3 (Aliases), 5 (Reputational Taint), 8 (Extortion), 9 (Term Sheet), 18 (Broker-Dealer) &mdash; standalone SOLs have lapsed under state statutes.</div>
        </div>
        <div style="padding:10px;background:rgba(90,138,90,.04);border-radius:8px">
          <div style="font-size:9px;font-weight:700;color:var(--green);margin-bottom:4px">PRESERVED VIA RICO</div>
          <div style="font-size:10px;color:var(--text2);line-height:1.5">All 7 expired claims survive as <strong>predicate acts</strong> under 18 U.S.C. &sect; 1964(c). Civil RICO SOL runs 4 years from pattern discovery (Feb 2024) &rarr; expires <strong>Feb 2028</strong>. Federal wire fraud (10-year SOL) independently preserves the financial crimes.</div>
        </div>
      </div>
      <div style="font-size:10px;color:var(--text);line-height:1.5;padding:8px 12px;background:var(--surface);border-radius:6px;border:1px solid var(--border)">
        <strong>Strategic implication:</strong> The RICO enterprise theory is not optional &mdash; it is the <em>only</em> mechanism keeping 7 of 18 claims actionable. If Section 17 (Criminal Syndicate) or the predicate act pattern weakens, those claims die permanently. Prioritize evidence strengthening for Sections 12, 15, 16, and 17 which anchor the federal charges.
      </div>
    </div>

    <!-- Motion Readiness Tracker -->
    <div id="motion-tracker" style="margin-bottom:24px;padding:20px;background:var(--surface);border:1px solid var(--border);border-radius:12px;border-left:4px solid var(--cyan)">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
        <div>
          <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:var(--cyan)">&#x2696; Motion Readiness Tracker</div>
          <div style="font-size:11px;color:var(--text2);margin-top:2px">Pre-trial motions available based on current evidence strength</div>
        </div>
        <div style="text-align:center;padding:6px 12px;background:rgba(90,138,138,.06);border-radius:8px;border:1px solid rgba(90,138,138,.15)">
          <div style="font-family:var(--serif);font-size:20px;font-weight:700;color:var(--cyan)">5</div>
          <div style="font-size:8px;color:var(--text3)">Ready to File</div>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
        ${[
          { motion: 'TRO / Asset Freeze', court: 'NDCA', status: 'ready', urgency: 'critical', basis: 'Defendant actively dissipating assets. Bridge wallet + Dubai bank accounts.', sections: [12, 15, 16], deps: 'Requires: Declaration + forensic exhibits. All available.' },
          { motion: 'Preliminary Injunction — Social Media', court: 'NDCA', status: 'ready', urgency: 'high', basis: 'Defendant operating hijacked @cerenetwork (105K followers). Ongoing irreparable harm.', sections: [14], deps: 'Requires: Ownership proof + harm declaration. Ready.' },
          { motion: 'Anti-Suit Injunction', court: 'NDCA', status: 'ready', urgency: 'high', basis: 'Block Goopal v. Jin (unauthorized filing). Rocky Lee email confirms no CEO authorization.', sections: [16], deps: 'Requires: Rocky Lee declaration. Obtainable.' },
          { motion: 'Motion to Compel Discovery', court: 'NDCA', status: 'ready', urgency: 'medium', basis: 'KuCoin, Gate.io exchange records + Telegram server-side message recovery.', sections: [4, 13, 16], deps: 'Requires: Subpoena duces tecum. Draft ready.' },
          { motion: 'Summary Judgment — Term Sheet Void', court: 'Delaware', status: 'ready', urgency: 'medium', basis: 'Term Sheet signed under documented duress. Total non-performance by Kenzi.', sections: [9, 10], deps: 'Requires: Expert declaration on duress + damages calc. Available.' },
          { motion: 'RICO Enterprise Complaint', court: 'NDCA', status: 'preparing', urgency: 'high', basis: '7 predicate acts proven. Enterprise structure documented across 4 jurisdictions.', sections: [17, 12, 15, 16], deps: 'Needs: Finalize expert witness designations + case statement.' },
          { motion: 'Dubai DIFC Enforcement', court: 'Dubai', status: 'preparing', urgency: 'medium', basis: 'Vijay Garg $40M claim. Passport already seized by Dubai authorities.', sections: [8, 17], deps: 'Needs: DIFC counsel engagement + translated exhibits.' },
        ].map(m => {
          const urgColor = m.urgency === 'critical' ? 'var(--red)' : m.urgency === 'high' ? 'var(--primary)' : 'var(--text3)';
          const stColor = m.status === 'ready' ? 'var(--green)' : 'var(--primary)';
          return '<div style="padding:10px 12px;background:var(--bg);border-radius:8px;border-left:3px solid ' + stColor + '">' +
            '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">' +
              '<span style="font-size:11px;font-weight:700;color:var(--text)">' + m.motion + '</span>' +
              '<div style="display:flex;gap:4px">' +
                '<span style="font-size:7px;padding:1px 5px;border-radius:3px;background:' + urgColor + '15;color:' + urgColor + ';font-weight:600;text-transform:uppercase">' + m.urgency + '</span>' +
                '<span style="font-size:7px;padding:1px 5px;border-radius:3px;background:' + stColor + '15;color:' + stColor + ';font-weight:600;text-transform:uppercase">' + m.status + '</span>' +
              '</div>' +
            '</div>' +
            '<div style="font-size:9px;color:var(--text2);line-height:1.4">' + m.basis + '</div>' +
            '<div style="font-size:8px;color:var(--text3);margin-top:3px">' + m.court + ' &middot; Sections ' + m.sections.join(', ') + '</div>' +
            '<div style="font-size:8px;color:' + (m.status === 'ready' ? 'var(--green)' : 'var(--primary)') + ';margin-top:2px">' + m.deps + '</div>' +
          '</div>';
        }).join('')}
      </div>
    </div>

    <!-- The Smoking Gun: Bridge Wallet -->
    <div id="smoking-gun" style="margin-bottom:24px;padding:20px;background:var(--surface);border:1px solid var(--border);border-radius:12px;border-left:4px solid var(--primary)">
      <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:var(--primary);margin-bottom:14px">&#x1F52B; The Smoking Gun &mdash; Bridge Wallet 0xb08f...</div>
      <div style="font-size:12px;color:var(--text2);line-height:1.6;margin-bottom:16px">
        A single bridge wallet connects three separate token thefts to the same perpetrator. BIG forensic report (Feb 2026) proved Kenzi&rsquo;s personal wallet funded this bridge wallet with ETH gas.
      </div>
      <!-- Chain visualization -->
      <div style="display:flex;align-items:center;justify-content:center;gap:0;flex-wrap:wrap;padding:16px;background:var(--bg);border-radius:8px;border:1px solid var(--border)">
        <div style="text-align:center;padding:12px 16px">
          <div style="font-family:var(--serif);font-size:18px;font-weight:700;color:var(--red)">33.3M</div>
          <div style="font-size:10px;font-weight:600">CERE tokens</div>
          <div style="font-size:9px;color:var(--text3)">Stolen from Vivian Liu</div>
          <div style="font-size:8px;color:var(--text3);margin-top:2px">Dumped on KuCoin</div>
          <div style="font-size:8px;color:var(--text3)">Jan 7-8, 2024</div>
        </div>
        <div style="font-size:20px;color:var(--primary);padding:0 8px">&rarr;</div>
        <div style="text-align:center;padding:16px 20px;background:var(--surface);border:2px solid var(--primary);border-radius:12px">
          <div style="font-size:9px;font-weight:700;color:var(--primary);letter-spacing:1px;margin-bottom:4px">BRIDGE WALLET</div>
          <div style="font-family:var(--mono);font-size:11px;color:var(--text)">0xb08f...9f00</div>
          <div style="font-size:9px;color:var(--text3);margin-top:4px">Funded by Kenzi&rsquo;s</div>
          <div style="font-size:9px;color:var(--text3)">personal wallet</div>
          <div style="font-family:var(--mono);font-size:8px;color:var(--text3)">(0x0d07...92fe)</div>
        </div>
        <div style="font-size:20px;color:var(--primary);padding:0 8px">&larr;</div>
        <div style="text-align:center;padding:12px 16px">
          <div style="display:flex;gap:16px">
            <div>
              <div style="font-family:var(--serif);font-size:18px;font-weight:700;color:var(--red)">30.6M</div>
              <div style="font-size:10px;font-weight:600">RAZE tokens</div>
              <div style="font-size:9px;color:var(--text3)">Stolen from Dylan</div>
            </div>
            <div>
              <div style="font-family:var(--serif);font-size:18px;font-weight:700;color:var(--red)">5.3M</div>
              <div style="font-size:10px;font-weight:600">SKYRIM tokens</div>
              <div style="font-size:9px;color:var(--text3)">AU21 allocation</div>
            </div>
          </div>
          <div style="font-size:8px;color:var(--text3);margin-top:4px">Received 3 days after CERE dump</div>
          <div style="font-size:8px;color:var(--text3)">Sold via Gate.io (Chandler Guo)</div>
        </div>
      </div>
      <div style="display:flex;justify-content:space-between;margin-top:12px;font-size:10px">
        <span style="color:var(--text3)">Source: Blockchain Intelligence Group forensic report, Feb 13, 2026</span>
        <span style="color:var(--primary);cursor:pointer" onclick="toggleSection('section-16');document.getElementById('section-16').scrollIntoView({behavior:'smooth'})">Full analysis in Section 16 &rarr;</span>
      </div>
    </div>

    <!-- Modus Operandi Pattern -->
    <div id="modus-operandi" style="margin-bottom:24px;padding:20px;background:var(--surface);border:1px solid var(--border);border-radius:12px">
      <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:var(--text3);margin-bottom:14px">Modus Operandi &mdash; Identical Pattern Across All Victims</div>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:0">
        ${[
          { step: 1, title: 'Infiltrate', icon: '&#x1F3AD;', desc: 'Fabricate credentials (Columbia, Wharton, a16z). Gain trust. Position as "expert fundraiser."', color: '#c47a4a', victims: 'Cere, Kylin, Inclusion Capital, RAZE, SuperBloom' },
          { step: 2, title: 'Embed', icon: '&#x1F50C;', desc: 'Obtain access to wallets, social media, email, token distribution lists. Become sole intermediary.', color: '#b84233', victims: 'All victims report identical access seizure' },
          { step: 3, title: 'Extract', icon: '&#x1F4B0;', desc: 'Divert funds via wallet substitution. Pump-and-dump tokens. Redirect investor payments to personal wallets.', color: '#b84233', victims: '$4.87M Cere + $10.9M Dylan + $40M Vijay' },
          { step: 4, title: 'Retaliate', icon: '&#x2694;', desc: 'When caught: extort, threaten, file retaliatory lawsuits via fabricated identities. Weaponize victims as plaintiffs.', color: '#b84233', victims: 'Goopal RICO, Josef Qu, Delaware filing' },
        ].map((s, i) => `<div style="padding:16px;text-align:center;${i < 3 ? 'border-right:1px solid var(--border);' : ''}position:relative">
          <div style="font-size:24px;margin-bottom:8px">${s.icon}</div>
          <div style="font-size:9px;color:var(--text3);font-weight:700;letter-spacing:1px">STEP ${s.step}</div>
          <div style="font-family:var(--serif);font-size:15px;font-weight:700;margin:4px 0">${s.title}</div>
          <div style="font-size:10px;color:var(--text2);line-height:1.5;margin-bottom:8px">${s.desc}</div>
          <div style="font-size:8px;color:var(--text3);padding:4px 8px;background:var(--bg);border-radius:4px;display:inline-block">${s.victims}</div>
          ${i < 3 ? '<div style="position:absolute;right:-8px;top:50%;transform:translateY(-50%);font-size:14px;color:var(--primary);z-index:1;background:var(--surface);padding:2px">&rarr;</div>' : ''}
        </div>`).join('')}
      </div>
      <div style="margin-top:12px;font-size:10px;color:var(--text2);text-align:center;font-style:italic">
        "Tell a big story, get you to sign an agreement, then starts exhausting your positive energy and ultimately shakes you down." &mdash; Vijay Garg
      </div>
    </div>

    <!-- Victims & Witnesses -->
    <div id="victims-witnesses" style="margin-bottom:24px;padding:20px;background:var(--surface);border:1px solid var(--border);border-radius:12px">
      <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:var(--text3);margin-bottom:12px">Victims &amp; Cooperating Witnesses</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px">
        ${[
          { name: 'Cere Network / Fred Jin', role: 'Primary Victim', loss: '$4.87M embezzled + $198M market cap', status: 'active', icon: '&#x1F3E2;' },
          { name: 'Dylan Dewdney', role: 'RAZE / Kylin Network', loss: '$10.9M+ (NFT3/Root treasury seized)', status: 'cooperating', icon: '&#x1F464;' },
          { name: 'Vijay Garg', role: 'Inclusion Capital', loss: '$40M claim filed in Dubai', status: 'cooperating', icon: '&#x1F464;' },
          { name: 'Vivian Liu / Goopal', role: 'Investor (reclassified as victim)', loss: '33.3M CERE tokens stolen', status: 'reclassified', icon: '&#x1F464;' },
          { name: 'Brad Bao', role: 'Ind. Director, Lime chairman', loss: 'Reputation + $6M loan risk', status: 'cooperating', icon: '&#x1F464;' },
          { name: 'Emmie Chang', role: 'SuperBloom co-founder', loss: 'Business destroyed by false rumors', status: 'available', icon: '&#x1F464;' },
        ].map(v => `<div style="padding:10px;border:1px solid var(--border);border-radius:8px;background:var(--bg)">
          <div style="font-size:12px;font-weight:600;display:flex;align-items:center;gap:6px">${v.icon} ${v.name}</div>
          <div style="font-size:10px;color:var(--primary);margin-top:2px">${v.role}</div>
          <div style="font-size:10px;color:var(--text2);margin-top:3px">${v.loss}</div>
          <div style="font-size:9px;margin-top:4px;display:inline-block;padding:1px 6px;border-radius:3px;background:${v.status === 'cooperating' ? 'rgba(90,138,90,.08)' : v.status === 'reclassified' ? 'rgba(196,122,74,.08)' : v.status === 'active' ? 'rgba(184,66,51,.08)' : 'rgba(122,99,152,.08)'};color:${v.status === 'cooperating' ? 'var(--green)' : v.status === 'reclassified' ? 'var(--primary)' : v.status === 'active' ? 'var(--red)' : 'var(--purple)'}">${v.status.toUpperCase()}</div>
        </div>`).join('')}
      </div>
    </div>

    <!-- Jurisdiction Strategy Matrix -->
    <div style="margin-bottom:24px;padding:20px;background:var(--surface);border:1px solid var(--border);border-radius:12px">
      <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:var(--text3);margin-bottom:14px">&#x1F30D; Jurisdiction Strategy Matrix</div>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px">
        ${[
          { jur: 'NDCA (N.D. California)', color: '#3b82f6', cases: ['Cere v. Wang', 'Interdata v. Wang'], sections: [1,2,3,4,6,8,11,12,13,14,15,16,17,18], lead: 'Susanna Chenette', status: 'Most active', strategy: 'RICO enterprise complaint + TRO asset freeze. Primary jurisdiction for federal charges.', nextAction: 'File TRO this week', urgency: 'critical' },
          { jur: 'Dubai DIFC', color: '#c47a4a', cases: ['Cases 31801/2025', '33359/2025'], sections: [8,17], lead: 'Tarek Saad / BLK', status: 'Arrest + seizure', strategy: 'Passport seized, phone forensics underway. Vijay $40M claim. Enforce US judgments via DIFC.', nextAction: 'Engage DIFC counsel', urgency: 'medium' },
          { jur: 'Delaware Chancery', color: '#7a6398', cases: ['Wang v. Cerebellum'], sections: [9,10], lead: 'TBD', status: 'Defensive', strategy: 'Kenzi retaliatory filing. Counter with Term Sheet void (duress + non-performance). Summary judgment ready.', nextAction: 'File SJ motion', urgency: 'medium' },
          { jur: 'BVI (British Virgin Is.)', color: '#5a8a5e', cases: ['Symbolic Ventures'], sections: [12,15], lead: 'TBD', status: 'Discovery', strategy: 'Symbolic Ventures ($50M fund) incorporated in BVI. Asset tracing for laundered proceeds.', nextAction: 'BVI court order for fund records', urgency: 'low' },
        ].map(j => `<div style="padding:12px;background:var(--bg);border-radius:8px;border-top:3px solid ${j.color}">
          <div style="font-size:11px;font-weight:700;color:${j.color}">${j.jur}</div>
          <div style="font-size:9px;color:var(--text3);margin-top:2px">${j.cases.join(' &middot; ')}</div>
          <div style="display:flex;gap:4px;align-items:center;margin-top:6px">
            <span style="font-size:7px;padding:1px 6px;border-radius:3px;background:${j.urgency === 'critical' ? 'rgba(184,66,51,.08)' : j.urgency === 'medium' ? 'rgba(196,122,74,.08)' : 'rgba(90,138,90,.08)'};color:${j.urgency === 'critical' ? 'var(--red)' : j.urgency === 'medium' ? 'var(--primary)' : 'var(--green)'};font-weight:700">${j.status.toUpperCase()}</span>
            <span style="font-size:8px;color:var(--text3)">${j.sections.length} sections</span>
          </div>
          <div style="font-size:9px;color:var(--text2);margin-top:6px;line-height:1.4">${j.strategy}</div>
          <div style="font-size:8px;color:var(--text3);margin-top:4px">Lead: <strong>${j.lead}</strong></div>
          <div style="font-size:8px;margin-top:4px;padding:3px 6px;background:${j.color}08;border:1px solid ${j.color}20;border-radius:4px;color:${j.color};font-weight:600">&rarr; ${j.nextAction}</div>
        </div>`).join('')}
      </div>
    </div>

    <!-- Risk Scenario Analysis -->
    <div style="margin-bottom:24px;padding:20px;background:var(--surface);border:1px solid var(--border);border-radius:12px;border-left:4px solid var(--red)">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
        <div>
          <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:var(--red)">&#x26A0; Risk Scenario Analysis</div>
          <div style="font-size:11px;color:var(--text2);margin-top:2px">What happens if key evidence is excluded or challenged</div>
        </div>
        <span style="font-size:8px;padding:2px 8px;border-radius:10px;background:rgba(184,66,51,.06);color:var(--red);font-weight:600">TRIAL PREP</span>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        ${[
          { scenario: 'DHTY Forensic Report excluded', impact: 'CRITICAL', sections: [6, 12, 15], consequence: 'Embezzlement loses primary evidence ($4.87M). Sections 6 &amp; 15 drop below BRD. RICO loses 2 predicates.', mitigation: 'Ascent report independently confirms. Practus investigation corroborates. Bank records subpoena in progress.' },
          { scenario: 'Messenger screenshots inadmissible', impact: 'HIGH', sections: [4, 8], consequence: 'Market manipulation &amp; extortion lose direct evidence. Smoking gun quote unavailable.', mitigation: 'Subpoena Meta for server-side copies. Screenshots have metadata. Fred Jin authenticates as foundation witness.' },
          { scenario: 'BIG Forensic Report Daubert challenge', impact: 'HIGH', sections: [15, 16], consequence: 'Bridge wallet provenance breaks. Token theft &amp; laundering sections weakened.', mitigation: 'BIG qualifies under FRE 702. On-chain records self-authenticate under FRE 902(13). Standard methodology.' },
          { scenario: 'Fred Jin credibility attacked', impact: 'MEDIUM', sections: [2, 6, 8, 9, 12, 13, 14], consequence: '7 sections reference his testimony. Defense argues bias.', mitigation: 'All testimony corroborated: Practus, DHTY, Brad Bao (independent director), blockchain records. No section relies solely on Jin.' },
          { scenario: 'Term Sheet held enforceable', impact: 'MEDIUM', sections: [9, 10], consequence: 'Kenzi entitled to $2.49M + 18.8% equity. Duress fails.', mitigation: 'Non-performance is independent defense: never signed RSPA, never returned accounts. Total breach voids consideration.' },
          { scenario: 'RICO enterprise theory rejected', impact: 'CATASTROPHIC', sections: [1, 2, 3, 5, 8, 9, 18], consequence: '7 time-barred claims die. Treble damages lost ($17.61M). Case reduces to direct damages.', mitigation: 'Enterprise well-documented: 4 jurisdictions, 8+ victims, identical MO. Wire fraud (10yr SOL) preserves core claims.' },
        ].map(r => {
          const impactColor = r.impact === 'CATASTROPHIC' ? 'var(--red)' : r.impact === 'CRITICAL' ? 'var(--red)' : r.impact === 'HIGH' ? 'var(--primary)' : 'var(--text3)';
          return '<div style="padding:10px 12px;background:var(--bg);border-radius:8px;border-left:3px solid ' + impactColor + '">' +
            '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">' +
              '<span style="font-size:10px;font-weight:700;color:var(--text)">' + r.scenario + '</span>' +
              '<span style="font-size:7px;padding:1px 6px;border-radius:3px;background:' + impactColor + '15;color:' + impactColor + ';font-weight:700">' + r.impact + '</span>' +
            '</div>' +
            '<div style="font-size:9px;color:var(--red);line-height:1.4;margin-bottom:4px"><strong>If excluded:</strong> ' + r.consequence + '</div>' +
            '<div style="font-size:9px;color:var(--green);line-height:1.4"><strong>Mitigation:</strong> ' + r.mitigation + '</div>' +
            '<div style="font-size:7px;color:var(--text3);margin-top:3px">Affects: ' + r.sections.map(function(n) { return '&sect;' + n; }).join(', ') + '</div>' +
          '</div>';
        }).join('')}
      </div>
    </div>

    <!-- Criminal Activity Timeline -->
    <div style="margin-bottom:24px;padding:20px;background:var(--surface);border:1px solid var(--border);border-radius:12px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
        <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:var(--red)">Defendant&rsquo;s Criminal Activity Timeline</div>
        <div style="font-size:9px;color:var(--text3)">8 years of documented fraud (2016&ndash;2024)</div>
      </div>
      <div style="overflow-x:auto">
        <div style="display:flex;gap:0;min-width:900px">
          ${[
            { year: '2016', act: 'Infiltrates Cere', detail: 'Meets Fred at Battery Club. Lies about Columbia, Wharton, a16z.', section: 1, color: '#c47a4a' },
            { year: '2017', act: 'Prior crimes surface', detail: 'Domain squatting (bad faith). Traction Labs collapses.', section: 2, color: '#9a9087' },
            { year: '2018', act: 'Grand Theft charge', detail: 'Steals HBUS laptop. Sued by Emmie Chang. YC expulsion.', section: 2, color: '#b84233' },
            { year: '2021', act: 'Pump & dump + theft', detail: 'Nov: CERE token manipulation. Diverts $4.87M from 79 investors.', section: 4, color: '#b84233' },
            { year: '2022', act: 'Extortion campaign', detail: 'Jan-Sep: 8 months of threats. Sep: coerced Term Sheet ($2.49M).', section: 8, color: '#b84233' },
            { year: '2023', act: 'Full shakedown', detail: 'Hijacks Twitter (105K) & Telegram (75K). Creates fake websites. Destroys evidence.', section: 14, color: '#b84233' },
            { year: '2024', act: 'Token dump', detail: 'Jan: Dumps 33.3M stolen CERE on KuCoin in 24h. Bridge wallet links to RAZE.', section: 16, color: '#b84233' },
            { year: '2025-26', act: 'Retaliatory lawsuits', detail: 'Orchestrates $100M Goopal RICO & Josef Qu filing via fabricated identities.', section: 17, color: '#b84233' },
          ].map((ev, i, arr) => `<div style="flex:1;text-align:center;position:relative;padding:8px 4px">
            <div style="font-size:10px;font-weight:700;color:${ev.color}">${ev.year}</div>
            <div style="width:12px;height:12px;border-radius:50%;background:${ev.color};margin:6px auto;position:relative;z-index:1"></div>
            ${i < arr.length - 1 ? '<div style="position:absolute;top:28px;left:50%;right:-50%;height:2px;background:var(--border);z-index:0"></div>' : ''}
            <div style="font-size:10px;font-weight:600;margin-top:4px;cursor:pointer;color:var(--text)" onclick="toggleSection('section-${ev.section}');document.getElementById('section-${ev.section}').scrollIntoView({behavior:'smooth'})">${ev.act}</div>
            <div style="font-size:8px;color:var(--text3);margin-top:2px;line-height:1.4">${ev.detail}</div>
          </div>`).join('')}
        </div>
      </div>
    </div>

    <!-- Case Timeline -->
    <div style="margin-bottom:24px;padding:20px;background:var(--surface);border:1px solid var(--border);border-radius:12px">
      <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:var(--text3);margin-bottom:14px">Case Timeline</div>
      <div style="position:relative;padding-left:20px">
        <div style="position:absolute;left:6px;top:0;bottom:0;width:2px;background:var(--border)"></div>
        ${[
          { date: 'May 2023', label: 'Cere v. Wang filed', detail: '3:23-cv-2444 — NDCA. Original complaint against Kenzi for embezzlement.', color: 'var(--primary)', type: 'civil' },
          { date: 'Jul 7, 2025', label: 'Dubai arrest — passport seized', detail: 'Cases 31801/2025 & 33359/2025. Kenzi taken into custody, phone confiscated for forensics.', color: 'var(--red)', type: 'criminal' },
          { date: 'Jan 2025', label: 'Interdata v. Wang filed', detail: '3:25-cv-03798-JD — NDCA.', color: 'var(--primary)', type: 'civil' },
          { date: 'Jan 13, 2026', label: 'Wang v. Cerebellum (Delaware)', detail: 'Kenzi\'s retaliatory filing in Delaware Court of Chancery.', color: 'var(--text3)', type: 'civil' },
          { date: 'Jan 27, 2026', label: 'Goopal v. Jin — RICO lawsuit filed', detail: '3:26-cv-00857 — $100M RICO. Vivian Liu weaponized as plaintiff. Goopal CEO later confirmed NO authorization.', color: 'var(--red)', type: 'civil' },
          { date: 'Feb 2026', label: 'Qu v. Jin filed', detail: '"Josef Qu" — fabricated KYC identity. "Largely carbon copies" of Kenzi\'s Delaware filing.', color: 'var(--text3)', type: 'civil' },
          { date: 'Mar 23, 2026', label: 'Kenzi Files submitted', detail: '260-page master evidence document compiled for Dubai authorities and US counsel.', color: 'var(--green)', type: 'milestone' },
        ].map(ev => `<div style="position:relative;padding:8px 0 8px 16px;margin-bottom:4px">
          <div style="position:absolute;left:-4px;top:12px;width:10px;height:10px;border-radius:50%;background:${ev.color};border:2px solid var(--surface)"></div>
          <div style="display:flex;gap:12px;align-items:baseline">
            <span style="font-size:10px;font-weight:700;color:${ev.color};min-width:85px">${ev.date}</span>
            <div>
              <span style="font-size:12px;font-weight:600">${ev.label}</span>
              <div style="font-size:10px;color:var(--text2);margin-top:1px">${ev.detail}</div>
            </div>
          </div>
        </div>`).join('')}
      </div>
    </div>

    <!-- Quick navigation with heatmap -->
    <div style="margin-bottom:16px;padding:16px;background:var(--surface);border:1px solid var(--border);border-radius:12px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
        <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:var(--text3)">Case Strength Heatmap</div>
        <div style="display:flex;gap:8px;font-size:8px;color:var(--text3)">
          <span style="display:flex;align-items:center;gap:3px"><span style="width:10px;height:10px;border-radius:2px;background:#5a8a5e"></span>90%+</span>
          <span style="display:flex;align-items:center;gap:3px"><span style="width:10px;height:10px;border-radius:2px;background:#c47a4a"></span>70-89%</span>
          <span style="display:flex;align-items:center;gap:3px"><span style="width:10px;height:10px;border-radius:2px;background:#b84233"></span>&lt;70%</span>
          <span style="margin-left:8px;display:flex;align-items:center;gap:3px">&#x2705; meets burden</span>
          <span style="display:flex;align-items:center;gap:3px">&#x26A0; gap</span>
        </div>
      </div>
      <!-- Heatmap blocks -->
      <div style="display:grid;grid-template-columns:repeat(18,1fr);gap:3px;margin-bottom:3px">
        ${sections.map(sec => {
          const cId = sectionToClaimMap[String(sec.number)];
          const cl = cId ? allData['claims/' + cId] as { strength?: number; elements?: Array<{ status: string }> } | undefined : undefined;
          const str = cl?.strength ? Math.round(cl.strength * 100) : 0;
          const bg = str >= 90 ? '#5a8a5e' : str >= 70 ? '#c47a4a' : str > 0 ? '#b84233' : '#d8d0c6';
          const opacity = str > 0 ? (0.4 + (str / 100) * 0.6) : 0.3;
          return `<div onclick="toggleSection('${sec.id}');document.getElementById('${sec.id}').scrollIntoView({behavior:'smooth',block:'start'})" style="cursor:pointer;aspect-ratio:1;background:${bg};opacity:${opacity.toFixed(2)};border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:#fff;transition:all .15s" onmouseover="this.style.opacity='1';this.style.transform='scale(1.15)'" onmouseout="this.style.opacity='${opacity.toFixed(2)}';this.style.transform='scale(1)'" title="${sec.title} — ${str}%">${sec.number}</div>`;
        }).join('')}
      </div>
      <!-- Burden of proof status row -->
      <div style="display:grid;grid-template-columns:repeat(18,1fr);gap:3px;margin-bottom:12px">
        ${sections.map(sec => {
          const cId = sectionToClaimMap[String(sec.number)];
          const cl = cId ? allData['claims/' + cId] as { strength?: number; elements?: Array<{ status: string }> } | undefined : undefined;
          const str = cl?.strength ? Math.round(cl.strength * 100) : 0;
          const els = cl?.elements || [];
          if (els.length === 0) return '<div style="text-align:center;font-size:7px;color:var(--text3)">—</div>';
          const crimSections = [2,4,8,12,13,14,15,17];
          const isCrim = crimSections.includes(sec.number);
          const threshold = isCrim ? 95 : 51;
          const meets = str >= threshold;
          return `<div style="text-align:center;font-size:8px;cursor:pointer" onclick="toggleSection('${sec.id}');document.getElementById('${sec.id}').scrollIntoView({behavior:'smooth',block:'start'})" title="${meets ? 'Meets' : 'Gap to'} ${isCrim ? 'BRD (95%)' : 'PoE (51%)'} — click to view">${meets ? '&#x2705;' : '&#x26A0;'}</div>`;
        }).join('')}
      </div>
      <!-- Pill navigation -->
      <div style="display:flex;flex-wrap:wrap;gap:4px">
        ${sections.map(sec => {
          const cId = sectionToClaimMap[String(sec.number)];
          const cl = cId ? allData['claims/' + cId] as { strength?: number } | undefined : undefined;
          const str = cl?.strength ? Math.round(cl.strength * 100) : 0;
          const strColor = str >= 90 ? 'var(--green)' : str >= 70 ? 'var(--primary)' : str > 0 ? 'var(--red)' : 'var(--text3)';
          const readiness = str >= 85 ? 'Court-Ready' : str >= 60 ? 'Near-Ready' : 'Needs Work';
          return `<a onclick="toggleSection('${sec.id}');document.getElementById('${sec.id}').scrollIntoView({behavior:'smooth',block:'start'})" title="${sec.title} | ${str}% strength | ${readiness}" style="cursor:pointer;padding:4px 10px;border:1px solid var(--border);border-radius:16px;font-size:10px;display:inline-flex;align-items:center;gap:4px;transition:all .15s;background:var(--bg)" onmouseover="this.style.borderColor='var(--primary)'" onmouseout="this.style.borderColor='var(--border)'"><span style="font-weight:700;color:${strColor}">${sec.number}</span><span style="color:var(--text2)">${sec.title.length > 22 ? sec.title.slice(0, 22) + '...' : sec.title}</span></a>`;
        }).join('')}
      </div>
    </div>

    <!-- Section breakdown -->
    <div style="display:flex;gap:12px;margin-bottom:16px;padding:12px 16px;background:var(--surface);border:1px solid var(--border);border-radius:8px;font-size:10px;flex-wrap:wrap;align-items:center">
      <span style="font-weight:700;color:var(--text3);letter-spacing:1px;font-size:9px">BREAKDOWN:</span>
      <span style="display:flex;align-items:center;gap:4px"><span style="width:8px;height:8px;border-radius:2px;background:var(--red)"></span> <strong>12</strong> Felony-level charges</span>
      <span style="color:var(--border)">|</span>
      <span style="display:flex;align-items:center;gap:4px"><span style="width:8px;height:8px;border-radius:2px;background:var(--primary)"></span> <strong>4</strong> Civil/regulatory claims</span>
      <span style="color:var(--border)">|</span>
      <span style="display:flex;align-items:center;gap:4px"><span style="width:8px;height:8px;border-radius:2px;background:var(--green)"></span> <strong>2</strong> Evidentiary confirmations</span>
      <span style="color:var(--border)">|</span>
      <span style="color:var(--text3)"><strong style="color:var(--text)">3</strong> independent forensic audits (DHTY, Ascent, Practus)</span>
      <span style="color:var(--border)">|</span>
      <span style="color:var(--text3)"><strong style="color:var(--text)">600+</strong> pages available upon request</span>
    </div>

    <!-- Stream Validation — AI vs Attorney -->
    <div style="margin-bottom:24px;padding:24px;background:var(--surface);border:1px solid var(--border);border-radius:16px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
        <div>
          <div style="font-family:var(--serif);font-size:20px;font-weight:700">Stream Validation &mdash; AI vs Attorney</div>
          <div style="font-size:11px;color:var(--text2);margin-top:2px">Dual data streams run in parallel. Compare AI extraction signals against attorney judgment.</div>
        </div>
        <div style="display:flex;align-items:center;gap:6px">
          <span style="font-size:8px;padding:3px 10px;border-radius:10px;background:rgba(90,138,90,.08);color:var(--green);font-weight:700;letter-spacing:0.5px">94% AGREEMENT</span>
          <span style="font-size:8px;padding:3px 10px;border-radius:10px;background:rgba(196,122,74,.08);color:var(--primary);font-weight:700;letter-spacing:0.5px">DISTILLATION APPLIED</span>
        </div>
      </div>

      <!-- Evidence Being Validated -->
      <div style="padding:12px 16px;background:var(--bg);border:1px solid var(--border);border-radius:10px;margin-bottom:16px;display:flex;align-items:center;gap:12px">
        <span style="font-size:16px">&#x2709;</span>
        <div style="flex:1">
          <div style="font-size:12px;font-weight:700;color:var(--text)">Rocky Lee Email &mdash; Goopal CEO Denial</div>
          <div style="font-size:10px;color:var(--text3)">Received Mar 23, 2026 &middot; Processed by 4 AI agents &middot; Attorney review completed Mar 24, 2026</div>
        </div>
        <div style="font-size:9px;color:var(--text3);text-align:right">
          <div>Source: rocky.lee@milliard.law</div>
          <div style="font-family:var(--mono);font-size:8px;color:var(--text3);margin-top:2px">ev-rocky-goopal-ceo</div>
        </div>
      </div>

      <!-- Two-column comparison -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">
        <!-- Stream A: AI Pipeline -->
        <div style="padding:16px;background:linear-gradient(135deg,rgba(90,138,138,.03),rgba(90,138,138,.06));border:1px solid rgba(90,138,138,.2);border-radius:12px">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:12px">
            <span style="width:8px;height:8px;border-radius:50%;background:var(--cyan)"></span>
            <span style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:var(--cyan)">Stream A &mdash; AI Pipeline</span>
          </div>
          <!-- Extraction Signals -->
          <div style="margin-bottom:12px">
            <div style="font-size:9px;font-weight:600;color:var(--text3);margin-bottom:6px">EXTRACTION SIGNALS</div>
            <div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:6px">
              <span style="font-size:9px;padding:2px 8px;border-radius:4px;background:rgba(90,138,138,.08);color:var(--cyan);font-weight:500">Goopal</span>
              <span style="font-size:9px;padding:2px 8px;border-radius:4px;background:rgba(90,138,138,.08);color:var(--cyan);font-weight:500">Vivian Liu</span>
              <span style="font-size:9px;padding:2px 8px;border-radius:4px;background:rgba(90,138,138,.08);color:var(--cyan);font-weight:500">CEO Authorization</span>
              <span style="font-size:9px;padding:2px 8px;border-radius:4px;background:rgba(90,138,138,.08);color:var(--cyan);font-weight:500">Token Theft</span>
              <span style="font-size:9px;padding:2px 8px;border-radius:4px;background:rgba(184,66,51,.08);color:var(--red);font-weight:500">URGENT</span>
            </div>
            <div style="font-size:9px;color:var(--text3)">Jurisdictions: <strong style="color:var(--text2)">NDCA, BVI</strong> &middot; Confidence: <strong style="color:var(--green)">HIGH (92%)</strong></div>
          </div>
          <!-- Claim Scoring -->
          <div style="margin-bottom:12px">
            <div style="font-size:9px;font-weight:600;color:var(--text3);margin-bottom:6px">CLAIM SCORING (top 5)</div>
            <div style="display:flex;flex-direction:column;gap:4px">
              <div style="display:flex;align-items:center;gap:6px;font-size:10px">
                <span style="color:var(--text2);min-width:120px">vivian-theft</span>
                <div style="flex:1;height:6px;background:var(--border);border-radius:3px;overflow:hidden"><div style="height:100%;width:95%;background:var(--green);border-radius:3px"></div></div>
                <span style="font-family:var(--mono);font-weight:700;color:var(--green);min-width:35px;text-align:right">0.95</span>
              </div>
              <div style="display:flex;align-items:center;gap:6px;font-size:10px">
                <span style="color:var(--text2);min-width:120px">syndicate</span>
                <div style="flex:1;height:6px;background:var(--border);border-radius:3px;overflow:hidden"><div style="height:100%;width:92%;background:var(--green);border-radius:3px"></div></div>
                <span style="font-family:var(--mono);font-weight:700;color:var(--green);min-width:35px;text-align:right">0.92</span>
              </div>
              <div style="display:flex;align-items:center;gap:6px;font-size:10px">
                <span style="color:var(--text2);min-width:120px">fabrication</span>
                <div style="flex:1;height:6px;background:var(--border);border-radius:3px;overflow:hidden"><div style="height:100%;width:88%;background:var(--primary);border-radius:3px"></div></div>
                <span style="font-family:var(--mono);font-weight:700;color:var(--primary);min-width:35px;text-align:right">0.88</span>
              </div>
              <div style="display:flex;align-items:center;gap:6px;font-size:10px">
                <span style="color:var(--text2);min-width:120px">embezzlement</span>
                <div style="flex:1;height:6px;background:var(--border);border-radius:3px;overflow:hidden"><div style="height:100%;width:76%;background:var(--primary);border-radius:3px"></div></div>
                <span style="font-family:var(--mono);font-weight:700;color:var(--primary);min-width:35px;text-align:right">0.76</span>
              </div>
              <div style="display:flex;align-items:center;gap:6px;font-size:10px">
                <span style="color:var(--text2);min-width:120px">aliases</span>
                <div style="flex:1;height:6px;background:var(--border);border-radius:3px;overflow:hidden"><div style="height:100%;width:71%;background:var(--primary);border-radius:3px"></div></div>
                <span style="font-family:var(--mono);font-weight:700;color:var(--primary);min-width:35px;text-align:right">0.71</span>
              </div>
            </div>
          </div>
          <!-- Cross-case Impacts -->
          <div>
            <div style="font-size:9px;font-weight:600;color:var(--text3);margin-bottom:4px">CROSS-CASE IMPACTS DETECTED</div>
            <div style="font-size:10px;color:var(--text2);line-height:1.6">
              <div>&bull; Goopal v. Jin (3:26-cv-00857) &mdash; standing invalidated</div>
              <div>&bull; Cere v. Wang (3:23-cv-2444) &mdash; new count: fraud on court</div>
              <div>&bull; Dubai 31801/2025 &mdash; criminal referral strengthened</div>
            </div>
          </div>
        </div>

        <!-- Stream B: Attorney Assessment -->
        <div style="padding:16px;background:linear-gradient(135deg,rgba(196,122,74,.03),rgba(196,122,74,.06));border:1px solid rgba(196,122,74,.2);border-radius:12px">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:12px">
            <span style="width:8px;height:8px;border-radius:50%;background:var(--primary)"></span>
            <span style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:var(--primary)">Stream B &mdash; Attorney Assessment</span>
          </div>
          <!-- Impact Rating -->
          <div style="margin-bottom:12px">
            <div style="font-size:9px;font-weight:600;color:var(--text3);margin-bottom:6px">IMPACT RATING</div>
            <div style="display:flex;align-items:center;gap:8px">
              <div style="font-family:var(--serif);font-size:36px;font-weight:800;color:var(--primary);line-height:1">9</div>
              <div style="font-size:10px;color:var(--text3)">/10</div>
              <div style="flex:1;height:8px;background:var(--border);border-radius:4px;overflow:hidden"><div style="height:100%;width:90%;background:var(--primary);border-radius:4px"></div></div>
            </div>
            <div style="font-size:9px;color:var(--text2);margin-top:4px;font-style:italic">&ldquo;Potentially case-altering. CEO denial invalidates Goopal standing entirely.&rdquo;</div>
          </div>
          <!-- Determinations -->
          <div style="margin-bottom:12px">
            <div style="font-size:9px;font-weight:600;color:var(--text3);margin-bottom:6px">DETERMINATIONS</div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
              <div style="padding:8px 10px;background:rgba(90,138,90,.06);border:1px solid rgba(90,138,90,.15);border-radius:6px;text-align:center">
                <div style="font-size:9px;color:var(--text3)">Useful</div>
                <div style="font-size:14px;font-weight:700;color:var(--green)">YES</div>
              </div>
              <div style="padding:8px 10px;background:rgba(90,138,90,.06);border:1px solid rgba(90,138,90,.15);border-radius:6px;text-align:center">
                <div style="font-size:9px;color:var(--text3)">Admissible</div>
                <div style="font-size:14px;font-weight:700;color:var(--green)">YES</div>
              </div>
            </div>
          </div>
          <!-- Priority -->
          <div style="margin-bottom:12px">
            <div style="font-size:9px;font-weight:600;color:var(--text3);margin-bottom:6px">PRIORITY ASSESSMENT</div>
            <div style="font-size:10px;color:var(--text2);line-height:1.6">
              <div><strong style="color:var(--text)">Priority:</strong> <span style="padding:1px 6px;border-radius:3px;background:rgba(184,66,51,.08);color:var(--red);font-weight:600;font-size:9px">CRITICAL</span></div>
              <div style="margin-top:4px"><strong style="color:var(--text)">Action required:</strong> File anti-suit injunction in NDCA within 10 days</div>
            </div>
          </div>
          <!-- Attorney Notes -->
          <div>
            <div style="font-size:9px;font-weight:600;color:var(--text3);margin-bottom:4px">ATTORNEY NOTES</div>
            <div style="font-size:10px;color:var(--text2);line-height:1.6;padding:8px 10px;background:var(--bg);border-radius:6px;border-left:3px solid var(--primary)">
              CEO unequivocally stated no authorization. Only one Goopal entity in BVI registry. This email should be preserved as Exhibit 43. Vivian reclassification from adversary to victim opens cooperation pathway. AI correctly flagged syndicate and vivian-theft &mdash; agree on scoring.
            </div>
          </div>
        </div>
      </div>

      <!-- Comparison Row -->
      <div style="padding:16px;background:var(--bg);border:1px solid var(--border);border-radius:12px">
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin-bottom:14px">
          <!-- Agreement -->
          <div style="text-align:center;padding:12px;background:var(--surface);border-radius:8px;border:1px solid var(--border)">
            <div style="font-size:9px;font-weight:600;color:var(--text3);margin-bottom:4px">STREAM AGREEMENT</div>
            <div style="font-family:var(--serif);font-size:32px;font-weight:800;color:var(--green);line-height:1">94%</div>
            <div style="font-size:9px;color:var(--text3);margin-top:4px">AI and attorney converge on 16 of 17 signals</div>
          </div>
          <!-- Deltas -->
          <div style="padding:12px;background:var(--surface);border-radius:8px;border:1px solid var(--border)">
            <div style="font-size:9px;font-weight:600;color:var(--text3);margin-bottom:6px">DELTA INDICATORS</div>
            <div style="font-size:10px;line-height:1.8">
              <div style="display:flex;justify-content:space-between"><span style="color:var(--text2)">embezzlement relevance</span><span style="color:var(--primary);font-weight:600">AI: 0.76 &rarr; Atty: 0.65</span></div>
              <div style="display:flex;justify-content:space-between"><span style="color:var(--text2)">aliases connection</span><span style="color:var(--primary);font-weight:600">AI: 0.71 &rarr; Atty: 0.80</span></div>
              <div style="display:flex;justify-content:space-between"><span style="color:var(--green)">vivian-theft</span><span style="color:var(--green);font-weight:600">AI: 0.95 = Atty: 0.95</span></div>
            </div>
          </div>
          <!-- Distillation -->
          <div style="padding:12px;background:var(--surface);border-radius:8px;border:1px solid var(--border)">
            <div style="font-size:9px;font-weight:600;color:var(--text3);margin-bottom:6px">DISTILLATION APPLIED</div>
            <div style="font-size:9px;color:var(--text2);margin-bottom:8px">Weight drift from attorney feedback:</div>
            <div style="display:flex;flex-direction:column;gap:4px;font-size:10px">
              <div style="display:flex;justify-content:space-between;align-items:center">
                <span style="color:var(--text2)">vivian-theft</span>
                <span style="font-family:var(--mono);font-size:9px"><span style="color:var(--text3)">0.056</span> &rarr; <span style="color:var(--green);font-weight:700">0.072</span> <span style="color:var(--green);font-size:8px">(+28.6%)</span></span>
              </div>
              <div style="display:flex;justify-content:space-between;align-items:center">
                <span style="color:var(--text2)">syndicate</span>
                <span style="font-family:var(--mono);font-size:9px"><span style="color:var(--text3)">0.061</span> &rarr; <span style="color:var(--green);font-weight:700">0.074</span> <span style="color:var(--green);font-size:8px">(+21.3%)</span></span>
              </div>
              <div style="display:flex;justify-content:space-between;align-items:center">
                <span style="color:var(--text2)">embezzlement</span>
                <span style="font-family:var(--mono);font-size:9px"><span style="color:var(--text3)">0.058</span> &rarr; <span style="color:var(--primary);font-weight:700">0.052</span> <span style="color:var(--primary);font-size:8px">(-10.3%)</span></span>
              </div>
            </div>
          </div>
        </div>
        <!-- Weight before/after visualization -->
        <div style="font-size:9px;font-weight:600;color:var(--text3);margin-bottom:8px">CLAIM WEIGHT BEFORE / AFTER FEEDBACK</div>
        <div style="display:flex;flex-direction:column;gap:4px">
          <div style="display:grid;grid-template-columns:100px 1fr 1fr 50px;gap:8px;align-items:center;font-size:10px">
            <span style="color:var(--text3);font-size:8px;font-weight:600">CLAIM</span>
            <span style="color:var(--text3);font-size:8px;font-weight:600">BEFORE</span>
            <span style="color:var(--text3);font-size:8px;font-weight:600">AFTER</span>
            <span style="color:var(--text3);font-size:8px;font-weight:600;text-align:right">DRIFT</span>
          </div>
          <div style="display:grid;grid-template-columns:100px 1fr 1fr 50px;gap:8px;align-items:center;font-size:10px">
            <span style="color:var(--text2)">vivian-theft</span>
            <div style="height:6px;background:var(--border);border-radius:3px;overflow:hidden"><div style="height:100%;width:56%;background:var(--text3);border-radius:3px"></div></div>
            <div style="height:6px;background:var(--border);border-radius:3px;overflow:hidden"><div style="height:100%;width:72%;background:var(--green);border-radius:3px"></div></div>
            <span style="font-family:var(--mono);font-size:9px;color:var(--green);text-align:right;font-weight:600">+28.6%</span>
          </div>
          <div style="display:grid;grid-template-columns:100px 1fr 1fr 50px;gap:8px;align-items:center;font-size:10px">
            <span style="color:var(--text2)">syndicate</span>
            <div style="height:6px;background:var(--border);border-radius:3px;overflow:hidden"><div style="height:100%;width:61%;background:var(--text3);border-radius:3px"></div></div>
            <div style="height:6px;background:var(--border);border-radius:3px;overflow:hidden"><div style="height:100%;width:74%;background:var(--green);border-radius:3px"></div></div>
            <span style="font-family:var(--mono);font-size:9px;color:var(--green);text-align:right;font-weight:600">+21.3%</span>
          </div>
          <div style="display:grid;grid-template-columns:100px 1fr 1fr 50px;gap:8px;align-items:center;font-size:10px">
            <span style="color:var(--text2)">fabrication</span>
            <div style="height:6px;background:var(--border);border-radius:3px;overflow:hidden"><div style="height:100%;width:55%;background:var(--text3);border-radius:3px"></div></div>
            <div style="height:6px;background:var(--border);border-radius:3px;overflow:hidden"><div style="height:100%;width:63%;background:var(--primary);border-radius:3px"></div></div>
            <span style="font-family:var(--mono);font-size:9px;color:var(--primary);text-align:right;font-weight:600">+14.5%</span>
          </div>
          <div style="display:grid;grid-template-columns:100px 1fr 1fr 50px;gap:8px;align-items:center;font-size:10px">
            <span style="color:var(--text2)">embezzlement</span>
            <div style="height:6px;background:var(--border);border-radius:3px;overflow:hidden"><div style="height:100%;width:58%;background:var(--text3);border-radius:3px"></div></div>
            <div style="height:6px;background:var(--border);border-radius:3px;overflow:hidden"><div style="height:100%;width:52%;background:var(--primary);border-radius:3px"></div></div>
            <span style="font-family:var(--mono);font-size:9px;color:var(--primary);text-align:right;font-weight:600">-10.3%</span>
          </div>
          <div style="display:grid;grid-template-columns:100px 1fr 1fr 50px;gap:8px;align-items:center;font-size:10px">
            <span style="color:var(--text2)">aliases</span>
            <div style="height:6px;background:var(--border);border-radius:3px;overflow:hidden"><div style="height:100%;width:50%;background:var(--text3);border-radius:3px"></div></div>
            <div style="height:6px;background:var(--border);border-radius:3px;overflow:hidden"><div style="height:100%;width:57%;background:var(--primary);border-radius:3px"></div></div>
            <span style="font-family:var(--mono);font-size:9px;color:var(--primary);text-align:right;font-weight:600">+14.0%</span>
          </div>
        </div>
        <div style="font-size:8px;color:var(--text3);margin-top:10px;text-align:center">Weights shift when attorney assessments diverge from AI scores. Higher weight = AI prioritizes this claim for future evidence. Drift compounds over time.</div>
      </div>
    </div>

    <!-- Section controls -->
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
      <div style="font-family:var(--serif);font-size:16px;font-weight:700;color:var(--text2)">Facts &amp; Evidence &mdash; ${sections.length} Sections</div>
      <div style="display:flex;gap:8px">
        <button class="btn btn-secondary btn-sm" onclick="document.querySelectorAll('.section-content').forEach(function(c){c.classList.add('open')});document.querySelectorAll('.section-toggle').forEach(function(t){t.classList.add('open')})">Expand All</button>
        <button class="btn btn-secondary btn-sm" onclick="document.querySelectorAll('.section-content').forEach(function(c){c.classList.remove('open')});document.querySelectorAll('.section-toggle').forEach(function(t){t.classList.remove('open')})">Collapse All</button>
      </div>
    </div>
    <!-- Search bar -->
    <div style="margin-bottom:10px">
      <input id="section-search" type="text" placeholder="Search sections... (e.g. Vivian, bridge wallet, Term Sheet)" oninput="searchSections(this.value)" style="width:100%;padding:8px 14px;border:1px solid var(--border);border-radius:8px;background:var(--surface);font-family:var(--font);font-size:12px;color:var(--text);outline:none" onfocus="this.style.borderColor='var(--primary)'" onblur="this.style.borderColor='var(--border)'">
    </div>
    <!-- Jurisdiction filter -->
    <div style="display:flex;gap:6px;margin-bottom:16px;align-items:center">
      <span style="font-size:9px;font-weight:600;color:var(--text3);letter-spacing:1px">FILTER:</span>
      <button class="btn btn-secondary btn-sm jur-filter" data-jur="all" onclick="filterByJurisdiction('all')" style="background:var(--text);color:var(--bg)">All</button>
      <button class="btn btn-secondary btn-sm jur-filter" data-jur="NDCA" onclick="filterByJurisdiction('NDCA')" style="border-color:rgba(59,130,246,.3);color:#3b82f6">NDCA</button>
      <button class="btn btn-secondary btn-sm jur-filter" data-jur="Dubai" onclick="filterByJurisdiction('Dubai')" style="border-color:rgba(196,122,74,.3);color:#c47a4a">Dubai</button>
      <button class="btn btn-secondary btn-sm jur-filter" data-jur="Delaware" onclick="filterByJurisdiction('Delaware')" style="border-color:rgba(122,99,152,.3);color:#7a6398">Delaware</button>
      <button class="btn btn-secondary btn-sm jur-filter" data-jur="BVI" onclick="filterByJurisdiction('BVI')" style="border-color:rgba(90,138,90,.3);color:#5a8a5e">BVI</button>
      <span style="color:var(--border);margin:0 4px">|</span>
      <span style="font-size:9px;font-weight:600;color:var(--text3);letter-spacing:1px">READINESS:</span>
      <button class="btn btn-secondary btn-sm ready-filter" data-ready="all" onclick="filterByReadiness('all')" style="background:var(--text);color:var(--bg);font-size:9px;padding:3px 8px">All</button>
      <button class="btn btn-secondary btn-sm ready-filter" data-ready="court-ready" onclick="filterByReadiness('court-ready')" style="border-color:rgba(90,138,90,.3);color:var(--green);font-size:9px;padding:3px 8px">Court-Ready</button>
      <button class="btn btn-secondary btn-sm ready-filter" data-ready="near-ready" onclick="filterByReadiness('near-ready')" style="border-color:rgba(196,122,74,.3);color:var(--primary);font-size:9px;padding:3px 8px">Near-Ready</button>
      <button class="btn btn-secondary btn-sm ready-filter" data-ready="needs-work" onclick="filterByReadiness('needs-work')" style="border-color:rgba(184,66,51,.3);color:var(--red);font-size:9px;padding:3px 8px">Needs Work</button>
      <span id="filter-count" style="font-size:10px;color:var(--text3);margin-left:4px"></span>
    </div>

    ${/* Precompute dependency map once (was O(n²) recomputing per section) */ ''}
    ${(() => {
      // Build section dependency map ONCE outside the loop
      const _depMap: Record<string, string[]> = {};
      sections.forEach(sec => {
        (sec.cross_references || []).forEach((cr: { section_id: string }) => {
          if (!_depMap[cr.section_id]) _depMap[cr.section_id] = [];
          if (!_depMap[cr.section_id].includes(sec.id)) _depMap[cr.section_id].push(sec.id);
        });
      });
      // Store on a var we can reference in the map below (via closure trick with IIFE return)
      (sections as unknown as { _depMap: Record<string, string[]> })._depMap = _depMap;
      return '';
    })()}
    ${sections.map((s, sIdx) => {
      const sectionGraphs = s.evidence_ids
        .map(eid => graphs[eid])
        .filter((g): g is EvidenceGraph => g !== undefined);

      const dependedOnBy = (sections as unknown as { _depMap: Record<string, string[]> })._depMap || {};
      const dependentCount = (dependedOnBy[s.id] || []).length;

      // Get matching claim for element data
      const claimId = sectionToClaimMap[String(s.number)];
      const claim = claimId ? allData['claims/' + claimId] as { elements?: Array<{ id: string; status: string; name: string }>; strength?: number } | undefined : undefined;
      const elements = claim?.elements || [];
      const proven = elements.filter(e => e.status === 'proven').length;
      const partial = elements.filter(e => e.status === 'partial').length;
      const gaps = elements.filter(e => e.status === 'unproven').length;
      const strength = claim?.strength ? Math.round(claim.strength * 100) : 0;

      // Evidence confidence: diversity of source types
      const claimEvChain = claimId ? (allData['claims/' + claimId] as { evidence_chain?: string[] } | undefined)?.evidence_chain || [] : [];
      const evTypeSet = new Set<string>();
      claimEvChain.forEach(eid => {
        const ev = allData['evidence/' + eid] as { type?: string } | undefined;
        if (ev?.type) evTypeSet.add(ev.type);
      });
      const typeCount = evTypeSet.size;
      const evConfidence = Math.min(100, typeCount * 20 + Math.min(50, claimEvChain.length * 8)); // diversity + volume
      const confLabel = evConfidence >= 80 ? 'HIGH' : evConfidence >= 50 ? 'MED' : evConfidence >= 20 ? 'LOW' : '';
      const confColor = evConfidence >= 80 ? 'var(--green)' : evConfidence >= 50 ? 'var(--primary)' : 'var(--red)';

      // Crime severity classification
      const severityMap: Record<string, { label: string; color: string }> = {
        '1': { label: 'FRAUD', color: 'var(--red)' },
        '2': { label: 'FELONY', color: 'var(--red)' },
        '3': { label: 'IDENTITY FRAUD', color: 'var(--red)' },
        '4': { label: 'SECURITIES FRAUD', color: 'var(--red)' },
        '5': { label: 'REPUTATIONAL', color: 'var(--primary)' },
        '6': { label: 'FRAUD', color: 'var(--red)' },
        '7': { label: 'REPUTATIONAL', color: 'var(--primary)' },
        '8': { label: 'EXTORTION', color: 'var(--red)' },
        '9': { label: 'DURESS', color: 'var(--red)' },
        '10': { label: 'CONFESSION', color: 'var(--green)' },
        '11': { label: 'FORENSIC PROOF', color: 'var(--green)' },
        '12': { label: 'EMBEZZLEMENT', color: 'var(--red)' },
        '13': { label: 'OBSTRUCTION', color: 'var(--red)' },
        '14': { label: 'THEFT', color: 'var(--red)' },
        '15': { label: 'MONEY LAUNDERING', color: 'var(--red)' },
        '16': { label: 'TOKEN THEFT', color: 'var(--red)' },
        '17': { label: 'RICO', color: 'var(--red)' },
        '18': { label: 'SEC VIOLATION', color: 'var(--primary)' },
      };
      const severity = severityMap[String(s.number)];

      // Compute readiness class for filtering
      const rEvCount = claimEvidenceCounts[sectionToClaimMap[String(s.number)]] || s.evidence_ids.length;
      const rElemScore = elements.length > 0 ? Math.round((proven / elements.length) * 100) : 0;
      const rCorrobScore = Math.min(100, s.cross_references.length * 25);
      const rEvScore2 = Math.min(100, rEvCount * 15);
      const rReadiness = elements.length > 0 ? Math.round((rEvScore2 * 0.35 + rElemScore * 0.45 + rCorrobScore * 0.20)) : 0;
      const readinessClass = rReadiness >= 85 ? 'court-ready' : rReadiness >= 60 ? 'near-ready' : 'needs-work';

      return `
      <div class="doc-section" id="${s.id}" data-section="${s.id}" data-readiness="${readinessClass}" data-jurisdictions="${(s.jurisdictions || []).join(',')}" data-search="${(s.title + ' ' + s.content + ' ' + s.key_facts.join(' ') + ' ' + s.key_entities.join(' ')).replace(/"/g, '').toLowerCase()}">
        <div class="section-header" onclick="toggleSection('${s.id}')">
          <div class="section-left">
            <span class="section-num">${s.number}</span>
            ${severity ? `<span style="font-size:8px;font-weight:700;letter-spacing:1px;padding:2px 6px;border-radius:3px;background:${severity.color === 'var(--red)' ? 'rgba(184,66,51,.08)' : severity.color === 'var(--green)' ? 'rgba(90,138,90,.08)' : 'rgba(196,122,74,.08)'};color:${severity.color}">${severity.label}</span>` : ''}
            <span class="section-title">${s.title}</span>
          </div>
          <div class="section-right">
            ${strength > 0 ? `<span style="font-size:13px;font-weight:700;color:${strength >= 90 ? 'var(--green)' : strength >= 70 ? 'var(--primary)' : 'var(--text3)'};margin-right:2px">${strength}%</span>${confLabel ? `<span style="font-size:7px;font-weight:600;color:${confColor};vertical-align:super;margin-right:4px" title="Evidence confidence: ${evConfidence}% — based on ${typeCount} source types and ${claimEvChain.length} items">${confLabel}</span>` : ''}` : ''}
            <span class="section-badge evidence">${claimEvidenceCounts[sectionToClaimMap[String(s.number)]] || s.evidence_ids.length} evidence</span>
            ${elements.length > 0 ? `<span class="section-badge" style="background:${gaps > 0 ? 'rgba(184,66,51,.08)' : 'rgba(90,138,90,.08)'};color:${gaps > 0 ? 'var(--red)' : 'var(--green)'}">${proven}/${elements.length} elements</span>` : ''}
            <span class="section-badge connections">${s.cross_references.length} links</span>
            ${dependentCount >= 3 ? `<span class="section-badge" style="background:rgba(122,99,152,.1);color:var(--purple);font-weight:700;border:1px solid rgba(122,99,152,.2)" title="${dependentCount} other sections reference this claim as supporting evidence">&#x26A0; LOAD-BEARING &middot; ${dependentCount} dependents</span>` : ''}
            <span class="section-toggle${sIdx < 3 ? ' open' : ''}" id="toggle-${s.id}">&#9654;</span>
          </div>
        </div>
        ${strength > 0 ? `<div style="height:3px;background:var(--border);overflow:hidden"><div style="height:100%;width:${strength}%;background:${strength >= 90 ? 'var(--green)' : strength >= 70 ? 'var(--primary)' : 'var(--red)'};transition:width .5s"></div></div>` : ''}
        ${(() => {
          // Prosecution readiness: 3 pillars lawyers care about
          const evCount = claimEvidenceCounts[sectionToClaimMap[String(s.number)]] || s.evidence_ids.length;
          const elemScore = elements.length > 0 ? Math.round((proven / elements.length) * 100) : 0;
          const corrobScore = Math.min(100, s.cross_references.length * 25); // 4+ refs = 100%
          const evScore = Math.min(100, evCount * 15); // 7+ items = 100%
          const readiness = elements.length > 0 ? Math.round((evScore * 0.35 + elemScore * 0.45 + corrobScore * 0.20)) : 0;
          const readinessLabel = readiness >= 85 ? 'COURT-READY' : readiness >= 60 ? 'NEAR-READY' : readiness >= 30 ? 'DEVELOPING' : 'INSUFFICIENT';
          const readinessColor = readiness >= 85 ? 'var(--green)' : readiness >= 60 ? 'var(--primary)' : readiness >= 30 ? 'var(--text3)' : 'var(--red)';
          if (elements.length === 0) return '';
          return `<div style="display:flex;align-items:center;gap:8px;padding:3px 20px;font-size:9px" title="Prosecution readiness based on evidence depth (${evScore}%), elements proven (${elemScore}%), corroboration (${corrobScore}%)">
            <span style="color:${readinessColor};font-weight:700;letter-spacing:.5px;min-width:80px">${readinessLabel}</span>
            <span style="color:var(--text3)">Evidence</span><div style="width:40px;height:3px;background:var(--border);border-radius:2px;overflow:hidden"><div style="height:100%;width:${evScore}%;background:${evScore >= 80 ? 'var(--green)' : evScore >= 50 ? 'var(--primary)' : 'var(--red)'}"></div></div>
            <span style="color:var(--text3)">Elements</span><div style="width:40px;height:3px;background:var(--border);border-radius:2px;overflow:hidden"><div style="height:100%;width:${elemScore}%;background:${elemScore >= 80 ? 'var(--green)' : elemScore >= 50 ? 'var(--primary)' : 'var(--red)'}"></div></div>
            <span style="color:var(--text3)">Corroboration</span><div style="width:40px;height:3px;background:var(--border);border-radius:2px;overflow:hidden"><div style="height:100%;width:${corrobScore}%;background:${corrobScore >= 80 ? 'var(--green)' : corrobScore >= 50 ? 'var(--primary)' : 'var(--red)'}"></div></div>
          </div>`;
        })()}
        <div class="section-preview" style="padding:4px 20px 6px;font-size:10px;color:var(--text3);line-height:1.4;overflow:hidden;white-space:nowrap;text-overflow:ellipsis">${s.key_facts[0] || s.content.slice(0, 120).replace(/\n/g, ' ')}${s.key_facts.length > 1 ? ' &middot; <span style="color:var(--text2)">' + s.key_facts[1] + '</span>' : ''}</div>
        <div class="section-content${sIdx < 3 ? ' open' : ''}" id="content-${s.id}">
          <!-- Section metadata -->
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;padding-bottom:8px;border-bottom:1px solid var(--border)">
            <div style="font-size:9px;color:var(--text3)" id="meta-${s.id}">
              ${s.last_regenerated ? `Updated: <strong style="color:var(--text2)">${new Date(s.last_regenerated).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</strong>` : ''}
              ${s.regeneration_log && s.regeneration_log.length > 0 ? ` &middot; ${s.regeneration_log.length} evolution${s.regeneration_log.length > 1 ? 's' : ''}` : ''}
            </div>
            <div style="display:flex;gap:6px">
              <button class="btn btn-secondary btn-sm" onclick="event.stopPropagation();copyLink('${s.id}')" style="font-size:9px" title="Copy link">&#x1F517;</button>
              <button class="btn btn-secondary btn-sm" onclick="event.stopPropagation();showClaimGraphFromSection('${s.number}');" style="font-size:9px" title="Evidence graph">&#x1F4CA;</button>
            </div>
          </div>
          <!-- Burden of proof -->
          ${(() => {
            if (strength === 0 || elements.length === 0) return '';
            const criminalSections = [2, 4, 8, 12, 13, 14, 15, 17];
            const isCriminal = criminalSections.includes(s.number);
            const threshold = isCriminal ? 95 : 51;
            const standard = isCriminal ? 'Beyond Reasonable Doubt' : 'Preponderance of Evidence';
            const standardShort = isCriminal ? 'BRD' : 'PoE';
            const met = strength >= threshold;
            const gapPct = threshold - strength;
            const barWidth = Math.min(100, Math.round((strength / threshold) * 100));
            return '<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;padding:6px 12px;border-radius:6px;background:' + (met ? 'rgba(90,138,90,.04)' : 'rgba(184,66,51,.04)') + '">' +
              '<span style="font-size:8px;font-weight:700;letter-spacing:.5px;color:var(--text3);min-width:26px">' + standardShort + '</span>' +
              '<div style="flex:1;position:relative;height:12px;background:var(--border);border-radius:6px;overflow:hidden">' +
                '<div style="height:100%;width:' + barWidth + '%;background:' + (met ? 'var(--green)' : strength >= threshold * 0.7 ? 'var(--primary)' : 'var(--red)') + ';border-radius:6px;transition:width .5s"></div>' +
                '<div style="position:absolute;left:' + Math.min(98, Math.round((threshold / 100) * 100)) + '%;top:0;height:100%;width:2px;background:var(--text);opacity:.3" title="Threshold: ' + threshold + '%"></div>' +
              '</div>' +
              '<span style="font-size:8px;min-width:100px;color:' + (met ? 'var(--green)' : 'var(--text2)') + '">' +
                (met ? '<strong style="color:var(--green)">&#x2705; MEETS</strong> ' + standard : '<span style="color:var(--red)">' + gapPct + '% gap</span> to ' + standard) +
              '</span>' +
            '</div>';
          })()}
          <!-- Jurisdiction tags -->
          ${s.jurisdictions && s.jurisdictions.length > 0 ? `<div style="display:flex;gap:6px;margin-bottom:12px;flex-wrap:wrap">
            <span style="font-size:9px;color:var(--text3);font-weight:600;line-height:22px">Applicable to:</span>
            ${(s.jurisdictions as string[]).map((j: string) => {
              const jColor = j === 'Dubai' ? '#c47a4a' : j === 'NDCA' ? '#3b82f6' : j === 'Delaware' ? '#7a6398' : j === 'BVI' ? '#5a8a5e' : '#9a9087';
              return `<span style="font-size:9px;padding:3px 10px;border-radius:12px;border:1px solid ${jColor}40;color:${jColor};font-weight:600;background:${jColor}08">${j}</span>`;
            }).join('')}
          </div>` : ''}
          <!-- Statute of limitations -->
          ${(() => {
            // SOL based on crime type + jurisdiction — real CA/Federal/Dubai statutes
            const solMap: Record<string, { statute: string; years: number; from: string; basis: string }> = {
              '1': { statute: 'Cal. Penal Code &sect; 803(c)', years: 4, from: '2019-06-01', basis: 'Fraud: 4 years from discovery (discovered 2019)' },
              '2': { statute: 'Cal. Penal Code &sect; 487/801', years: 3, from: '2020-01-01', basis: 'Grand Theft: 3 years from commission' },
              '3': { statute: 'Cal. Penal Code &sect; 803(c)', years: 4, from: '2019-06-01', basis: 'Identity Fraud: 4 years from discovery' },
              '4': { statute: '28 U.S.C. &sect; 1658(b)', years: 5, from: '2021-11-08', basis: 'Securities fraud: 5 years from violation (Messenger msgs Nov 2021)' },
              '5': { statute: 'Cal. Civ. Code &sect; 338(d)', years: 3, from: '2022-01-15', basis: 'Reputational: 3 years from ZachXBT callout' },
              '6': { statute: 'Cal. Penal Code &sect; 803(c)', years: 4, from: '2024-02-28', basis: 'Fraud: 4 years from DHTY forensic discovery' },
              '8': { statute: 'Cal. Penal Code &sect; 524/801', years: 3, from: '2022-01-01', basis: 'Extortion: 3 years from threat campaign' },
              '9': { statute: 'Cal. Civ. Code &sect; 337', years: 4, from: '2022-09-01', basis: 'Contract (duress): 4 years from Term Sheet signing' },
              '12': { statute: '18 U.S.C. &sect; 3293', years: 10, from: '2020-01-01', basis: 'Wire fraud/embezzlement: 10 years (financial institution)' },
              '13': { statute: '18 U.S.C. &sect; 1519', years: 20, from: '2022-06-01', basis: 'Obstruction/evidence destruction: 20 years max' },
              '14': { statute: '18 U.S.C. &sect; 1030(g)', years: 2, from: '2023-09-22', basis: 'CFAA (digital seizure): 2 years from damage' },
              '15': { statute: '18 U.S.C. &sect; 1956(a)', years: 10, from: '2024-01-06', basis: 'Money laundering: 10 years from transaction' },
              '16': { statute: '18 U.S.C. &sect; 1343', years: 5, from: '2024-01-06', basis: 'Wire fraud (token theft): 5 years from transfer' },
              '17': { statute: '18 U.S.C. &sect; 1964(c)', years: 4, from: '2024-02-28', basis: 'Civil RICO: 4 years from pattern discovery' },
              '18': { statute: '28 U.S.C. &sect; 2462', years: 5, from: '2019-01-01', basis: 'SEC enforcement: 5 years from violation' },
            };
            const sol = solMap[String(s.number)];
            if (!sol) return '';
            const expiryDate = new Date(sol.from);
            expiryDate.setFullYear(expiryDate.getFullYear() + sol.years);
            const daysLeft = Math.round((expiryDate.getTime() - Date.now()) / 86400000);
            const expired = daysLeft <= 0;
            const urgent = daysLeft > 0 && daysLeft <= 180;
            const safe = daysLeft > 365;
            const statusColor = expired ? 'var(--red)' : urgent ? 'var(--orange)' : safe ? 'var(--green)' : 'var(--text2)';
            const statusLabel = expired ? 'EXPIRED' : urgent ? 'URGENT' : safe ? 'SAFE' : (Math.round(daysLeft / 30) + ' months');
            return '<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;padding:6px 12px;border-radius:6px;background:' + (expired ? 'rgba(184,66,51,.06)' : urgent ? 'rgba(196,122,74,.04)' : 'transparent') + ';border:1px solid ' + (expired || urgent ? statusColor + '30' : 'transparent') + '">' +
              '<span style="font-size:8px;font-weight:700;letter-spacing:.5px;color:var(--text3)">SOL:</span>' +
              '<span style="font-size:9px;font-weight:700;color:' + statusColor + '">' + statusLabel + (expired ? '' : ' &middot; ' + (daysLeft > 365 ? Math.round(daysLeft/365) + 'y' : daysLeft + 'd') + ' remaining') + '</span>' +
              '<span style="font-size:8px;color:var(--text3)">' + sol.statute + '</span>' +
              '<span style="font-size:8px;color:var(--text3)" title="' + sol.basis + '">Expires ' + expiryDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + '</span>' +
              '</div>';
          })()}
          <!-- Case impact mapping -->
          ${(() => {
            if (!claimId) return '';
            const relevantCases = cases.filter(c => c.connected_claims && (c.connected_claims as string[]).includes(claimId));
            if (relevantCases.length === 0) return '';
            return '<div style="display:flex;gap:6px;margin-bottom:12px;flex-wrap:wrap;align-items:center">' +
              '<span style="font-size:9px;color:var(--text3);font-weight:600;letter-spacing:.5px">IMPACTS:</span>' +
              relevantCases.map(c => {
                const d = daysUntil(c.next_deadline);
                const urgColor = d <= 3 ? 'var(--red)' : d <= 7 ? 'var(--orange)' : 'var(--text2)';
                return '<span style="font-size:10px;padding:3px 10px;border-radius:6px;background:var(--bg);border:1px solid var(--border);display:inline-flex;align-items:center;gap:4px">' +
                  '<span style="font-weight:600">' + c.short_name + '</span>' +
                  '<span style="color:' + urgColor + ';font-size:9px">' + d + 'd</span>' +
                  '</span>';
              }).join('') +
              '</div>';
          })()}
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
            <div style="font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:1px;color:var(--text3)">Legal Elements</div>
            <div style="display:flex;gap:6px">
              <button class="btn btn-secondary btn-sm" onclick="event.stopPropagation();copyLink('${s.id}')" style="font-size:10px" title="Copy link to this section">&#x1F517; Share</button>
              <button class="btn btn-secondary btn-sm" onclick="event.stopPropagation();copyCitation(${s.number},'${s.title.replace(/'/g, '\u2019')}')" style="font-size:10px" title="Copy legal citation">&#x1F4CB; Cite</button>
              <button class="btn btn-secondary btn-sm" onclick="event.stopPropagation();showClaimGraphFromSection('${s.number}');" style="font-size:10px">View Evidence Graph</button>
            </div>
          </div>
          ${elements.length > 0 ? `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:8px;margin-bottom:16px;padding:12px;background:var(--bg);border-radius:8px;border:1px solid var(--border)">
            ${elements.map((el, elIdx) => {
              const statusIcon = el.status === 'proven' ? '&#x2705;' : el.status === 'partial' ? '&#x1F7E1;' : '&#x274C;';
              const statusColor = el.status === 'proven' ? 'var(--green)' : el.status === 'partial' ? 'var(--primary)' : 'var(--red)';
              const suppEvIds = (el as unknown as { supporting_evidence?: string[] }).supporting_evidence || [];
              const contEvIds = (el as unknown as { contradicting_evidence?: string[] }).contradicting_evidence || [];
              const elUid = s.id + '-el-' + elIdx;
              // Look up evidence titles from cubbies + cross-citations
              const evTitles = suppEvIds.map(eid => {
                const ev = allData['evidence/' + eid] as { title?: string; type?: string; key_finding?: string } | undefined;
                // Find which other sections also use this evidence
                const otherSections: number[] = [];
                sections.forEach(otherSec => {
                  if (otherSec.number === s.number) return;
                  const otherClaimId = sectionToClaimMap[String(otherSec.number)];
                  if (!otherClaimId) return;
                  const otherClaim = allData['claims/' + otherClaimId] as { evidence_chain?: string[]; elements?: Array<{ supporting_evidence?: string[] }> } | undefined;
                  const hasEv = otherClaim?.evidence_chain?.includes(eid) || otherClaim?.elements?.some(e => e.supporting_evidence?.includes(eid));
                  if (hasEv) otherSections.push(otherSec.number);
                });
                return ev ? { id: eid, title: ev.title || eid, type: ev.type || '', finding: ev.key_finding || '', crossCite: otherSections } : { id: eid, title: eid, type: '', finding: '', crossCite: otherSections };
              });
              return `<div style="padding:8px;background:var(--surface);border-radius:6px;border-left:3px solid ${statusColor};cursor:pointer" onclick="var d=document.getElementById('${elUid}');d.style.display=d.style.display==='none'?'block':'none'">
                <div style="font-size:11px;font-weight:600;display:flex;align-items:center;gap:4px">${statusIcon} ${el.name}</div>
                <div style="font-size:9px;color:var(--text3);margin-top:2px">${el.status.toUpperCase()} &middot; ${suppEvIds.length} supporting${contEvIds.length > 0 ? ' &middot; ' + contEvIds.length + ' contradicting' : ''}</div>
                ${(el as unknown as { gap_description?: string }).gap_description ? `<div style="font-size:9px;color:var(--red);margin-top:3px;font-style:italic">Gap: ${(el as unknown as { gap_description: string }).gap_description}</div>` : ''}
                <div id="${elUid}" style="display:none;margin-top:6px;padding-top:6px;border-top:1px solid var(--border)">
                  ${evTitles.length > 0 ? evTitles.map(ev => {
                    // Admissibility classification for lawyers
                    const admissibility: Record<string, { label: string; color: string; tip: string }> = {
                      'filing': { label: 'SELF-AUTH', color: 'var(--green)', tip: 'Self-authenticating under FRE 902' },
                      'declaration': { label: 'SWORN', color: 'var(--green)', tip: 'Sworn declaration — admissible under penalty of perjury' },
                      'report': { label: 'EXPERT', color: 'var(--green)', tip: 'Expert report — admissible under FRE 702/703' },
                      'blockchain_tx': { label: 'FRE 902(13)', color: 'var(--cyan)', tip: 'Blockchain record — certifiable under FRE 902(13)/902(14)' },
                      'email': { label: 'AUTH REQ', color: 'var(--primary)', tip: 'Requires authentication under FRE 901(b)(4)' },
                      'screenshot': { label: 'FOUNDATION', color: 'var(--red)', tip: 'Needs foundation witness — FRE 901(b)(1)' },
                    };
                    const adm = admissibility[ev.type] || { label: 'REVIEW', color: 'var(--text3)', tip: 'Admissibility needs review' };
                    return `<div style="font-size:9px;color:var(--text2);padding:3px 0;display:flex;gap:6px;align-items:flex-start">
                    <span style="color:var(--cyan);flex-shrink:0">${ev.type === 'blockchain_tx' ? '&#x26D3;' : ev.type === 'filing' ? '&#x1F4C4;' : ev.type === 'screenshot' ? '&#x1F4F7;' : ev.type === 'report' ? '&#x1F50D;' : ev.type === 'email' ? '&#x2709;' : ev.type === 'declaration' ? '&#x1F4DC;' : '&#x1F4CE;'}</span>
                    <span style="flex:1">${ev.title}${ev.finding ? '<br><span style="color:var(--text3);font-size:8px">' + ev.finding.slice(0, 100) + (ev.finding.length > 100 ? '...' : '') + '</span>' : ''}${ev.crossCite.length > 0 ? '<br><span style="font-size:7px;color:var(--purple)" title="This evidence also supports ' + ev.crossCite.length + ' other claims — strengthens corroboration">&#x1F517; Also in &sect;' + ev.crossCite.join(', &sect;') + '</span>' : ''}</span>
                    <span style="flex-shrink:0;font-size:7px;font-weight:700;letter-spacing:.5px;padding:1px 4px;border-radius:2px;background:${adm.color}10;color:${adm.color};border:1px solid ${adm.color}30" title="${adm.tip}">${adm.label}</span>
                  </div>`; }).join('') : '<div style="font-size:9px;color:var(--text3)">No evidence yet</div>'}
                </div>
              </div>`;
            }).join('')}
          </div>` : ''}
          ${(() => {
            // Find highest-credibility evidence for this section
            if (claimId) {
              const claimData = allData['claims/' + claimId] as { evidence_chain?: string[] } | undefined;
              const chainIds = claimData?.evidence_chain || [];
              let bestEv: { title: string; source_credibility: number; key_finding: string; type: string } | null = null;
              chainIds.forEach(eid => {
                const ev = allData['evidence/' + eid] as { title?: string; source_credibility?: number; key_finding?: string; type?: string } | undefined;
                if (ev && ev.key_finding && ev.source_credibility && (!bestEv || ev.source_credibility > bestEv.source_credibility)) {
                  bestEv = { title: ev.title || eid, source_credibility: ev.source_credibility, key_finding: ev.key_finding, type: ev.type || '' };
                }
              });
              if (bestEv) {
                const bev = bestEv as { title: string; source_credibility: number; key_finding: string; type: string };
                // Build provenance chain: Sources → Evidence → Elements → Claim → Cases
                const provenEls = elements.filter(e => e.status === 'proven').length;
                const partialEls = elements.filter(e => e.status === 'partial').length;
                const relevantCaseNames = cases.filter(c => c.connected_claims && (c.connected_claims as string[]).includes(claimId!)).map(c => c.short_name);
                const sourceTypes = new Set(chainIds.map(eid => {
                  const ev = allData['evidence/' + eid] as { type?: string } | undefined;
                  return ev?.type || 'unknown';
                }));
                const sourceLabel = Array.from(sourceTypes).map(t =>
                  t === 'report' ? 'Reports' : t === 'filing' ? 'Filings' : t === 'blockchain_tx' ? 'On-Chain' : t === 'screenshot' ? 'Screenshots' : t === 'email' ? 'Emails' : t === 'declaration' ? 'Declarations' : t
                ).join(', ');

                return '<div style="margin-bottom:14px;padding:12px 16px;background:rgba(90,138,90,.04);border:1px solid rgba(90,138,90,.15);border-radius:8px">' +
                  '<div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:var(--green);margin-bottom:4px">&#x2B50; Strongest Evidence (credibility: ' + bev.source_credibility + '/10)</div>' +
                  '<div style="font-size:12px;font-weight:600;color:var(--text)">' + bev.title + '</div>' +
                  '<div style="font-size:11px;color:var(--text2);margin-top:4px;line-height:1.5">' + bev.key_finding + '</div>' +
                  '</div>' +
                  // Provenance chain
                  '<div style="margin-bottom:14px;padding:10px 16px;background:var(--bg);border:1px solid var(--border);border-radius:8px">' +
                  '<div style="font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:var(--text3);margin-bottom:8px">Evidence Provenance Chain</div>' +
                  '<div style="display:flex;align-items:center;gap:0;flex-wrap:wrap;font-size:10px">' +
                  '<div style="text-align:center;padding:6px 10px;background:var(--surface);border:1px solid var(--border);border-radius:6px"><div style="font-size:8px;color:var(--text3);font-weight:600">SOURCES</div><div style="font-weight:600;color:var(--cyan)">' + sourceLabel + '</div></div>' +
                  '<span style="color:var(--primary);padding:0 4px">&rarr;</span>' +
                  '<div style="text-align:center;padding:6px 10px;background:var(--surface);border:1px solid var(--border);border-radius:6px"><div style="font-size:8px;color:var(--text3);font-weight:600">EVIDENCE</div><div style="font-weight:600">' + chainIds.length + ' items</div></div>' +
                  '<span style="color:var(--primary);padding:0 4px">&rarr;</span>' +
                  '<div style="text-align:center;padding:6px 10px;background:var(--surface);border:1px solid var(--border);border-radius:6px"><div style="font-size:8px;color:var(--text3);font-weight:600">ELEMENTS</div><div style="font-weight:600;color:' + (provenEls === elements.length ? 'var(--green)' : 'var(--primary)') + '">' + provenEls + '/' + elements.length + ' proven</div></div>' +
                  '<span style="color:var(--primary);padding:0 4px">&rarr;</span>' +
                  '<div style="text-align:center;padding:6px 10px;background:var(--surface);border:1px solid ' + (strength >= 90 ? 'rgba(90,138,90,.3)' : 'var(--border)') + ';border-radius:6px"><div style="font-size:8px;color:var(--text3);font-weight:600">CLAIM</div><div style="font-weight:700;color:' + (strength >= 90 ? 'var(--green)' : strength >= 70 ? 'var(--primary)' : 'var(--text)') + '">' + strength + '% strength</div></div>' +
                  (relevantCaseNames.length > 0 ? '<span style="color:var(--primary);padding:0 4px">&rarr;</span>' +
                  '<div style="text-align:center;padding:6px 10px;background:var(--surface);border:1px solid var(--border);border-radius:6px"><div style="font-size:8px;color:var(--text3);font-weight:600">CASES</div><div style="font-weight:600">' + relevantCaseNames.join(', ') + '</div></div>' : '') +
                  '</div></div>';
              }
            }
            return '';
          })()}
          ${(() => {
            const quotes: Record<string, { text: string; source: string }> = {
              '1': { text: 'Wang seems to have lied about having graduated from Columbia and Wharton Business School.', source: 'Emmie Chang, SuperBloom co-founder, via QRI Investigation' },
              '2': { text: 'We had to file a criminal complaint to get our stolen laptop back with passwords and IP.', source: 'HBUS (Huobi US) CEO' },
              '4': { text: 'Just pretend you didn&rsquo;t see it. Sign... They are dumb.', source: 'Kenzi Wang to Fred Jin, Facebook Messenger, Nov 8, 2021' },
              '5': { text: 'ZachXBT — crypto&rsquo;s most respected fraud investigator — publicly called out Kenzi for "threatening and abusing founders."', source: 'ZachXBT, January 2022' },
              '8': { text: 'I&rsquo;m going to talk to all of my contacts that I brought in... I will bring all people out of the project.', source: 'Kenzi Wang to Fred Jin, Facebook Messenger, Jan 2022' },
              '10': { text: 'The Term Sheet is Kenzi&rsquo;s written confession. Item 1 admits in writing to taking the $3M stablecoins.', source: 'Legal analysis of DocuSign D183BFD7' },
              '11': { text: 'Wang induced Company investors to provide funds to wallets controlled solely by Wang and Wang failed to report those contributions to the Company.', source: 'Practus LLP, Internal Investigation Report, Nov 7, 2024' },
              '12': { text: 'A total of >$4M was raised from 75 investors by Kenzi Wang, which he didn&rsquo;t account for nor communicate to the team.', source: 'DHTY Forensic Report, Feb 28, 2024' },
              '14': { text: 'Kenzi posted on the hijacked @cerenetwork claiming it was the "ONLY official account on X," redirecting 105,000 followers.', source: 'Twitter/X records, Sep 22, 2023' },
              '16': { text: 'Professional criminals test their escape routes. The test amount (33,333 CERE = exactly 0.1%) proves premeditation.', source: 'Blockchain forensic analysis, Jan 6, 2024' },
              '17': { text: 'Tell a big story, get you to sign an agreement, then starts exhausting your positive energy and ultimately shakes you down.', source: 'Vijay Garg describing Kenzi&rsquo;s modus operandi' },
              '6': { text: 'The blockchain forensics found no on-chain evidence that the stablecoins ever went to Convex Finance. The "Black Swan" story was a total misrepresentation.', source: 'DHTY Forensic Audit, Feb 28, 2024' },
            };
            const quote = quotes[String(s.number)];
            return quote ? `<div style="margin-bottom:16px;padding:16px 20px;border-left:3px solid var(--primary);background:rgba(196,122,74,.03);border-radius:0 8px 8px 0">
              <div style="font-family:var(--serif);font-size:14px;font-style:italic;line-height:1.6;color:var(--text)">"${quote.text}"</div>
              <div style="font-size:10px;color:var(--text3);margin-top:6px">&mdash; ${quote.source}</div>
            </div>` : '';
          })()}
          <div class="section-text">${s.content.split('\n\n').map(p => `<p>${p}</p>`).join('')}</div>

          <!-- Cross-reference callouts -->
          ${s.cross_references.map(cr => {
            const target = sections.find(sec => sec.id === cr.section_id);
            return `<div class="connection-callout" onclick="toggleSection('${cr.section_id}');document.getElementById('${cr.section_id}').scrollIntoView({behavior:'smooth',block:'center'})" style="cursor:pointer">
              <div class="cc-label">Connection &rarr; Section ${target?.number || '?'}: ${target?.title || ''}</div>
              <div class="cc-text">${cr.reason} <span style="color:var(--text3)">(strength: ${Math.round(cr.strength * 100)}%)</span></div>
            </div>`;
          }).join('')}

          <!-- Evidence gap analysis -->
          ${(() => {
            const unprovenEls = elements.filter(e => e.status === 'unproven' || e.status === 'partial');
            if (unprovenEls.length === 0) return '';
            // Map element types to what evidence would close the gap
            const gapRemedies: Record<string, string[]> = {
              'fabrication': ['Certified educational transcripts', 'Employment verification letters', 'LinkedIn snapshot with Wayback Machine'],
              'grand-theft': ['Police report with case number', 'Asset recovery filing', 'Forensic device analysis report'],
              'aliases': ['Government ID records from multiple jurisdictions', 'Passport comparison', 'Corporate filings with different names'],
              'market-manipulation': ['Exchange trading records subpoena', 'Market maker communications', 'Order book forensics'],
              'taint': ['Archived social media posts (Wayback)', 'Third-party investigator declarations'],
              'confrontation': ['Witness declarations from employees present', 'Recorded communications'],
              'reputation': ['Formal disassociation letters', 'Board meeting minutes'],
              'intimidation': ['Threat screenshots with metadata', 'Witness declarations', 'Restraining order records'],
              'term-sheet': ['DocuSign audit trail', 'Communications showing duress', 'Expert witness on contract law'],
              'confession': ['Original Term Sheet certified copy', 'Legal opinion on admissions'],
              'board-investigation': ['Board resolution records', 'Auditor work papers', 'Interview transcripts'],
              'embezzlement': ['Bank statements', 'Wire transfer records', 'Forensic accounting report'],
              'evidence-destruction': ['Telegram server-side records subpoena', 'IT forensic recovery attempt', 'Witness declarations re: deletions'],
              'digital-seizure': ['Domain registrar records', 'Social media platform ownership records', 'DMCA/UDRP filings'],
              'ponzi-laundering': ['Cross-chain tracing report', 'Exchange KYC records subpoena', 'Mixer/tumbler analysis'],
              'vivian-theft': ['KuCoin trading records subpoena', 'Bridge wallet gas funding proof', 'Victim wallet private key control proof'],
              'syndicate': ['RICO enterprise pattern analysis by expert', 'Communications between co-conspirators', 'Parallel victim declarations'],
              'broker-dealer': ['SEC EDGAR filings check', 'FINRA BrokerCheck records', 'Token sale marketing materials'],
            };
            const remedies = claimId ? (gapRemedies[claimId] || ['Additional evidence needed']) : ['Additional evidence needed'];
            return `<div style="margin-bottom:14px;padding:12px 16px;background:rgba(184,66,51,.03);border:1px solid rgba(184,66,51,.1);border-radius:8px">
              <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:var(--red);margin-bottom:8px">&#x1F50E; Evidence Gap Analysis &mdash; ${unprovenEls.length} element${unprovenEls.length > 1 ? 's' : ''} need${unprovenEls.length === 1 ? 's' : ''} work</div>
              ${unprovenEls.map(el => {
                const gapDesc = (el as unknown as { gap_description?: string }).gap_description;
                return `<div style="font-size:10px;color:var(--text2);padding:4px 0;border-bottom:1px solid rgba(184,66,51,.06)">
                  <span style="color:${el.status === 'unproven' ? 'var(--red)' : 'var(--primary)'};font-weight:600">${el.status === 'unproven' ? '&#x274C;' : '&#x1F7E1;'} ${el.name}</span>
                  ${gapDesc ? `<span style="color:var(--text3);font-size:9px"> &mdash; ${gapDesc}</span>` : ''}
                </div>`;
              }).join('')}
              <div style="margin-top:8px;font-size:9px;color:var(--text3)">
                <div style="font-weight:600;color:var(--text2);margin-bottom:3px">To close these gaps, obtain:</div>
                ${remedies.map(r => `<div style="padding:1px 0">&bull; ${r}</div>`).join('')}
              </div>
            </div>`;
          })()}
          <!-- Key facts -->
          <div class="key-facts">
            <h4>Proven Facts (${s.key_facts.length})</h4>
            ${s.key_facts.map(f => `<div class="fact">${f}</div>`).join('')}
            ${s.gaps.map(g => `<div class="gap">GAP: ${g}</div>`).join('')}
          </div>

          <!-- Evidence sub-graphs -->
          ${sectionGraphs.map(g => `
            <div class="evidence-graph" id="graph-${g.id}">
              <div class="eg-header" onclick="toggleEvGraph('${g.id}')">
                <span>${g.title} &mdash; ${g.source}</span>
                <span class="eg-type">${g.type === 'forensic_report' ? '&#x1F50D; Forensic Report' : g.type === 'legal_report' ? '&#x2696; Legal Report' : g.type === 'investigation' ? '&#x1F575; Investigation' : g.type === 'filing' ? '&#x1F4C4; Filing' : g.type === 'email' ? '&#x2709; Email' : g.type === 'blockchain' ? '&#x26D3; Blockchain' : g.type}</span>
              </div>
              <div class="eg-content" id="eg-content-${g.id}">
                <div style="margin-bottom:8px;color:var(--text)">${g.summary}</div>
                <div style="font-weight:600;margin-bottom:4px;color:var(--text3);font-size:10px;text-transform:uppercase">Key Findings</div>
                ${g.key_findings.map(f => `<div class="eg-finding">${f}</div>`).join('')}
                <div class="eg-connected">
                  Connected to: ${g.connected_sections.map(sid => {
                    const sec = sections.find(sec2 => sec2.id === sid);
                    return `<a onclick="toggleSection('${sid}');document.getElementById('${sid}').scrollIntoView({behavior:'smooth'})">${sec?.title || sid}</a>`;
                  }).join(' &middot; ')}
                </div>
              </div>
            </div>
          `).join('')}

          <!-- Regeneration log -->
          ${s.regeneration_log.length > 0 ? `
            <div class="regen-log">
              <h4>Evolution Log</h4>
              ${s.regeneration_log.map(r => `<div class="regen-entry"><strong>${r.date}</strong> (${r.trigger}): ${r.changes}</div>`).join('')}
            </div>
          ` : ''}
        </div>
      </div>`;
    }).join('')}

    <!-- Exhibit Index -->
    <div style="margin-top:32px;padding:20px;background:var(--surface);border:1px solid var(--border);border-radius:12px" id="exhibit-index">
      <div style="font-family:var(--serif);font-size:16px;font-weight:700;margin-bottom:4px">Exhibit Index</div>
      <div style="font-size:10px;color:var(--text3);margin-bottom:12px">Formal exhibit numbering for court filing reference. ${Object.keys(allData).filter(k => k.startsWith('evidence/')).length} items catalogued.</div>
      <table style="width:100%;font-size:10px;border-collapse:collapse">
        <thead>
          <tr style="border-bottom:2px solid var(--border);text-align:left">
            <th style="padding:4px 6px;color:var(--text3);font-weight:600;font-size:8px;width:50px">EXHIBIT</th>
            <th style="padding:4px 6px;color:var(--text3);font-weight:600;font-size:8px">DESCRIPTION</th>
            <th style="padding:4px 6px;color:var(--text3);font-weight:600;font-size:8px;width:70px">TYPE</th>
            <th style="padding:4px 6px;color:var(--text3);font-weight:600;font-size:8px;width:60px">CREDIBILITY</th>
            <th style="padding:4px 6px;color:var(--text3);font-weight:600;font-size:8px;width:80px">SECTIONS</th>
          </tr>
        </thead>
        <tbody>
          ${(() => {
            const allEvidence = Object.entries(allData)
              .filter(([k]) => k.startsWith('evidence/'))
              .map(([k, v]) => ({ id: k.replace('evidence/', ''), ...(v as { title?: string; type?: string; source_credibility?: number; source?: string; key_finding?: string }) }))
              .sort((a, b) => (b.source_credibility || 0) - (a.source_credibility || 0));
            // Map evidence to sections
            const evToSections: Record<string, number[]> = {};
            sections.forEach(sec => {
              const cid = sectionToClaimMap[String(sec.number)];
              if (cid) {
                const cl = allData['claims/' + cid] as { evidence_chain?: string[] } | undefined;
                (cl?.evidence_chain || []).forEach(eid => {
                  if (!evToSections[eid]) evToSections[eid] = [];
                  if (!evToSections[eid].includes(sec.number)) evToSections[eid].push(sec.number);
                });
              }
              // Also check direct evidence_ids
              sec.evidence_ids.forEach((eid: string) => {
                if (!evToSections[eid]) evToSections[eid] = [];
                if (!evToSections[eid].includes(sec.number)) evToSections[eid].push(sec.number);
              });
            });
            const typeIcon = (t: string) => t === 'report' ? '&#x1F50D;' : t === 'filing' ? '&#x1F4C4;' : t === 'blockchain_tx' ? '&#x26D3;' : t === 'screenshot' ? '&#x1F4F7;' : t === 'email' ? '&#x2709;' : t === 'declaration' ? '&#x1F4DC;' : '&#x1F4CE;';
            const typeLabel = (t: string) => t === 'report' ? 'Report' : t === 'filing' ? 'Filing' : t === 'blockchain_tx' ? 'On-Chain' : t === 'screenshot' ? 'Screenshot' : t === 'email' ? 'Email' : t === 'declaration' ? 'Declaration' : t;
            return allEvidence.map((ev, idx) => {
              const exNum = 'Ex. ' + String(idx + 1).padStart(2, '0');
              const cred = ev.source_credibility || 0;
              const credColor = cred >= 9 ? 'var(--green)' : cred >= 7 ? 'var(--primary)' : cred >= 5 ? 'var(--text2)' : 'var(--red)';
              const secs = (evToSections[ev.id] || []).sort((a, b) => a - b);
              return '<tr style="border-bottom:1px solid var(--border)">' +
                '<td style="padding:4px 6px;font-family:var(--mono);font-weight:700;color:var(--primary)">' + exNum + '</td>' +
                '<td style="padding:4px 6px;color:var(--text)">' + (ev.title || ev.id) + '</td>' +
                '<td style="padding:4px 6px;color:var(--text3)">' + typeIcon(ev.type || '') + ' ' + typeLabel(ev.type || '') + '</td>' +
                '<td style="padding:4px 6px;text-align:center;font-weight:700;color:' + credColor + '">' + (cred > 0 ? cred + '/10' : '—') + '</td>' +
                '<td style="padding:4px 6px;font-size:8px;color:var(--text3)">' + (secs.length > 0 ? secs.map(n => '&sect;' + n).join(', ') : '—') + '</td>' +
              '</tr>';
            }).join('');
          })()}
        </tbody>
      </table>
    </div>

    <!-- Document Footer -->
    <div style="margin-top:40px;padding:24px 0;border-top:2px solid var(--border)">
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:24px;font-size:10px;color:var(--text3)">
        <div>
          <div style="font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">Document Information</div>
          <div>Title: The Ken Zi Wang Crime</div>
          <div>Classification: Attorney Work Product / Privileged</div>
          <div>Compiled by: Cere Network Legal Team</div>
          <div>Document ID: KWC-2026-001</div>
        </div>
        <div>
          <div style="font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">Version History</div>
          <div>Original: March 23, 2026 (260 pages)</div>
          <div>Last updated: ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</div>
          <div>Cubby entries: ${Object.keys(allData).length}</div>
          <div>Evidence items: ${Object.keys(allData).filter(k => k.startsWith('evidence/')).length}</div>
        </div>
        <div>
          <div style="font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">Distribution</div>
          <div>Rocky Lee, Esq. — Milliard Law</div>
          <div>Matt Miller / Susanna Chenette — Hanson Bridgett</div>
          <div>Tarek Saad / Ahmed ElSayed — BLK Partners</div>
          <div style="margin-top:6px;font-style:italic">Complete evidentiary record exceeds 600 pages. Additional materials available upon request.</div>
        </div>
      </div>
      <div style="text-align:center;margin-top:20px;font-size:9px;color:var(--text3);letter-spacing:1px">
        CONFIDENTIAL &mdash; ATTORNEY WORK PRODUCT &mdash; PRIVILEGED AND CONFIDENTIAL
      </div>
      <div style="text-align:center;margin-top:6px;font-size:9px;color:var(--text3)">
        Powered by <span style="color:var(--primary);font-weight:600">Claim Intelligence Engine</span> &mdash; Sovereign AI Infrastructure by Cere Network
      </div>
    </div>
  </div>

</div>
</div>

<script src="https://d3js.org/d3.v7.min.js"></script>
<script src="/static/graph-renderer.js"></script>
<script>
// === Claim-to-section mapping ===
var SECTION_MAP = {
  'vivian-theft': 'section-16', 'syndicate': 'section-17', 'fabrication': 'section-1',
  'confrontation': 'section-6', 'embezzlement': 'section-12', 'board-investigation': 'section-11',
  'grand-theft': 'section-2', 'aliases': 'section-3', 'market-manipulation': 'section-4',
  'intimidation': 'section-8', 'term-sheet': 'section-9', 'confession': 'section-10',
  'evidence-destruction': 'section-13', 'digital-seizure': 'section-14',
  'ponzi-laundering': 'section-15', 'broker-dealer': 'section-18',
  'taint': 'section-5', 'reputation': 'section-7'
};

// === State ===
var pendingActions = null;
var pendingImpacts = null;
var enrichmentTimeouts = [];

// === Section toggle ===
// Section number to claim ID mapping
var SECTION_TO_CLAIM = {'1':'fabrication','2':'grand-theft','3':'aliases','4':'market-manipulation','5':'taint','6':'confrontation','7':'reputation','8':'intimidation','9':'term-sheet','10':'confession','11':'board-investigation','12':'embezzlement','13':'evidence-destruction','14':'digital-seizure','15':'ponzi-laundering','16':'vivian-theft','17':'syndicate','18':'broker-dealer'};
function showClaimGraphFromSection(sectionNum) {
  var claimId = SECTION_TO_CLAIM[sectionNum];
  if (claimId && typeof showClaimGraph === 'function') showClaimGraph(claimId);
}

function toggleSection(id) {
  var content = document.getElementById('content-' + id);
  var toggle = document.getElementById('toggle-' + id);
  if (!content || !toggle) return;
  // Find preview sibling
  var section = document.getElementById(id);
  var preview = section ? section.querySelector('.section-preview') : null;
  if (content.classList.contains('open')) {
    content.classList.remove('open');
    toggle.classList.remove('open');
    if (preview) preview.style.display = '';
  } else {
    content.classList.add('open');
    toggle.classList.add('open');
    if (preview) preview.style.display = 'none';
  }
}

// === Evidence graph toggle ===
function toggleEvGraph(id) {
  var content = document.getElementById('eg-content-' + id);
  if (content) content.classList.toggle('open');
}

// === Panel toggles ===
var graphRendered = false;
function togglePanel(id) {
  var panel = document.getElementById(id);
  if (panel) panel.classList.toggle('open');
  // Auto-render graph when first opened (delay to allow layout)
  if (id === 'graph-toggle' && !graphRendered && panel && panel.classList.contains('open')) {
    graphRendered = true;
    setTimeout(function() {
      // Force layout calculation before rendering
      var gc = document.getElementById('main-graph-container');
      if (gc && gc.clientWidth === 0) {
        gc.style.width = (gc.parentElement?.clientWidth - 96 || 800) + 'px';
      }
      renderMainGraph('main-graph-container');
      gc?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 200);
  }
}

// === Cubby inspector ===
function toggleCubby(el, path) {
  var existing = el.nextElementSibling;
  if (existing && existing.classList.contains('inspector-detail')) { existing.remove(); return; }
  fetch('/api/cubby/' + path).then(function(r) { return r.json(); }).then(function(data) {
    var detail = document.createElement('div');
    detail.className = 'inspector-detail';
    detail.textContent = JSON.stringify(data, null, 2);
    el.after(detail);
  }).catch(function() {});
}

// === Notification popup container ===
var notifContainer = document.createElement('div');
notifContainer.id = 'notif-container';
notifContainer.style.cssText = 'position:fixed;top:16px;right:16px;z-index:200;display:flex;flex-direction:column;gap:8px;max-width:400px;pointer-events:none';
document.body.appendChild(notifContainer);

// === Notification popups ===
function showNotification(title, description, severity) {
  var borderColor = severity === 'critical' ? 'rgba(184,66,51,.3)' : 'rgba(196,122,74,.3)';
  var textColor = severity === 'critical' ? '#ef4444' : '#f59e0b';
  var n = document.createElement('div');
  n.style.cssText = 'pointer-events:auto;background:#fff;border:1px solid ' + borderColor + ';border-radius:10px;padding:14px;box-shadow:0 8px 32px rgba(0,0,0,.5);animation:fadeIn .4s;cursor:pointer;transition:opacity .3s';
  n.innerHTML = '<div style="font-size:12px;font-weight:700;color:' + textColor + '">' + title + '</div><div style="font-size:10px;color:#8b95a8;margin-top:4px;line-height:1.4">' + description + '</div>';
  n.onclick = function() { n.style.opacity = '0'; setTimeout(function() { if (n.parentElement) n.remove(); }, 300); };
  notifContainer.appendChild(n);
  setTimeout(function() { if (n.parentElement) { n.style.opacity = '0'; setTimeout(function() { if (n.parentElement) n.remove(); }, 300); } }, 12000);
}

function showStakeholderNotifications(actions, impacts, alerts) {
  alerts.forEach(function(a, i) {
    setTimeout(function() {
      showNotification(a.title, a.description, a.severity);
    }, i * 600);
  });
  // Also show action notifications for high-priority items
  if (actions && actions.length > 0) {
    var urgent = actions.filter(function(a) { return a.priority === 'critical' || a.sla_hours <= 24; });
    urgent.forEach(function(a, i) {
      setTimeout(function() {
        showNotification('ACTION: ' + a.title, a.description + ' (' + a.sla_hours + 'h SLA)', 'high');
      }, (alerts.length + i) * 600);
    });
  }
}

// === Process log ===
function addLog(step, message) {
  var log = document.getElementById('process-log');
  if (!log) return;
  log.classList.add('active');
  var time = new Date().toLocaleTimeString();
  var cls = step === 'complete' ? 'ok' : (step === 'error' ? '' : 'run');
  var line = document.createElement('div');
  line.className = 'log-line';
  if (step === 'error') {
    line.innerHTML = '<span style="color:var(--text3);margin-right:6px">' + time + '</span><span class="tag" style="color:var(--red)">[ERROR]</span> ' + message;
  } else {
    line.innerHTML = '<span style="color:var(--text3);margin-right:6px">' + time + '</span><span class="tag ' + cls + '">[' + step.toUpperCase() + ']</span> ' + message;
  }
  log.appendChild(line);
  log.scrollTop = log.scrollHeight;
}

// === SSE connection ===
var evtSource = null;
function connectSSE() {
  if (evtSource) { try { evtSource.close(); } catch(e) {} }
  evtSource = new EventSource('/api/events');
  evtSource.onmessage = function(e) {
    try { handleEvent(JSON.parse(e.data)); }
    catch(err) { console.error('SSE parse error:', err, e.data); }
  };
  evtSource.onerror = function() {
    // Auto-reconnect is built into EventSource, but log it
    console.warn('SSE connection error, will auto-reconnect');
  };
}
connectSSE();

// === Main event handler ===
function handleEvent(e) {
  if (e.type === 'reset') { location.reload(); return; }

  if (e.type === 'step') {
    handleStepEvent(e.data);
    return;
  }

  if (e.type === 'evidence_graph_update') {
    handleEvidenceGraphUpdate(e.data);
    return;
  }

  if (e.type === 'graph_update') {
    handleGraphUpdate(e.data);
    return;
  }

  // What's New summary for lawyers
  if (e.type === 'whats_new') {
    var wn = e.data;
    var banners = document.getElementById('alert-banners');
    if (banners) {
      var summary = document.createElement('div');
      summary.style.cssText = 'margin:0 48px 16px;padding:24px;background:var(--surface);border:1px solid var(--border);border-radius:12px;animation:fadeIn .5s;border-left:4px solid var(--primary)';
      var claimCount = (wn.enriched_claims || []).length;
      var caseCount = (wn.impacted_cases || []).length;
      var html = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">' +
        '<div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:var(--primary)">&#x2709; Evidence Intake Complete</div>' +
        '<div style="font-size:9px;color:var(--text3)">' + new Date().toLocaleTimeString() + '</div>' +
      '</div>';
      html += '<div style="font-family:var(--serif);font-size:18px;font-weight:700;margin-bottom:14px;line-height:1.3">' + escapeHtml(wn.headline) + '</div>';

      // Key metrics row
      html += '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:14px">' +
        '<div style="padding:8px;background:var(--bg);border-radius:6px;text-align:center"><div style="font-size:18px;font-weight:800;color:var(--primary)">' + claimCount + '</div><div style="font-size:8px;color:var(--text3)">Claims Enriched</div></div>' +
        '<div style="padding:8px;background:var(--bg);border-radius:6px;text-align:center"><div style="font-size:18px;font-weight:800;color:var(--cyan)">' + caseCount + '</div><div style="font-size:8px;color:var(--text3)">Cases Affected</div></div>' +
        '<div style="padding:8px;background:var(--bg);border-radius:6px;text-align:center"><div style="font-size:18px;font-weight:800;color:var(--red)">' + (wn.action_count || 0) + '</div><div style="font-size:8px;color:var(--text3)">Action Items</div></div>' +
        '<div style="padding:8px;background:var(--bg);border-radius:6px;text-align:center"><div style="font-size:18px;font-weight:800;color:var(--green)">4</div><div style="font-size:8px;color:var(--text3)">AI Agents Used</div></div>' +
      '</div>';

      // Claims list
      if (wn.enriched_claims && wn.enriched_claims.length > 0) {
        html += '<div style="font-size:11px;color:var(--text2);margin-bottom:8px"><strong style="color:var(--text)">Claims strengthened:</strong> ' + wn.enriched_claims.map(function(c) { return escapeHtml(c); }).join(' &middot; ') + '</div>';
      }
      if (wn.impacted_cases && wn.impacted_cases.length > 0) {
        html += '<div style="font-size:11px;color:var(--text2);margin-bottom:8px"><strong style="color:var(--text)">Cases affected:</strong> ' + wn.impacted_cases.map(function(c) { return escapeHtml(c); }).join(' &middot; ') + '</div>';
      }

      // Key legal insight
      if (wn.key_insight) {
        html += '<div style="margin-top:12px;padding:12px 16px;background:rgba(196,122,74,.05);border-left:3px solid var(--primary);border-radius:0 8px 8px 0">' +
          '<div style="font-size:9px;font-weight:700;color:var(--primary);margin-bottom:4px">KEY LEGAL INSIGHT</div>' +
          '<div style="font-size:12px;color:var(--text);line-height:1.6">' + escapeHtml(wn.key_insight) + '</div>' +
        '</div>';
      }

      // Lawyer-friendly action callout
      html += '<div style="margin-top:12px;padding:12px 16px;background:rgba(90,138,138,.04);border:1px solid rgba(90,138,138,.15);border-radius:8px">' +
        '<div style="font-size:9px;font-weight:700;color:var(--cyan);margin-bottom:4px">RECOMMENDED NEXT STEPS</div>' +
        '<div style="font-size:11px;color:var(--text2);line-height:1.6">' +
          '1. Review the highlighted sections above — new evidence callouts are marked in cyan<br>' +
          '2. Check the updated strength scores and prosecution readiness bars<br>' +
          '3. The Anti-Suit Injunction motion is now stronger — Rocky&rsquo;s email confirms no CEO authorization<br>' +
          '4. Scroll down to the sidebar Attorney Action Items for per-attorney tasks' +
        '</div>' +
      '</div>';

      summary.innerHTML = html;
      banners.insertBefore(summary, banners.firstChild);
      summary.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  if (e.type === 'error') {
    handleError(e.data);
    return;
  }
}

// === Step event handler ===
function handleStepEvent(d) {
  addLog(d.step, d.message || '');

  if (d.step === 'proposed') {
    handleProposed(d);
  } else if (d.step === 'scored') {
    handleScored(d);
  } else if (d.step === 'analyzed') {
    handleAnalyzed(d);
  } else if (d.step === 'alerts') {
    handleAlerts(d);
  } else if (d.step === 'complete') {
    handleComplete(d);
  }
}

// === PROPOSED: auto-open sections, inject enrichment callouts ===
function handleProposed(d) {
  if (!d.enrichments || !d.enrichments.length) return;

  var firstSectionId = null;

  d.enrichments.forEach(function(en, i) {
    var sectionId = SECTION_MAP[en.claim_id];
    if (!sectionId) return;
    var section = document.getElementById(sectionId);
    if (!section) return;

    if (i === 0) firstSectionId = sectionId;

    var tid = setTimeout(function() {
      // 1. Highlight section with affected glow
      section.classList.add('affected');

      // 2. Add NEW EVIDENCE badge to section header
      var right = section.querySelector('.section-right');
      if (right && !right.querySelector('.section-badge.updated')) {
        var badge = document.createElement('span');
        badge.className = 'section-badge updated';
        badge.textContent = 'NEW EVIDENCE';
        right.insertBefore(badge, right.firstChild);
      }

      // 3. Auto-open the section
      var content = document.getElementById('content-' + sectionId);
      var toggle = document.getElementById('toggle-' + sectionId);
      if (content && !content.classList.contains('open')) {
        content.classList.add('open');
        if (toggle) toggle.classList.add('open');
      }

      // 4. Inject cyan NEW EVIDENCE callout with actual enrichment text + delta
      if (content && en.changes) {
        // Get current evidence count from the badge
        var evBadge = section.querySelector('.section-badge.evidence');
        var currentCount = evBadge ? parseInt(evBadge.textContent) : 0;

        // Capture current strength for before/after comparison (will be updated by handleScored with real data)
        var strengthEl = section.querySelector('.section-right span[style*="font-size:13px"]');
        var beforeStrength = strengthEl ? parseInt(strengthEl.textContent) : 0;
        // Store before-strength on the section for handleScored to use
        if (beforeStrength > 0) section.setAttribute('data-before-strength', String(beforeStrength));

        var callout = document.createElement('div');
        callout.className = 'connection-callout new kenzi-injected';
        var deltaHtml = currentCount > 0
          ? '<div style="display:flex;gap:16px;margin-bottom:8px;font-size:11px">' +
            '<span style="color:var(--text3)">' + currentCount + ' evidence items</span>' +
            '<span style="color:var(--primary);font-weight:700">&rarr; ' + (currentCount + 1) + ' items (+1 NEW)</span>' +
            (beforeStrength > 0 ? '<span style="color:var(--text3);margin-left:12px">Strength update pending scoring...</span>' : '') +
            '</div>'
          : '';
        callout.innerHTML = '<div class="cc-label">&#x2709; New Evidence from Rocky Lee \u2014 ' + new Date().toLocaleDateString() + '</div>' +
          deltaHtml +
          '<div class="cc-text">' + escapeHtml(en.changes) + '</div>';
        var sectionText = content.querySelector('.section-text');
        if (sectionText) {
          sectionText.parentNode.insertBefore(callout, sectionText);
        } else {
          content.insertBefore(callout, content.firstChild);
        }

        // Update the evidence badge count
        if (evBadge) evBadge.textContent = (currentCount + 1) + ' evidence';

        // 4b. Flash prosecution readiness and burden of proof indicators
        var readinessBar = section.querySelector('[title*="Prosecution readiness"]');
        if (readinessBar) {
          readinessBar.style.transition = 'background .3s';
          readinessBar.style.background = 'rgba(90,138,138,.12)';
          setTimeout(function() { readinessBar.style.background = ''; }, 2000);
        }
        var bopBar = section.querySelector('[title*="Meets"][title*="BRD"], [title*="Meets"][title*="PoE"], [title*="Gap"][title*="BRD"], [title*="Gap"][title*="PoE"]');
        if (!bopBar) bopBar = content ? content.querySelector('div[style*="BRD"], div[style*="PoE"]') : null;

        // 4c. Add "UPDATED" pulse to confidence tag
        var confTag = section.querySelector('[title*="Evidence confidence"]');
        if (confTag) {
          var origText = confTag.textContent;
          confTag.textContent = '\u2191';
          confTag.style.color = 'var(--green)';
          setTimeout(function() { confTag.textContent = origText; confTag.style.color = ''; }, 3000);
        }

        // 4d. Update activity feed in sidebar
        var actFeed = document.querySelector('.sb-section + div');
        if (actFeed && actFeed.parentElement) {
          var feedItem = document.createElement('div');
          feedItem.style.cssText = 'padding:3px 0;font-size:9px;display:flex;gap:6px;align-items:start;border-bottom:1px solid var(--border);animation:fadeIn .5s';
          feedItem.innerHTML = '<span style="flex-shrink:0">&#x1F916;</span><div style="flex:1"><div style="color:var(--cyan);line-height:1.3">AI enriched: ' + escapeHtml(en.claim_id || 'section') + '</div><div style="font-size:7px;color:var(--text3)">' + new Date().toLocaleTimeString() + '</div></div>';
          actFeed.insertBefore(feedItem, actFeed.firstChild);
        }
      }

      // 4e. Update section "Updated" timestamp
      var metaEl = document.getElementById('meta-' + sectionId);
      if (metaEl) {
        var now = new Date();
        metaEl.innerHTML = 'Updated: <strong style="color:var(--green)">Just now</strong> <span style="color:var(--cyan);font-weight:600">&bull; AI-enriched</span>';
      }

      // 5. Add entry to regeneration log
      if (content) {
        var regenLog = content.querySelector('.regen-log');
        if (!regenLog) {
          regenLog = document.createElement('div');
          regenLog.className = 'regen-log';
          regenLog.innerHTML = '<h4>Evolution Log</h4>';
          content.appendChild(regenLog);
        }
        var entry = document.createElement('div');
        entry.className = 'regen-entry new kenzi-injected';
        entry.innerHTML = '<strong>' + new Date().toISOString().split('T')[0] + '</strong> (rocky-goopal-email): ' + escapeHtml(en.changes || 'Evidence enriched this section');
        regenLog.appendChild(entry);
      }

      // 6. Scroll to first affected section
      if (i === 0) {
        section.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, i * 800);
    enrichmentTimeouts.push(tid);
  });
}

// === SCORED: add relevance badges to section headers ===
function handleScored(d) {
  if (!d.scores || !d.scores.length) return;

  d.scores.forEach(function(s) {
    var sectionId = SECTION_MAP[s.claimId];
    if (!sectionId || s.score < 0.3) return;

    var section = document.getElementById(sectionId);
    if (!section) return;

    // Always add the score — even if already affected by enrichment
    section.classList.add('affected');
    var right = section.querySelector('.section-right');
    if (!right) return;

    // Update strength display with before/after if we have stored before-strength
    var beforeStr = parseInt(section.getAttribute('data-before-strength') || '0');
    if (beforeStr > 0 && s.score >= 0.3) {
      var delta = Math.round(s.score * 8); // relevance score determines strength increase (max +8%)
      var afterStr = Math.min(100, beforeStr + delta);
      var strengthEl = section.querySelector('.section-right span[style*="font-size:13px"]');
      if (strengthEl) {
        strengthEl.innerHTML = '<span style="text-decoration:line-through;color:var(--text3);font-size:10px">' + beforeStr + '%</span> <span style="color:var(--green)">' + afterStr + '%</span> <span style="font-size:8px;color:var(--green)">+' + delta + '</span>';
      }
    }

    // Check if there's already a relevance badge (not an enrichment badge)
    var existingRelevance = right.querySelector('.section-badge.relevance-score');
    if (existingRelevance) {
      existingRelevance.textContent = Math.round(s.score * 100) + '% relevant';
      return;
    }

    var badge = document.createElement('span');
    badge.className = 'section-badge updated relevance-score kenzi-injected';
    badge.textContent = Math.round(s.score * 100) + '% relevant';
    badge.title = s.reasoning || '';
    // Insert after any existing NEW EVIDENCE badge
    var existingUpdated = right.querySelector('.section-badge.updated');
    if (existingUpdated && existingUpdated.nextSibling) {
      right.insertBefore(badge, existingUpdated.nextSibling);
    } else if (existingUpdated) {
      right.appendChild(badge);
    } else {
      right.insertBefore(badge, right.firstChild);
    }
  });
}

// === ANALYZED: store impacts/actions, generate email previews ===
function handleAnalyzed(d) {
  pendingActions = d.actions || [];
  pendingImpacts = d.impacts || [];
  showEmailPreviews(pendingActions, pendingImpacts);

  // Show action badge in demo bar
  var actionCount = pendingActions.length;
  var impactCount = pendingImpacts.length;
  var badge = document.getElementById('action-badge');
  if (badge && (actionCount > 0 || impactCount > 0)) {
    badge.style.display = 'inline';
    badge.textContent = actionCount + ' actions \u00B7 ' + impactCount + ' cases affected';
  }
}

// === ALERTS: inject banners + fire notification popups ===
function handleAlerts(d) {
  if (!d.alerts || !d.alerts.length) return;

  var container = document.getElementById('alert-banners');
  if (!container) return;

  d.alerts.forEach(function(a, i) {
    setTimeout(function() {
      var div = document.createElement('div');
      div.className = 'alert-banner ' + (a.severity || 'high') + ' kenzi-injected';
      div.style.display = 'block';
      div.innerHTML = '<div class="ab-title">' + escapeHtml(a.title) + '</div><div class="ab-body">' + escapeHtml(a.description) + '</div>';
      container.appendChild(div);
    }, i * 400);
  });

  // Fire notification popups
  showStakeholderNotifications(pendingActions || [], pendingImpacts || [], d.alerts);
}

// === COMPLETE: re-enable trigger button ===
function handleComplete(d) {
  var btn = document.getElementById('btn-trigger');
  if (btn) {
    btn.disabled = false;
    btn.textContent = 'Run Again';
    btn.style.background = 'var(--green)';
    btn.style.borderColor = 'var(--green)';
    setTimeout(function() {
      btn.textContent = 'Simulate Rocky\u2019s Email';
      btn.style.background = '';
      btn.style.borderColor = '';
    }, 5000);
  }
  // Clear progress timer and show duration
  var elapsed = '';
  if (window._progressInterval) {
    clearInterval(window._progressInterval);
    window._progressInterval = null;
  }
  if (window._triggerStart) {
    var secs = Math.round((Date.now() - window._triggerStart) / 1000);
    elapsed = ' in ' + (secs >= 60 ? Math.floor(secs/60) + 'm ' + (secs%60) + 's' : secs + 's');
  }
  var status = document.getElementById('demo-status');
  if (status) status.innerHTML = '<span style="color:var(--green);font-weight:700">&#x2713; Pipeline complete' + elapsed + '</span> &mdash; scroll down to see enriched sections';
  // Increment evidence count
  var evStat = document.getElementById('stat-evidence');
  if (evStat) evStat.textContent = String(parseInt(evStat.textContent || '0') + 1);
  // Update "Live" timestamp in header
  var liveTs = document.querySelector('.doc-header [style*="Live"]');
  if (liveTs) {
    var parent = liveTs.closest('div');
    if (parent) {
      var tsSpan = parent.querySelector('strong');
      if (tsSpan) tsSpan.textContent = new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + ' ' + new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    }
  }
}

// === Evidence graph update: highlight sub-graph, add update note ===
function handleEvidenceGraphUpdate(gd) {
  if (!gd || !gd.graph_id) return;

  var graphEl = document.getElementById('graph-' + gd.graph_id);
  if (!graphEl) return;

  // Highlight the evidence graph container
  graphEl.style.borderColor = 'var(--cyan)';
  graphEl.style.background = 'rgba(6,182,212,.05)';
  graphEl.classList.add('kenzi-injected-graph');

  // Open graph content and add update note
  var egContent = document.getElementById('eg-content-' + gd.graph_id);
  if (egContent) {
    egContent.classList.add('open');

    if (gd.update_note) {
      var note = document.createElement('div');
      note.className = 'kenzi-injected';
      note.style.cssText = 'background:rgba(6,182,212,.08);border-left:3px solid var(--cyan);padding:8px 12px;margin-top:8px;border-radius:0 6px 6px 0;font-size:11px;animation:fadeIn .5s';
      note.innerHTML = '<strong style="color:var(--cyan)">UPDATED</strong> <span style="color:var(--text2)">' + escapeHtml(gd.update_note) + '</span>';
      egContent.appendChild(note);
    }
  }

  // Open parent section if closed
  var parentSection = graphEl.closest('.section-content');
  if (parentSection && !parentSection.classList.contains('open')) {
    parentSection.classList.add('open');
    var sectionId = parentSection.id.replace('content-', '');
    var toggle = document.getElementById('toggle-' + sectionId);
    if (toggle) toggle.classList.add('open');
  }

  addLog('graph', 'Evidence graph updated: ' + gd.graph_id + (gd.update_note ? ' \u2014 ' + gd.update_note.slice(0, 60) : ''));
}

// === Graph knowledge update (claim-level) ===
function handleGraphUpdate(gu) {
  if (!gu) return;
  addLog('graph', 'Knowledge graph updated: ' + (gu.claim_id || '') + ' \u2014 ' + (gu.new_understanding || '').slice(0, 80));
}

// === Error handler ===
function handleError(data) {
  var msg = (data && data.message) ? data.message : 'Unknown error';
  addLog('error', msg);
  showNotification('Pipeline Error', msg, 'critical');
  var btn = document.getElementById('btn-trigger');
  if (btn) btn.disabled = false;
  var status = document.getElementById('demo-status');
  if (status) status.textContent = 'Error \u2014 check log';
}

// === Trigger demo ===
function triggerKenzi() {
  var btn = document.getElementById('btn-trigger');
  if (btn) btn.disabled = true;
  window._triggerStart = Date.now();
  var status = document.getElementById('demo-status');
  if (status) {
    status.innerHTML = '<span style="display:inline-flex;align-items:center;gap:8px"><span class="spinner"></span> Analyzing evidence through 4 AI agents (~2 min)...</span>';
  }
  // Start progress timer
  var startTime = Date.now();
  var progressInterval = setInterval(function() {
    var elapsed = Math.round((Date.now() - startTime) / 1000);
    var mins = Math.floor(elapsed / 60);
    var secs = elapsed % 60;
    if (status) {
      var timeStr = mins > 0 ? mins + 'm ' + secs + 's' : secs + 's';
      var agents = [
        { name: 'Extractor', icon: '&#x1F50D;', active: elapsed >= 0 && elapsed < 30, done: elapsed >= 30 },
        { name: 'Proposer', icon: '&#x1F4DD;', active: elapsed >= 30 && elapsed < 60, done: elapsed >= 60 },
        { name: 'Scorer', icon: '&#x2696;', active: elapsed >= 60 && elapsed < 90, done: elapsed >= 90 },
        { name: 'Analyzer', icon: '&#x1F30D;', active: elapsed >= 90, done: false },
      ];
      var pipeHtml = agents.map(function(a) {
        var bg = a.done ? 'rgba(90,138,90,.15)' : a.active ? 'rgba(196,122,74,.15)' : 'rgba(0,0,0,.03)';
        var color = a.done ? 'var(--green)' : a.active ? 'var(--primary)' : 'var(--text3)';
        var icon = a.done ? '&#x2705;' : a.active ? '<span class="spinner" style="width:10px;height:10px"></span>' : '&#x23F3;';
        return '<span style="display:inline-flex;align-items:center;gap:3px;padding:2px 8px;border-radius:12px;background:' + bg + ';font-size:9px;color:' + color + ';font-weight:' + (a.active ? '700' : '400') + '">' + icon + ' ' + a.name + '</span>';
      }).join('<span style="color:var(--border);font-size:8px">&rarr;</span>');
      status.innerHTML = pipeHtml + ' <span style="font-size:9px;color:var(--text3);margin-left:4px">' + timeStr + '</span>';
    }
  }, 1000);
  window._progressInterval = progressInterval;

  // Clear process log
  var log = document.getElementById('process-log');
  if (log) log.innerHTML = '';

  // Clear alert banners
  var alertBanners = document.getElementById('alert-banners');
  if (alertBanners) alertBanners.innerHTML = '';

  // Cancel any pending enrichment animations
  enrichmentTimeouts.forEach(function(tid) { clearTimeout(tid); });
  enrichmentTimeouts = [];

  // Clear previous highlights and injected content
  document.querySelectorAll('.doc-section.affected').forEach(function(s) { s.classList.remove('affected'); });
  document.querySelectorAll('.kenzi-injected').forEach(function(el) { el.remove(); });
  document.querySelectorAll('.section-badge.updated').forEach(function(b) { b.remove(); });

  // Reset evidence graph highlights
  document.querySelectorAll('.kenzi-injected-graph').forEach(function(g) {
    g.style.borderColor = '';
    g.style.background = '';
    g.classList.remove('kenzi-injected-graph');
  });

  // Clear notification popups
  if (notifContainer) notifContainer.innerHTML = '';

  // Reset state
  pendingActions = null;
  pendingImpacts = null;

  fetch('/demo/trigger', { method: 'POST' }).catch(function(err) {
    addLog('error', 'Failed to trigger demo: ' + err.message);
    if (btn) btn.disabled = false;
    if (status) status.textContent = 'Trigger failed';
  });
}

// === Reset demo ===
function resetKenzi() {
  fetch('/demo/reset', { method: 'POST' }).catch(function(err) {
    addLog('error', 'Reset failed: ' + err.message);
  });
}

// === Email previews ===
function showEmailPreviews(actions, impacts) {
  var rockyEl = document.getElementById('rocky-email');
  var susannaEl = document.getElementById('susanna-email');

  if (rockyEl) {
    var rockyHtml = '<h3>Evidence Alert: Impacts ' + impacts.length + '+ Cases</h3>' +
      '<div class="ep-meta">To: Rocky Lee &lt;rocky.lee@milliard.law&gt;<br>From: Claim Intelligence Engine</div>' +
      '<p>Rocky, new evidence was processed. Here is what it changes:</p>';
    impacts.forEach(function(imp) {
      rockyHtml += '<div class="ep-case"><h4>' + escapeHtml(imp.case_name) + ' \u2014 ' + escapeHtml(imp.impact_level).toUpperCase() + '</h4><p style="font-size:11px;margin:0">' + escapeHtml(imp.reasoning) + '</p></div>';
    });
    actions.filter(function(a) { return a.assigned_to === 'Lead Attorney' || (a.assigned_to && a.assigned_to.includes('Rocky')); }).forEach(function(a) {
      rockyHtml += '<div class="ep-action">' + escapeHtml(a.title) + ' \u2014 ' + a.sla_hours + 'h SLA</div>';
    });
    rockyEl.innerHTML = rockyHtml;
  }

  if (susannaEl) {
    var susannaHtml = '<h3>NDCA Update: New Evidence</h3>' +
      '<div class="ep-meta">To: Susanna Chenette &lt;schenette@hansonbridgett.com&gt;<br>From: Claim Intelligence Engine</div>';
    impacts.forEach(function(imp) {
      susannaHtml += '<div class="ep-case"><h4>' + escapeHtml(imp.case_name) + '</h4><p style="font-size:11px;margin:0">' + escapeHtml(imp.reasoning) + '</p></div>';
    });
    actions.filter(function(a) {
      return a.assigned_to && (a.assigned_to.includes('Susanna') || a.assigned_to.includes('Matt') || a.assigned_to.includes('Pleading') || a.assigned_to.includes('Motion'));
    }).forEach(function(a) {
      susannaHtml += '<div class="ep-action">' + escapeHtml(a.title) + ' \u2014 ' + a.sla_hours + 'h SLA</div>';
    });
    susannaEl.innerHTML = susannaHtml;
  }
}

// === Utility: escape HTML to prevent XSS ===
function escapeHtml(str) {
  if (!str) return '';
  var div = document.createElement('div');
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}
// Copy section link
function copyCitation(sectionNum, sectionTitle) {
  var cite = 'The Ken Zi Wang Crime, Section ' + sectionNum + ': ' + sectionTitle +
    ', Claim Intelligence Engine, Doc. ID KWC-2026-001 (compiled Mar. 23, 2026; last updated ' +
    new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + ')' +
    ', available at ' + window.location.origin + window.location.pathname + '#section-' + sectionNum + '.';
  navigator.clipboard.writeText(cite).then(function() {
    var btn = event.target.closest('button');
    if (btn) { var o = btn.textContent; btn.textContent = 'Copied!'; setTimeout(function() { btn.textContent = o; }, 1500); }
  }).catch(function() {
    prompt('Copy citation:', cite);
  });
}

function copyLink(sectionId) {
  var url = window.location.origin + window.location.pathname + '#' + sectionId;
  navigator.clipboard.writeText(url).then(function() {
    var btn = event.target;
    var orig = btn.textContent;
    btn.textContent = 'Copied!';
    setTimeout(function() { btn.textContent = orig; }, 1500);
  }).catch(function() {
    prompt('Copy this link:', url);
  });
}

// Auto-scroll to section from URL hash on load
if (window.location.hash) {
  var hashId = window.location.hash.slice(1);
  var target = document.getElementById(hashId);
  if (target) {
    setTimeout(function() {
      toggleSection(hashId);
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 500);
  }
}

// Section search
function searchSections(query) {
  var q = query.toLowerCase().trim();
  var sections = document.querySelectorAll('.doc-section');
  var shown = 0;
  sections.forEach(function(s) {
    if (!q || (s.getAttribute('data-search') || '').indexOf(q) !== -1) {
      s.style.display = '';
      shown++;
    } else {
      s.style.display = 'none';
    }
  });
  var filterCount = document.getElementById('filter-count');
  if (filterCount) filterCount.textContent = q ? shown + ' of ' + sections.length + ' sections matching "' + query + '"' : '';
}

// Jurisdiction filter
function filterByJurisdiction(jur) {
  var sections = document.querySelectorAll('.doc-section');
  var shown = 0;
  sections.forEach(function(s) {
    var jurData = s.getAttribute('data-jurisdictions') || '';
    if (jur === 'all' || jurData.indexOf(jur) !== -1 || jurData === '') {
      s.style.display = '';
      shown++;
    } else {
      s.style.display = 'none';
    }
  });
  // Update active button
  document.querySelectorAll('.jur-filter').forEach(function(b) {
    if (b.getAttribute('data-jur') === jur) {
      b.style.background = 'var(--text)';
      b.style.color = 'var(--bg)';
    } else {
      b.style.background = 'transparent';
      b.style.color = b.getAttribute('data-jur') === 'NDCA' ? '#3b82f6' : b.getAttribute('data-jur') === 'Dubai' ? '#c47a4a' : b.getAttribute('data-jur') === 'Delaware' ? '#7a6398' : b.getAttribute('data-jur') === 'BVI' ? '#5a8a5e' : 'var(--text2)';
    }
  });
  var countEl = document.getElementById('filter-count');
  if (countEl) countEl.textContent = jur === 'all' ? '' : shown + ' of ' + sections.length + ' sections';
}

// Readiness filter
function filterByReadiness(level) {
  var sections = document.querySelectorAll('.doc-section');
  var shown = 0;
  sections.forEach(function(s) {
    var readiness = s.getAttribute('data-readiness') || '';
    if (level === 'all' || readiness === level) {
      s.style.display = '';
      shown++;
    } else {
      s.style.display = 'none';
    }
  });
  document.querySelectorAll('.ready-filter').forEach(function(b) {
    if (b.getAttribute('data-ready') === level) {
      b.style.background = 'var(--text)';
      b.style.color = 'var(--bg)';
    } else {
      b.style.background = 'transparent';
      b.style.color = b.getAttribute('data-ready') === 'court-ready' ? 'var(--green)' : b.getAttribute('data-ready') === 'near-ready' ? 'var(--primary)' : b.getAttribute('data-ready') === 'needs-work' ? 'var(--red)' : 'var(--text2)';
    }
  });
  // Also reset jurisdiction filter buttons
  document.querySelectorAll('.jur-filter').forEach(function(b) {
    b.style.background = b.getAttribute('data-jur') === 'all' ? 'var(--text)' : 'transparent';
    b.style.color = b.getAttribute('data-jur') === 'all' ? 'var(--bg)' : b.getAttribute('data-jur') === 'NDCA' ? '#3b82f6' : b.getAttribute('data-jur') === 'Dubai' ? '#c47a4a' : b.getAttribute('data-jur') === 'Delaware' ? '#7a6398' : b.getAttribute('data-jur') === 'BVI' ? '#5a8a5e' : 'var(--text2)';
  });
  var countEl = document.getElementById('filter-count');
  if (countEl) countEl.textContent = level === 'all' ? '' : shown + ' of ' + sections.length + ' sections (' + level + ')';
}

// Dark mode toggle
function toggleDarkMode() {
  document.body.classList.toggle('dark');
  var isDark = document.body.classList.contains('dark');
  localStorage.setItem('kenzi-dark', isDark ? '1' : '');
  var btn = document.getElementById('dark-toggle');
  if (btn) btn.textContent = isDark ? '\u2600' : '\uD83C\uDF19';
}
// Restore dark mode preference
if (localStorage.getItem('kenzi-dark')) {
  document.body.classList.add('dark');
  var dBtn = document.getElementById('dark-toggle');
  if (dBtn) dBtn.textContent = '\u2600';
}

// Print function - expands all sections before printing
function exportBrief() {
  var sections = document.querySelectorAll('.doc-section');
  var lines = [];
  lines.push('THE KEN ZI WANG CRIME \u2014 CASE BRIEF');
  lines.push('Document ID: KWC-2026-001 | Generated: ' + new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }));
  lines.push('Classification: Attorney Work Product \u2014 Privileged and Confidential');
  lines.push('');
  lines.push('CASE OVERVIEW: 18 categories of documented illegal conduct, $267M maximum recovery, 7 active cases across 4 jurisdictions (NDCA, Dubai DIFC, Delaware, BVI). 7 proven RICO predicate acts. Passport seized in Dubai.');
  lines.push('');
  lines.push('SECTIONS:');
  sections.forEach(function(sec) {
    var num = sec.querySelector('.section-num');
    var title = sec.querySelector('.section-title');
    var strengthEl = sec.querySelector('.section-right span[style*="font-size:13px"]');
    var strength = strengthEl ? strengthEl.textContent.trim() : '';
    var readiness = sec.getAttribute('data-readiness') || '';
    var preview = sec.querySelector('.section-preview');
    var previewText = preview ? preview.textContent.trim().slice(0, 120) : '';
    if (num && title) {
      lines.push('  ' + num.textContent + '. ' + title.textContent + ' (' + strength + ', ' + readiness.toUpperCase() + ')');
      if (previewText) lines.push('     ' + previewText);
    }
  });
  lines.push('');
  lines.push('RECOMMENDED STRATEGY: Lead with RICO (18 U.S.C. \u00A7\u00A7 1961-1968). File TRO/asset freeze immediately. Coordinate filings across all 4 jurisdictions simultaneously.');
  lines.push('');
  lines.push('Generated by Claim Intelligence Engine \u2014 Cere Network');
  var text = lines.join(String.fromCharCode(10));
  navigator.clipboard.writeText(text).then(function() {
    showNotification('Brief Copied', 'Case brief copied to clipboard (' + text.length + ' chars). Paste into your motion or email.', 'high');
  }).catch(function() {
    prompt('Copy brief:', text);
  });
}

function printDocument() {
  // Expand all sections
  document.querySelectorAll('.section-content').forEach(function(c) { c.classList.add('open'); });
  document.querySelectorAll('.section-toggle').forEach(function(t) { t.classList.add('open'); });
  // Hide previews
  document.querySelectorAll('.section-preview').forEach(function(p) { p.style.display = 'none'; });
  // Expand TOC
  var tocBody = document.getElementById('toc-body');
  if (tocBody) tocBody.style.display = 'block';
  // Show all sections (reset any filters)
  document.querySelectorAll('.doc-section').forEach(function(s) { s.style.display = ''; });
  setTimeout(function() { window.print(); }, 300);
}

// Keyboard shortcuts
var currentSectionIdx = -1;
var allSectionIds = ${JSON.stringify(sections.map(s => s.id))};

document.addEventListener('keydown', function(e) {
  // Ignore when typing in inputs
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

  // Escape closes any open modal/overlay
  if (e.key === 'Escape') {
    var kbh = document.getElementById('kb-help');
    if (kbh) kbh.style.display = 'none';
    var gm = document.getElementById('graph-modal');
    if (gm) gm.style.display = 'none';
    var dg = document.getElementById('demo-guide');
    if (dg && dg.style.display !== 'none') { dg.style.display = 'none'; if (typeof demoBtn !== 'undefined') demoBtn.style.display = 'flex'; }
    return;
  }

  if (e.key === 'j' || e.key === 'J') {
    // Close help if open
    var kbh = document.getElementById('kb-help');
    if (kbh) kbh.style.display = 'none';
    // Next section
    currentSectionIdx = Math.min(currentSectionIdx + 1, allSectionIds.length - 1);
    var sid = allSectionIds[currentSectionIdx];
    toggleSection(sid);
    document.getElementById(sid).scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  if (e.key === 'k' || e.key === 'K') {
    var kbh = document.getElementById('kb-help');
    if (kbh) kbh.style.display = 'none';
    // Previous section
    currentSectionIdx = Math.max(currentSectionIdx - 1, 0);
    var sid = allSectionIds[currentSectionIdx];
    toggleSection(sid);
    document.getElementById(sid).scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  if (e.key === 'e' || e.key === 'E') {
    // Expand/collapse current
    if (currentSectionIdx >= 0) toggleSection(allSectionIds[currentSectionIdx]);
  }
  if (e.key === 'g' || e.key === 'G') {
    // Toggle graph view
    togglePanel('graph-toggle');
  }
  if (e.key === 't' || e.key === 'T') {
    // Back to top
    document.querySelector('.main').scrollTo({ top: 0, behavior: 'smooth' });
  }
  if (e.key === '?') {
    // Toggle keyboard shortcut help
    var help = document.getElementById('kb-help');
    if (help) { help.style.display = help.style.display === 'none' ? 'flex' : 'none'; return; }
    help = document.createElement('div');
    help.id = 'kb-help';
    help.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;z-index:300';
    help.onclick = function(ev) { if (ev.target === help) help.style.display = 'none'; };
    help.innerHTML = '<div style="background:var(--bg);border:1px solid var(--border);border-radius:16px;padding:32px;max-width:360px">' +
      '<div style="font-family:var(--serif);font-size:18px;font-weight:700;margin-bottom:16px">Keyboard Shortcuts</div>' +
      '<div style="display:grid;grid-template-columns:60px 1fr;gap:6px 12px;font-size:12px">' +
      '<kbd style="background:var(--surface);border:1px solid var(--border);border-radius:4px;padding:2px 8px;text-align:center;font-family:var(--mono);font-size:11px">J</kbd><span style="color:var(--text2)">Next section</span>' +
      '<kbd style="background:var(--surface);border:1px solid var(--border);border-radius:4px;padding:2px 8px;text-align:center;font-family:var(--mono);font-size:11px">K</kbd><span style="color:var(--text2)">Previous section</span>' +
      '<kbd style="background:var(--surface);border:1px solid var(--border);border-radius:4px;padding:2px 8px;text-align:center;font-family:var(--mono);font-size:11px">E</kbd><span style="color:var(--text2)">Expand / collapse</span>' +
      '<kbd style="background:var(--surface);border:1px solid var(--border);border-radius:4px;padding:2px 8px;text-align:center;font-family:var(--mono);font-size:11px">G</kbd><span style="color:var(--text2)">Toggle graph view</span>' +
      '<kbd style="background:var(--surface);border:1px solid var(--border);border-radius:4px;padding:2px 8px;text-align:center;font-family:var(--mono);font-size:11px">T</kbd><span style="color:var(--text2)">Back to top</span>' +
      '<kbd style="background:var(--surface);border:1px solid var(--border);border-radius:4px;padding:2px 8px;text-align:center;font-family:var(--mono);font-size:11px">?</kbd><span style="color:var(--text2)">Show this help</span>' +
      '</div>' +
      '<div style="margin-top:16px;font-size:10px;color:var(--text3);text-align:center">Press any key or click outside to close</div>' +
      '</div>';
    document.body.appendChild(help);
  }
});

// Demo Guide for Fred
var demoSteps = [
  { title: 'Welcome', text: '"This is the Kenzi Files — a living legal document powered by the same compound intelligence engine as our hiring pipeline. Same agents, same cubbies, same architecture. What you are looking at is a full litigation command center."' },
  { title: 'Command Center', text: 'Point to the KPI row: "5 motions ready to file, 14 of 18 claims meet their burden of proof, max recovery $267M. The Next Best Action bar tells the team exactly what to do next — right now it says file the TRO before assets dissipate."' },
  { title: 'Prosecution Strategy', text: 'Show the strategy narrative: "The system automatically synthesized all data into a prosecution strategy. Lead with RICO — it preserves 7 time-barred claims. The SOL Advisory shows exactly which ones are at risk and why RICO is not optional."' },
  { title: 'RICO Tracker', text: 'Scroll to RICO: "7 proven predicate acts. RICO needs 2 in 10 years — we have 7 in 8 years. Below that — the Motion Readiness Tracker shows 5 motions ready to file with their dependencies."' },
  { title: 'Damages Calculation', text: 'Show the damages table: "Every dollar is mapped to a recovery theory with statute citations. RICO treble damages turn $4.87M into $14.61M. The system calculated a realistic settlement corridor of $15-45M."' },
  { title: 'Section Deep Dive', text: 'Open Section 12 (Embezzlement): "Burden of proof bar — BRD met. SOL countdown — 8 years safe. Each evidence item has an admissibility tag — SELF-AUTH, EXPERT, FRE 902(13). The gap analysis tells you exactly what evidence to obtain next."' },
  { title: 'Evidence Provenance', text: 'Show the provenance chain: "Sources (Reports, Filings, On-Chain) → Evidence (8 items) → Elements (4/4 proven) → Claim (100% strength) → Cases. Full chain of custody from raw evidence to courtroom claim."' },
  { title: 'Filters & Triage', text: 'Click "Needs Work" filter: "Instantly see only the sections that need attention. The sidebar shows attorney action items — Rocky files the TRO, Susanna serves KuCoin subpoenas. Every person knows what to do."' },
  { title: 'Live Intake', text: 'Click "Simulate Rocky\u2019s Email": "Watch \u2014 Rocky\u2019s email about the Goopal CEO arrives, 4 AI agents process it, affected sections light up, strength scores update, attorneys get notified. The document is alive."' },
  { title: 'The Pitch', text: '"Same engine as hiring. Same cubbies. Same DDC migration path. But instead of scoring candidates, we score evidence against dynamic legal claims. Admissibility tags, burden of proof, SOL tracking, motion readiness — no legal AI does this. Harvey charges $1,000/seat/mo for document review. We built a litigation command center."' },
];
var demoIdx = 0;
var demoGuide = document.createElement('div');
demoGuide.id = 'demo-guide';
demoGuide.style.cssText = 'position:fixed;bottom:24px;left:240px;max-width:380px;background:#fff;border:1px solid var(--border);border-radius:12px;padding:16px;box-shadow:0 8px 32px rgba(0,0,0,.15);z-index:200;display:none;font-family:var(--font)';
function updateDemoGuide() {
  var s = demoSteps[demoIdx];
  var closeBtn = '<span id="demo-guide-close" style="cursor:pointer;color:var(--text3);font-size:14px">&times;</span>';
  var prevBtn = '<button id="demo-prev" style="padding:4px 12px;border:1px solid var(--border);border-radius:6px;background:transparent;cursor:pointer;font-size:10px;font-family:var(--font)">&larr; Prev</button>';
  var nextBtn = '<button id="demo-next" style="padding:4px 12px;border:1px solid var(--border);border-radius:6px;background:var(--text);color:var(--bg);cursor:pointer;font-size:10px;font-family:var(--font)">Next &rarr;</button>';
  var doneBtn = '<button id="demo-done" style="padding:4px 12px;border:1px solid var(--border);border-radius:6px;background:var(--green);color:#fff;cursor:pointer;font-size:10px;font-family:var(--font)">Done</button>';
  demoGuide.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px"><div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:var(--primary)">Demo Guide &mdash; Step ' + (demoIdx + 1) + '/' + demoSteps.length + '</div>' + closeBtn + '</div>' +
    '<div style="font-size:13px;font-weight:700;margin-bottom:6px">' + s.title + '</div>' +
    '<div style="font-size:11px;color:var(--text2);line-height:1.6;font-style:italic">' + s.text + '</div>' +
    '<div style="display:flex;gap:8px;margin-top:12px">' +
    (demoIdx > 0 ? prevBtn : '') +
    (demoIdx < demoSteps.length - 1 ? nextBtn : doneBtn) +
    '</div>';
  // Attach event listeners (avoids inline onclick with quote escaping issues)
  var closeEl = document.getElementById('demo-guide-close');
  if (closeEl) closeEl.onclick = function() { demoGuide.style.display = 'none'; demoBtn.style.display = 'flex'; };
  var prevEl = document.getElementById('demo-prev');
  if (prevEl) prevEl.onclick = function() { demoIdx--; updateDemoGuide(); };
  var nextEl = document.getElementById('demo-next');
  if (nextEl) nextEl.onclick = function() { demoIdx++; updateDemoGuide(); };
  var doneEl = document.getElementById('demo-done');
  if (doneEl) doneEl.onclick = function() { demoGuide.style.display = 'none'; demoBtn.style.display = 'flex'; };
}
document.body.appendChild(demoGuide);

// Demo guide toggle button (floating)
var demoBtn = document.createElement('div');
demoBtn.style.cssText = 'position:fixed;bottom:24px;left:240px;padding:6px 14px;background:var(--primary);color:#fff;border-radius:20px;cursor:pointer;font-size:10px;font-weight:600;z-index:199;box-shadow:0 2px 8px rgba(0,0,0,.2);font-family:var(--font);display:flex;align-items:center;gap:4px';
demoBtn.innerHTML = '&#x1F3AC; Demo Guide';
demoBtn.onclick = function() {
  demoIdx = 0;
  updateDemoGuide();
  demoGuide.style.display = 'block';
  demoBtn.style.display = 'none';
};
document.body.appendChild(demoBtn);

// Show demo button again when guide closed
var observer = new MutationObserver(function() {
  if (demoGuide.style.display === 'none') demoBtn.style.display = 'flex';
});
observer.observe(demoGuide, { attributes: true, attributeFilter: ['style'] });

// Back to top button
var btt = document.createElement('div');
btt.innerHTML = '&uarr;';
btt.style.cssText = 'position:fixed;bottom:24px;right:24px;width:40px;height:40px;border-radius:50%;background:var(--text);color:var(--bg);display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:16px;box-shadow:0 2px 8px rgba(0,0,0,.2);opacity:0;transition:opacity .3s;z-index:100';
btt.onclick = function() { document.querySelector('.main').scrollTo({ top: 0, behavior: 'smooth' }); };
document.body.appendChild(btt);
// Scroll progress bar
var progressBar = document.createElement('div');
progressBar.style.cssText = 'position:fixed;top:0;left:220px;right:0;height:3px;z-index:50;pointer-events:none';
progressBar.innerHTML = '<div id="scroll-progress" style="height:100%;width:0%;background:var(--primary);transition:width .1s;border-radius:0 2px 2px 0"></div>';
document.body.appendChild(progressBar);

// Section breadcrumb in demo bar
var breadcrumb = document.createElement('span');
breadcrumb.id = 'section-breadcrumb';
breadcrumb.style.cssText = 'font-size:9px;color:var(--text3);max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap';
var demoBar = document.querySelector('.demo-bar');
if (demoBar) {
  var spacer = demoBar.querySelector('div[style*="flex:1"]');
  if (spacer) spacer.parentNode.insertBefore(breadcrumb, spacer);
}

var mainEl = document.querySelector('.main');
var lastBreadcrumb = '';
if (mainEl) mainEl.addEventListener('scroll', function() {
  btt.style.opacity = mainEl.scrollTop > 400 ? '1' : '0';
  // Update progress bar
  var scrollHeight = mainEl.scrollHeight - mainEl.clientHeight;
  var progress = scrollHeight > 0 ? Math.round((mainEl.scrollTop / scrollHeight) * 100) : 0;
  var bar = document.getElementById('scroll-progress');
  if (bar) bar.style.width = progress + '%';
  // Update section breadcrumb (throttled)
  if (Math.random() > 0.3) return; // only update ~70% of scroll events for perf
  var secs = document.querySelectorAll('.doc-section');
  var current = '';
  secs.forEach(function(s) {
    var rect = s.getBoundingClientRect();
    if (rect.top < 200 && rect.bottom > 0) {
      var num = s.querySelector('.section-num');
      var title = s.querySelector('.section-title');
      if (num && title) current = '\u00A7' + num.textContent + ' ' + title.textContent;
    }
  });
  if (current && current !== lastBreadcrumb) {
    lastBreadcrumb = current;
    breadcrumb.textContent = current;
    breadcrumb.title = current;
  } else if (!current && lastBreadcrumb) {
    lastBreadcrumb = '';
    breadcrumb.textContent = '';
  }
});
</script>
</body>
</html>`);
}
