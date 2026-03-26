/**
 * Clean Case View — simplified document dashboard for emerging claims
 * After evidence is added via /clean, this shows the case taking shape.
 * Same warm cream design as the full Kenzi doc, but much lighter.
 */

import type { Request, Response } from 'express';
import { dumpCubbies } from '../runtime.js';

interface CleanClaim {
  id: string;
  title: string;
  status: string;
  strength: number;
  elements: Array<{ id: string; name: string; status: string; supporting_evidence?: string[]; gap_description?: string }>;
  evidence_chain: string[];
  key_entities: string[];
  connected_claims: Record<string, number>;
  current_understanding: string;
  evolution_log?: Array<{ date: string; delta: string }>;
}

interface CleanEvidence {
  id: string;
  title: string;
  type: string;
  source: string;
  source_credibility?: number;
  entities?: string[];
  jurisdictions?: string[];
  extracted_at?: string;
  content?: string;
}

export function renderCleanCaseView(_req: Request, res: Response) {
  const allData = dumpCubbies();

  const claims: CleanClaim[] = Object.entries(allData)
    .filter(([k]) => k.startsWith('clean/claims/'))
    .map(([, v]) => v as CleanClaim)
    .sort((a, b) => (b.strength || 0) - (a.strength || 0));

  const evidence: CleanEvidence[] = Object.entries(allData)
    .filter(([k]) => k.startsWith('clean/evidence/'))
    .map(([, v]) => v as CleanEvidence);

  const NL = String.fromCharCode(10);

  if (claims.length === 0) {
    res.redirect('/clean');
    return;
  }

  // Compute case stats
  const totalElements = claims.reduce((a, c) => a + (c.elements?.length || 0), 0);
  const provenElements = claims.reduce((a, c) => a + (c.elements?.filter(e => e.status === 'proven').length || 0), 0);
  const avgStrength = claims.length > 0 ? Math.round(claims.reduce((a, c) => a + (c.strength || 0), 0) / claims.length * 100) : 0;
  const allEntities = new Set<string>();
  claims.forEach(c => (c.key_entities || []).forEach(e => allEntities.add(e)));

  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Case Dashboard | Claim Intel</title>
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='6' fill='%23c47a4a'/><text x='16' y='22' text-anchor='middle' font-size='18' font-weight='bold' fill='white'>CI</text></svg>">
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,800;1,400&family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
:root{--bg:#f5f0eb;--surface:#fff;--surface2:#ede8e1;--border:#d8d0c6;--text:#1a1714;--text2:#6b6259;--text3:#9a9087;--primary:#c47a4a;--red:#b84233;--green:#5a8a5e;--purple:#7a6398;--cyan:#5a8a8a;--font:'Inter',sans-serif;--mono:'JetBrains Mono',monospace;--serif:'Playfair Display',Georgia,serif}
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:var(--font);background:var(--bg);color:var(--text)}
.container{max-width:1100px;margin:0 auto;padding:24px}
.nav{display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;font-size:11px}
.nav a{color:var(--text3);text-decoration:none}
.nav a:hover{color:var(--primary)}
.nav-links{display:flex;gap:12px}
.nav-links a{padding:4px 12px;border:1px solid var(--border);border-radius:6px}
.header{margin-bottom:32px}
.header h1{font-family:var(--serif);font-size:28px;font-weight:700;margin-bottom:6px}
.header p{font-size:13px;color:var(--text2)}

/* Score card */
.score-card{display:flex;align-items:center;gap:32px;padding:24px;background:var(--surface);border:1px solid var(--border);border-radius:16px;margin-bottom:24px}
.score-big{text-align:center;min-width:100px}
.score-big .num{font-family:var(--serif);font-size:48px;font-weight:800;line-height:1}
.score-big .label{font-size:10px;color:var(--text3);margin-top:4px}
.score-grid{flex:1;display:grid;grid-template-columns:repeat(4,1fr);gap:16px;border-left:1px solid var(--border);padding-left:24px}
.score-grid .item .val{font-size:18px;font-weight:700}
.score-grid .item .desc{font-size:9px;color:var(--text3)}

/* Claims */
.section-label{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:var(--text3);margin:24px 0 12px}
.claim-section{background:var(--surface);border:1px solid var(--border);border-radius:12px;margin-bottom:12px;overflow:hidden}
.claim-header{padding:16px 20px;cursor:pointer;display:flex;justify-content:space-between;align-items:center}
.claim-header:hover{background:var(--surface2)}
.claim-left{display:flex;align-items:center;gap:10px}
.claim-title{font-family:var(--serif);font-size:16px;font-weight:700}
.claim-right{display:flex;align-items:center;gap:8px;font-size:11px}
.badge{padding:2px 8px;border-radius:10px;font-size:9px;font-weight:600}
.badge-green{background:rgba(90,138,90,.1);color:var(--green)}
.badge-orange{background:rgba(196,122,74,.1);color:var(--primary)}
.badge-red{background:rgba(184,66,51,.1);color:var(--red)}
.strength{font-size:14px;font-weight:700}
.claim-body{display:none;padding:0 20px 20px;border-top:1px solid var(--border)}
.claim-body.open{display:block}

/* Elements */
.elements-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:8px;margin:12px 0}
.element-card{padding:8px 10px;background:var(--bg);border-radius:6px;font-size:11px;display:flex;align-items:center;gap:6px}
.el-icon{font-size:14px}

/* Evidence list */
.ev-item{padding:8px 10px;border-left:2px solid var(--border);margin:6px 0;font-size:11px;color:var(--text2)}
.ev-item .ev-title{font-weight:600;color:var(--text)}

/* Understanding */
.understanding{padding:12px 16px;background:rgba(196,122,74,.03);border-left:3px solid var(--primary);border-radius:0 8px 8px 0;margin:12px 0;font-size:12px;color:var(--text2);line-height:1.6}

/* Connections */
.connections{display:flex;gap:6px;flex-wrap:wrap;margin:8px 0}
.conn-chip{padding:3px 10px;border:1px solid var(--border);border-radius:12px;font-size:10px;color:var(--text2);cursor:pointer}
.conn-chip:hover{border-color:var(--primary);color:var(--primary)}

/* Entities */
.entity-bar{display:flex;flex-wrap:wrap;gap:4px;padding:16px 20px;background:var(--surface);border:1px solid var(--border);border-radius:12px;margin-bottom:24px}
.entity-tag{padding:3px 10px;border-radius:12px;background:var(--bg);font-size:10px;color:var(--text2);border:1px solid var(--border)}

/* Toggle */
.toggle{font-size:12px;color:var(--text3);transition:transform .2s;display:inline-block}
.toggle.open{transform:rotate(90deg)}

/* Footer */
.footer{text-align:center;padding:24px 0;font-size:9px;color:var(--text3);border-top:1px solid var(--border);margin-top:32px}
</style>
</head>
<body>
<div class="container">
  <div class="nav">
    <a href="/clean">&larr; Add More Evidence</a>
    <div class="nav-links">
      <a href="/clean">Evidence Intake</a>
      <a href="/document">Kenzi Files (Full Case)</a>
      <a href="/">Landing</a>
    </div>
  </div>

  <div class="header">
    <h1>Case Dashboard</h1>
    <p>${claims.length} claims from ${evidence.length} evidence items &mdash; AI-proposed, attorney-confirmed</p>
  </div>

  <!-- Score Card -->
  <div class="score-card">
    <div class="score-big">
      <div class="num" style="color:${avgStrength >= 80 ? 'var(--green)' : avgStrength >= 50 ? 'var(--primary)' : 'var(--text3)'}">${avgStrength}</div>
      <div class="label">Case Strength</div>
    </div>
    <div class="score-grid">
      <div class="item"><div class="val">${claims.length}</div><div class="desc">Claims</div></div>
      <div class="item"><div class="val">${provenElements}/${totalElements}</div><div class="desc">Elements Proven</div></div>
      <div class="item"><div class="val">${evidence.length}</div><div class="desc">Evidence Items</div></div>
      <div class="item"><div class="val">${allEntities.size}</div><div class="desc">Key Entities</div></div>
    </div>
  </div>

  <!-- Entities -->
  <div class="entity-bar">
    <span style="font-size:9px;font-weight:600;color:var(--text3);letter-spacing:1px;line-height:22px">ENTITIES:</span>
    ${Array.from(allEntities).map(e => `<span class="entity-tag">${e}</span>`).join('')}
  </div>

  <!-- Claims -->
  <div class="section-label">Claims (${claims.length})</div>
  ${claims.map(c => {
    const proven = (c.elements || []).filter(e => e.status === 'proven').length;
    const total = (c.elements || []).length;
    const str = Math.round((c.strength || 0) * 100);
    const strColor = str >= 80 ? 'var(--green)' : str >= 50 ? 'var(--primary)' : 'var(--text3)';
    const statusBadge = c.status === 'confirmed' ? 'badge-green' : c.status === 'active' ? 'badge-orange' : 'badge-orange';
    const evItems = (c.evidence_chain || []).map(eid => {
      const ev = allData['clean/evidence/' + eid] as CleanEvidence | undefined;
      return ev ? ev : null;
    }).filter(Boolean) as CleanEvidence[];
    const connections = Object.entries(c.connected_claims || {});

    return `
    <div class="claim-section" id="claim-${c.id}">
      <div class="claim-header" onclick="var b=document.getElementById('body-${c.id}');var t=document.getElementById('toggle-${c.id}');b.classList.toggle('open');t.classList.toggle('open')">
        <div class="claim-left">
          <span class="toggle" id="toggle-${c.id}">&#x25B6;</span>
          <span class="claim-title">${c.title}</span>
        </div>
        <div class="claim-right">
          <span class="strength" style="color:${strColor}">${str}%</span>
          ${total > 0 ? `<span class="badge ${proven === total ? 'badge-green' : 'badge-orange'}">${proven}/${total} elements</span>` : ''}
          <span class="badge ${statusBadge}">${(c.status || 'proposed').toUpperCase()}</span>
        </div>
      </div>
      <div class="claim-body" id="body-${c.id}">
        ${c.current_understanding ? `<div class="understanding">${c.current_understanding}</div>` : ''}

        ${total > 0 ? `
        <div class="section-label" style="margin-top:16px">Legal Elements</div>
        <div class="elements-grid">
          ${(c.elements || []).map(el => {
            const icon = el.status === 'proven' ? '&#x2705;' : el.status === 'partial' ? '&#x1F7E1;' : '&#x274C;';
            return `<div class="element-card"><span class="el-icon">${icon}</span><span>${el.name}</span></div>`;
          }).join('')}
        </div>` : ''}

        ${evItems.length > 0 ? `
        <div class="section-label">Evidence Chain (${evItems.length})</div>
        ${evItems.map(ev => {
          const icon = ev!.type === 'bank_statement' ? '&#x1F3E6;' : ev!.type === 'invoice' ? '&#x1F4B3;' : ev!.type === 'report' ? '&#x1F50D;' : '&#x1F4CE;';
          return `<div class="ev-item">${icon} <span class="ev-title">${ev!.title}</span><br><span style="font-size:10px;color:var(--text3)">Credibility: ${ev!.source_credibility || '?'}/10 &middot; ${ev!.type}</span></div>`;
        }).join('')}` : ''}

        ${connections.length > 0 ? `
        <div class="section-label">Connected Claims</div>
        <div class="connections">
          ${connections.map(([connId, strength]) => {
            const conn = claims.find(cl => cl.id === connId);
            return `<span class="conn-chip" onclick="var el=document.getElementById('claim-${connId}');if(el){document.getElementById('body-${connId}').classList.add('open');document.getElementById('toggle-${connId}').classList.add('open');el.scrollIntoView({behavior:'smooth'})}">${conn?.title || connId} (${Math.round((strength as number) * 100)}%)</span>`;
          }).join('')}
        </div>` : ''}

        ${(c.evolution_log || []).length > 0 ? `
        <div class="section-label">Evolution Log</div>
        <div style="font-size:10px;color:var(--text3)">
          ${(c.evolution_log || []).map(e => `<div style="padding:3px 0;border-bottom:1px solid var(--border)">${e.date}: ${e.delta}</div>`).join('')}
        </div>` : ''}
      </div>
    </div>`;
  }).join('')}

  <!-- Evidence -->
  <div class="section-label">All Evidence (${evidence.length})</div>
  <div style="background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:16px">
    ${evidence.map((ev, i) => {
      const icon = ev.type === 'bank_statement' ? '&#x1F3E6;' : ev.type === 'invoice' ? '&#x1F4B3;' : ev.type === 'report' ? '&#x1F50D;' : '&#x1F4CE;';
      const usedBy = claims.filter(c => (c.evidence_chain || []).includes(ev.id));
      return `<div style="padding:10px 0;${i > 0 ? 'border-top:1px solid var(--border)' : ''};font-size:12px">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <span>${icon} <strong>${ev.title}</strong></span>
          <span style="font-size:9px;padding:2px 8px;border-radius:10px;background:var(--bg);color:var(--text3)">${ev.type}</span>
        </div>
        <div style="font-size:10px;color:var(--text3);margin-top:2px">From: ${ev.source} ${ev.source_credibility ? '&middot; Credibility: ' + ev.source_credibility + '/10' : ''}</div>
        ${usedBy.length > 0 ? `<div style="font-size:9px;color:var(--purple);margin-top:3px">Supports: ${usedBy.map(c => c.title).join(', ')}</div>` : ''}
      </div>`;
    }).join('')}
  </div>

  <div class="footer">
    Powered by <span style="color:var(--primary);font-weight:600">Claim Intelligence Engine</span> &mdash; Cere Network
  </div>
</div>
</body>
</html>`);
}
