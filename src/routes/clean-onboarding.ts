/**
 * Clean Onboarding — "Start a New Case" experience
 * Empty state → add evidence → watch claims emerge → see connections grow
 * Apex Ventures CFO embezzlement scenario (3 steps)
 */

import type { Request, Response } from 'express';
import { dumpCubbies } from '../runtime.js';
import { CLEAN_EVIDENCE_STEPS } from '../data/clean-scenario.js';

export function renderCleanOnboarding(_req: Request, res: Response) {
  // Load any existing clean cubby data
  const allData = dumpCubbies();
  const cleanClaims = Object.entries(allData)
    .filter(([k]) => k.startsWith('clean/claims/'))
    .map(([, v]) => v as { id: string; title: string; status: string; strength: number; elements: Array<{ id: string; name: string; status: string }> });
  const cleanEvidence = Object.entries(allData)
    .filter(([k]) => k.startsWith('clean/evidence/'))
    .map(([, v]) => v as { id: string; title: string; type: string; source?: string; content?: string });

  const NL = String.fromCharCode(10);

  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Start a New Case | Claim Intel</title>
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='6' fill='%23c47a4a'/><text x='16' y='22' text-anchor='middle' font-size='18' font-weight='bold' fill='white'>CI</text></svg>">
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,800;1,400&family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
:root{--bg:#f5f0eb;--surface:#fff;--surface2:#ede8e1;--border:#d8d0c6;--text:#1a1714;--text2:#6b6259;--text3:#9a9087;--primary:#c47a4a;--red:#b84233;--green:#5a8a5e;--purple:#7a6398;--cyan:#5a8a8a;--font:'Inter',sans-serif;--mono:'JetBrains Mono',monospace;--serif:'Playfair Display',Georgia,serif}
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:var(--font);background:var(--bg);color:var(--text);min-height:100vh}
.container{max-width:960px;margin:0 auto;padding:32px 24px}
.header{text-align:center;margin-bottom:40px}
.header .back{font-size:11px;color:var(--text3);text-decoration:none;display:inline-flex;align-items:center;gap:4px;margin-bottom:16px}
.header .back:hover{color:var(--primary)}
.header h1{font-family:var(--serif);font-size:32px;font-weight:700;margin-bottom:8px}
.header p{font-size:14px;color:var(--text2);max-width:600px;margin:0 auto;line-height:1.6}
.steps{display:flex;gap:12px;margin-bottom:32px;justify-content:center}
.step-btn{padding:12px 24px;border:2px solid var(--border);border-radius:12px;background:var(--surface);cursor:pointer;font-family:var(--font);font-size:13px;font-weight:600;color:var(--text2);transition:all .2s;display:flex;align-items:center;gap:8px;position:relative}
.step-btn:hover:not(:disabled){border-color:var(--primary);color:var(--primary)}
.step-btn:disabled{opacity:.4;cursor:not-allowed}
.step-btn.active{border-color:var(--primary);color:var(--primary);background:rgba(196,122,74,.05)}
.step-btn.done{border-color:var(--green);color:var(--green);background:rgba(90,138,90,.05)}
.step-btn .num{width:24px;height:24px;border-radius:50%;background:var(--border);color:#fff;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700}
.step-btn.active .num{background:var(--primary)}
.step-btn.done .num{background:var(--green)}
.reset-btn{padding:8px 16px;border:1px solid var(--border);border-radius:8px;background:transparent;cursor:pointer;font-family:var(--font);font-size:11px;color:var(--text3)}
.reset-btn:hover{border-color:var(--red);color:var(--red)}

/* Two-column layout */
.workspace{display:grid;grid-template-columns:1fr 1fr;gap:24px;min-height:500px}
.panel{background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:24px;overflow:hidden}
.panel h2{font-family:var(--serif);font-size:18px;font-weight:700;margin-bottom:16px;display:flex;align-items:center;gap:8px}
.panel h2 .count{font-family:var(--font);font-size:12px;font-weight:600;padding:2px 8px;border-radius:10px;background:var(--bg);color:var(--text3)}

/* Empty state */
.empty{text-align:center;padding:48px 24px;color:var(--text3)}
.empty .icon{font-size:48px;margin-bottom:12px;opacity:.4}
.empty h3{font-size:14px;color:var(--text2);margin-bottom:6px}
.empty p{font-size:12px;line-height:1.5}

/* Evidence card */
.ev-card{padding:14px;border:1px solid var(--border);border-radius:10px;margin-bottom:10px;animation:fadeIn .5s}
.ev-card .ev-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px}
.ev-card .ev-title{font-weight:600;font-size:12px}
.ev-card .ev-type{font-size:9px;padding:2px 8px;border-radius:10px;background:var(--bg);color:var(--text3);font-weight:600;text-transform:uppercase}
.ev-card .ev-source{font-size:10px;color:var(--text3);margin-bottom:6px}
.ev-card .ev-content{font-size:10px;color:var(--text2);line-height:1.5;max-height:80px;overflow:hidden;border-left:2px solid var(--border);padding-left:10px}

/* Claim card */
.claim-card{padding:16px;border:1px solid var(--border);border-radius:10px;margin-bottom:10px;border-left:4px solid var(--primary);animation:slideIn .5s}
.claim-card.confirmed{border-left-color:var(--green)}
.claim-card .claim-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px}
.claim-card .claim-title{font-family:var(--serif);font-weight:700;font-size:14px}
.claim-card .claim-status{font-size:9px;padding:2px 8px;border-radius:10px;font-weight:600}
.claim-card .claim-status.proposed{background:rgba(196,122,74,.1);color:var(--primary)}
.claim-card .claim-status.confirmed{background:rgba(90,138,90,.1);color:var(--green)}
.claim-card .elements{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:8px}
.claim-card .element{padding:6px 8px;border-radius:6px;background:var(--bg);font-size:10px;display:flex;align-items:center;gap:4px}
.claim-card .confirm-btn{margin-top:10px;padding:6px 14px;border:1px solid var(--green);border-radius:6px;background:transparent;color:var(--green);font-size:10px;font-weight:600;cursor:pointer;font-family:var(--font)}
.claim-card .confirm-btn:hover{background:var(--green);color:#fff}

/* Alert */
.alert{padding:14px 16px;border-radius:10px;margin-bottom:16px;animation:fadeIn .5s}
.alert.critical{background:rgba(184,66,51,.06);border:1px solid rgba(184,66,51,.15);border-left:4px solid var(--red)}
.alert .alert-title{font-size:11px;font-weight:700;color:var(--red);margin-bottom:4px}
.alert .alert-text{font-size:11px;color:var(--text2);line-height:1.5}

/* Progress log */
.log-area{margin-top:16px;padding:12px;background:var(--bg);border-radius:8px;font-size:10px;color:var(--text3);max-height:120px;overflow-y:auto;display:none}
.log-area.active{display:block}
.log-line{padding:2px 0;border-bottom:1px solid rgba(0,0,0,.03)}
.tag{font-weight:700;margin-right:4px}
.tag.run{color:var(--primary)}
.tag.ok{color:var(--green)}

/* Spinner */
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes slideIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
.spinner{width:14px;height:14px;border:2px solid var(--border);border-top-color:var(--primary);border-radius:50%;animation:spin .6s linear infinite;display:inline-block}

/* Pipeline visualization */
.pipeline{display:flex;gap:4px;align-items:center;justify-content:center;margin:12px 0;font-size:10px}
.pipe-step{padding:4px 10px;border-radius:10px;background:var(--bg);color:var(--text3);font-weight:500;transition:all .3s}
.pipe-step.active{background:rgba(196,122,74,.15);color:var(--primary);font-weight:700}
.pipe-step.done{background:rgba(90,138,90,.1);color:var(--green)}
.pipe-arrow{color:var(--border);font-size:8px}

/* Connection line between panels */
.connection-indicator{text-align:center;margin:16px 0;font-size:10px;color:var(--text3)}

/* Full-width bottom */
.bottom-panel{margin-top:24px}
.nav-links{display:flex;gap:12px;justify-content:center;margin-top:24px;font-size:11px}
.nav-links a{color:var(--text3);text-decoration:none;padding:6px 14px;border:1px solid var(--border);border-radius:8px}
.nav-links a:hover{border-color:var(--primary);color:var(--primary)}
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <a href="/document" class="back">&larr; Back to Kenzi Files</a>
    <h1>Start a New Case</h1>
    <p>Watch claims emerge from evidence. Add one piece at a time &mdash; the AI proposes claims, scores elements, and detects patterns across victims.</p>
  </div>

  <!-- Step buttons -->
  <div class="steps">
    <button class="step-btn" id="step-1" onclick="runStep(1)">
      <span class="num">1</span>
      Bank Statement
    </button>
    <button class="step-btn" id="step-2" onclick="runStep(2)" disabled>
      <span class="num">2</span>
      Forged Invoice
    </button>
    <button class="step-btn" id="step-3" onclick="runStep(3)" disabled>
      <span class="num">3</span>
      Second Victim
    </button>
    <button class="reset-btn" onclick="resetClean()">Reset</button>
  </div>

  <!-- Pipeline progress -->
  <div class="pipeline" id="pipeline" style="display:none">
    <span class="pipe-step" id="pipe-extract">Extractor</span>
    <span class="pipe-arrow">&rarr;</span>
    <span class="pipe-step" id="pipe-propose">Proposer</span>
    <span class="pipe-arrow">&rarr;</span>
    <span class="pipe-step" id="pipe-score">Scorer</span>
    <span class="pipe-arrow">&rarr;</span>
    <span class="pipe-step" id="pipe-analyze">Analyzer</span>
  </div>

  <!-- Alerts area -->
  <div id="alerts"></div>

  <!-- Two-column workspace -->
  <div class="workspace">
    <!-- Left: Evidence -->
    <div class="panel">
      <h2>&#x1F4C4; Evidence <span class="count" id="ev-count">${cleanEvidence.length}</span></h2>
      <div id="evidence-feed">
        ${cleanEvidence.length === 0 ? `
        <div class="empty">
          <div class="icon">&#x1F4E5;</div>
          <h3>No evidence yet</h3>
          <p>Click <strong>"1: Bank Statement"</strong> above to add the first piece of evidence. The AI will analyze it and propose legal claims.</p>
        </div>` : cleanEvidence.map(ev => {
          const typeIcon = ev.type === 'bank_statement' ? '&#x1F3E6;' : ev.type === 'invoice' ? '&#x1F4B3;' : '&#x1F4CE;';
          const safeTitle = (ev.title || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
          const safeType = (ev.type || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
          const safeSource = (ev.source || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
          const safeContent = (ev.content || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').slice(0, 300);
          return `<div class="ev-card" id="ev-${ev.id}"><div class="ev-header"><span class="ev-title">${typeIcon} ${safeTitle}</span><span class="ev-type">${safeType}</span></div><div class="ev-source">From: ${safeSource}</div><div class="ev-content">${safeContent}...</div></div>`;
        }).join('')}
      </div>
    </div>

    <!-- Right: Claims -->
    <div class="panel">
      <h2>&#x2696; Claims <span class="count" id="claim-count">${cleanClaims.length}</span></h2>
      <div id="claims-feed">
        ${cleanClaims.length === 0 ? `
        <div class="empty">
          <div class="icon">&#x1F50D;</div>
          <h3>No claims yet</h3>
          <p>Claims emerge from evidence. When you add evidence, the AI proposes claims with legal elements &mdash; each starting as <strong>unproven</strong>.</p>
        </div>` : ''}
      </div>
    </div>
  </div>

  <!-- How it works -->
  <div class="bottom-panel" style="margin-top:24px;background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:20px 24px;cursor:pointer" onclick="var b=document.getElementById('how-body');b.style.display=b.style.display==='none'?'block':'none'">
    <div style="display:flex;justify-content:space-between;align-items:center">
      <div style="font-family:var(--serif);font-size:16px;font-weight:700">How the AI Pipeline Works</div>
      <span style="color:var(--text3);font-size:10px">click to expand</span>
    </div>
    <div id="how-body" style="display:none;margin-top:16px">
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:16px">
        <div style="text-align:center;padding:16px 12px;background:var(--bg);border-radius:12px;border-top:3px solid var(--primary)">
          <div style="font-size:24px;margin-bottom:8px">&#x1F50D;</div>
          <div style="font-size:12px;font-weight:700;margin-bottom:4px">1. Evidence Extractor</div>
          <div style="font-size:10px;color:var(--text3);line-height:1.5">Reads raw evidence. Extracts entities, dates, amounts, jurisdictions. Flags which existing claims might be relevant.</div>
        </div>
        <div style="text-align:center;padding:16px 12px;background:var(--bg);border-radius:12px;border-top:3px solid var(--primary)">
          <div style="font-size:24px;margin-bottom:8px">&#x1F4DD;</div>
          <div style="font-size:12px;font-weight:700;margin-bottom:4px">2. Claim Proposer</div>
          <div style="font-size:10px;color:var(--text3);line-height:1.5">Proposes new claims OR enriches existing ones. Updates legal element status (unproven &rarr; partial &rarr; proven). Writes specific analysis.</div>
        </div>
        <div style="text-align:center;padding:16px 12px;background:var(--bg);border-radius:12px;border-top:3px solid var(--primary)">
          <div style="font-size:24px;margin-bottom:8px">&#x2696;</div>
          <div style="font-size:12px;font-weight:700;margin-bottom:4px">3. Claim Scorer</div>
          <div style="font-size:10px;color:var(--text3);line-height:1.5">Scores evidence relevance against all claims using dynamic weights. Weights shift based on attorney feedback over time.</div>
        </div>
        <div style="text-align:center;padding:16px 12px;background:var(--bg);border-radius:12px;border-top:3px solid var(--green)">
          <div style="font-size:24px;margin-bottom:8px">&#x1F30D;</div>
          <div style="font-size:12px;font-weight:700;margin-bottom:4px">4. Cross-Case Analyzer</div>
          <div style="font-size:10px;color:var(--text3);line-height:1.5">Detects patterns across victims &mdash; same scheme, same entity, same MO. This is where playbook detection happens.</div>
        </div>
      </div>
      <div style="text-align:center;font-size:11px;color:var(--text3);line-height:1.6;padding:12px;background:var(--bg);border-radius:8px">
        <strong style="color:var(--text)">Same architecture as Cere&rsquo;s hiring pipeline.</strong> Same agents, same cubbies, same Event/Context/CubbyClient interfaces. Instead of scoring candidates against traits, we score evidence against legal claims. Every claim is a cubby node. Every evidence item is a cubby node. The graph grows with each intake.
      </div>
    </div>
  </div>

  <!-- Log -->
  <div class="log-area" id="log"></div>

  <!-- Navigation -->
  <div class="nav-links">
    <a href="/">Landing Page</a>
    <a href="/document">Kenzi Files (Full Case)</a>
    <a href="/clean">Reset &amp; Start Over</a>
  </div>
</div>

<script>
var evtSource = null;
var currentStep = 0;
var stepRunning = false;

function connectSSE() {
  if (evtSource) try { evtSource.close(); } catch(e) {}
  evtSource = new EventSource('/api/events');
  evtSource.onmessage = function(e) {
    try {
      var d = JSON.parse(e.data);
      handleEvent(d);
    } catch(err) {}
  };
}
connectSSE();

function handleEvent(e) {
  if (e.type === 'clean_reset') {
    if (window._autoResetting) {
      // Step 1 auto-reset: clear DOM manually instead of reloading
      window._autoResetting = false;
      document.querySelectorAll('.ev-card').forEach(function(el) { el.remove(); });
      document.querySelectorAll('.claim-card').forEach(function(el) { el.remove(); });
      document.querySelectorAll('#alerts .alert').forEach(function(el) { el.remove(); });
      var oldCtx = document.getElementById('step-context');
      if (oldCtx) oldCtx.remove();
      document.getElementById('ev-count').textContent = '0';
      document.getElementById('claim-count').textContent = '0';
      var log = document.getElementById('log');
      log.innerHTML = ''; log.classList.remove('active');
      // Don't reset currentStep here — runStep already set it to 1
      // currentStep stays at 1 so the complete handler enables step-2
      [1,2,3].forEach(function(i) {
        var b = document.getElementById('step-' + i);
        if (b) { b.classList.remove('done','active'); if (i > 1) b.disabled = true; }
      });
      return;
    }
    location.reload(); return;
  }

  // Handle errors from pipeline
  if (e.type === 'error') {
    var errMsg = (e.data && e.data.message) || 'Pipeline error';
    addLog('error', errMsg);
    document.getElementById('pipeline').style.display = 'none';
    if (window._cleanTimer) { clearInterval(window._cleanTimer); window._cleanTimer = null; }
    var timerEl = document.getElementById('pipeline-timer');
    if (timerEl) timerEl.textContent = '';
    stepRunning = false;
    var alerts = document.getElementById('alerts');
    var errDiv = document.createElement('div');
    errDiv.className = 'alert critical';
    errDiv.innerHTML = '<div class="alert-title">Pipeline Error</div><div class="alert-text">' + escHtml(errMsg) + '</div>';
    alerts.appendChild(errDiv);
    // Re-enable current step button
    var btn = document.getElementById('step-' + currentStep);
    if (btn) btn.classList.remove('active');
    return;
  }

  if (e.type !== 'step' || !e.data || e.data.tab !== 'clean') return;

  var d = e.data;
  addLog(d.step, d.message || '');

  if (d.step === 'received') {
    // Show evidence card
    var ev = d.evidence;
    if (ev) addEvidenceCard(ev);
  }

  if (d.step === 'extracting') {
    showPipeline();
    setPipeStep('extract');
  }

  if (d.step === 'extracted') {
    setPipeStep('extract');
    // Mark extract as done
    document.getElementById('pipe-extract').className = 'pipe-step done';
  }

  if (d.step === 'proposing') {
    setPipeStep('propose');
  }

  if (d.step === 'proposed') {
    document.getElementById('pipe-propose').className = 'pipe-step done';
    // Show proposed claims
    if (d.proposals) {
      d.proposals.forEach(function(p) { addClaimCard(p); });
    }
    if (d.enrichments) {
      d.enrichments.forEach(function(en) { enrichClaim(en); });
    }
  }

  if (d.step === 'scoring') {
    setPipeStep('score');
  }

  if (d.step === 'scored') {
    document.getElementById('pipe-score').className = 'pipe-step done';
    if (d.scores) {
      d.scores.forEach(function(s) { updateClaimScore(s); });
    }
  }

  if (d.step === 'alerts') {
    if (d.alerts) {
      d.alerts.forEach(function(a) { addAlert(a); });
    }
  }

  if (d.step === 'complete') {
    setPipeStep('analyze');
    setTimeout(function() {
      document.getElementById('pipeline').style.display = 'none';
      if (window._cleanTimer) { clearInterval(window._cleanTimer); window._cleanTimer = null; }
      var timerEl = document.getElementById('pipeline-timer');
      if (timerEl) timerEl.textContent = '';
      stepRunning = false;
      // Mark current step as done
      var curr = document.getElementById('step-' + currentStep);
      if (curr) { curr.classList.remove('active'); curr.classList.add('done'); }
      // Enable NEXT step
      var next = document.getElementById('step-' + (currentStep + 1));
      if (next) next.disabled = false;
      updateCounts();
    }, 500);
  }

  if (d.step === 'error') {
    document.getElementById('pipeline').style.display = 'none';
    stepRunning = false;
  }
}

function runStep(n) {
  if (stepRunning) return;
  stepRunning = true;
  currentStep = n;
  var btn = document.getElementById('step-' + n);
  if (btn) btn.classList.add('active');
  // Clear empty states
  var evEmpty = document.querySelector('#evidence-feed .empty');
  if (evEmpty) evEmpty.remove();
  var clEmpty = document.querySelector('#claims-feed .empty');
  if (clEmpty) clEmpty.remove();

  // Show step context before pipeline runs
  var descriptions = {
    1: {title: 'Adding: Suspicious Bank Statement', text: 'Jennifer Wu (attorney) sent a Q4 bank statement from Apex Ventures showing $150K in suspicious transfers to "TechPartners Consulting LLC" \u2014 a company registered to the CFO\u2019s home address. The AI will extract signals, propose an embezzlement claim, and score legal elements.'},
    2: {title: 'Adding: Forged Vendor Invoice', text: 'The TechPartners invoice reveals a textbook self-dealing scheme: the CFO created a shell company 6 weeks before the first invoice, used the same invoice template as Apex, and approved his own invoices. The AI will propose a forgery claim and enrich the existing embezzlement claim.'},
    3: {title: 'Adding: Second Victim\u2019s Bank Statement', text: 'David Ortiz from Ortiz Capital discovers the SAME scheme \u2014 Marcus Chen recommended TechPartners to his fund too. Same template, same boilerplate, $200K stolen. The AI will detect the PLAYBOOK PATTERN: same fraud across multiple victims = conspiracy.'}
  };
  var desc = descriptions[n];
  if (desc) {
    var alerts = document.getElementById('alerts');
    var ctx = document.createElement('div');
    ctx.className = 'alert';
    ctx.style.cssText = 'background:rgba(196,122,74,.04);border:1px solid rgba(196,122,74,.15);border-left:4px solid var(--primary)';
    ctx.innerHTML = '<div class="alert-title" style="color:var(--primary)">' + desc.title + '</div><div class="alert-text">' + desc.text + '</div>';
    ctx.id = 'step-context';
    var old = document.getElementById('step-context');
    if (old) old.remove();
    alerts.insertBefore(ctx, alerts.firstChild);
  }

  showPipeline();

  // Show elapsed timer so user knows it's still working
  var timerEl = document.getElementById('pipeline-timer');
  if (!timerEl) {
    timerEl = document.createElement('div');
    timerEl.id = 'pipeline-timer';
    timerEl.style.cssText = 'text-align:center;font-size:10px;color:var(--text3);margin-top:4px';
    document.getElementById('pipeline').parentNode.insertBefore(timerEl, document.getElementById('pipeline').nextSibling);
  }
  var startTime = Date.now();
  window._cleanTimer = setInterval(function() {
    var secs = Math.round((Date.now() - startTime) / 1000);
    timerEl.innerHTML = '<span class="spinner" style="width:10px;height:10px;vertical-align:middle;margin-right:4px"></span>Processing with Gemini AI... ' + secs + 's (typically 30-90s)';
  }, 1000);

  // Auto-reset on Step 1 if stale data exists
  if (n === 1) {
    window._autoResetting = true;
    fetch('/demo/clean/reset', { method: 'POST' }).then(function() {
      // Small delay to let reset complete before running step
      setTimeout(function() {
        fetch('/demo/clean/step/' + n, { method: 'POST' });
      }, 500);
    });
  } else {
    fetch('/demo/clean/step/' + n, { method: 'POST' });
  }
}

function resetClean() {
  fetch('/demo/clean/reset', { method: 'POST' });
}

function showPipeline() {
  var p = document.getElementById('pipeline');
  p.style.display = 'flex';
  ['extract','propose','score','analyze'].forEach(function(s) {
    document.getElementById('pipe-' + s).className = 'pipe-step';
  });
}

function setPipeStep(name) {
  var steps = ['extract','propose','score','analyze'];
  var idx = steps.indexOf(name);
  steps.forEach(function(s, i) {
    var el = document.getElementById('pipe-' + s);
    if (i < idx) el.className = 'pipe-step done';
    else if (i === idx) el.className = 'pipe-step active';
    else el.className = 'pipe-step';
  });
}

function addEvidenceCard(ev) {
  var feed = document.getElementById('evidence-feed');
  // Deduplicate by evidence ID
  if (ev.id && document.getElementById('ev-' + ev.id)) return;
  var card = document.createElement('div');
  card.className = 'ev-card';
  if (ev.id) card.id = 'ev-' + ev.id;
  var typeIcon = ev.type === 'bank_statement' ? '&#x1F3E6;' : ev.type === 'invoice' ? '&#x1F4B3;' : '&#x1F4CE;';
  card.innerHTML = '<div class="ev-header"><span class="ev-title">' + typeIcon + ' ' + escHtml(ev.title) + '</span><span class="ev-type">' + escHtml(ev.type) + '</span></div>' +
    '<div class="ev-source">From: ' + escHtml(ev.source) + '</div>' +
    '<div class="ev-content">' + escHtml(ev.content).slice(0, 300) + '...</div>';
  feed.insertBefore(card, feed.firstChild);
  updateCounts();
}

function normalizeTitle(t) {
  return (t || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function findClaimByTitle(title) {
  var norm = normalizeTitle(title);
  var cards = document.querySelectorAll('.claim-card');
  for (var i = 0; i < cards.length; i++) {
    var el = cards[i].querySelector('.claim-title');
    if (!el) continue;
    var existing = normalizeTitle(el.textContent);
    // Match if one title contains the other or they share 80%+ of characters
    if (existing === norm) return cards[i];
    if (norm.length > 4 && existing.length > 4) {
      if (existing.indexOf(norm) !== -1 || norm.indexOf(existing) !== -1) return cards[i];
      // Check overlap: count shared characters
      var shorter = norm.length < existing.length ? norm : existing;
      var longer = norm.length < existing.length ? existing : norm;
      var matches = 0;
      for (var j = 0; j < shorter.length; j++) {
        if (longer.indexOf(shorter[j]) !== -1) matches++;
      }
      if (matches / longer.length > 0.8) return cards[i];
    }
  }
  return null;
}

function addClaimCard(claim) {
  var feed = document.getElementById('claims-feed');
  // Check if claim already exists by ID
  if (document.getElementById('claim-' + claim.id)) return;
  // Check if a claim with a similar title already exists (Gemini may generate different IDs for the same claim across steps)
  var duplicate = findClaimByTitle(claim.title);
  if (duplicate) {
    // Treat as enrichment instead of adding a new card
    enrichClaim({ claim_id: duplicate.id.replace('claim-', ''), changes: 'Additional evidence strengthens this claim (from new step)' });
    return;
  }
  var card = document.createElement('div');
  card.className = 'claim-card';
  card.id = 'claim-' + claim.id;
  card.innerHTML = '<div class="claim-header"><span class="claim-title">' + escHtml(claim.title) + '</span><span class="claim-status proposed">PROPOSED</span></div>' +
    '<div style="font-size:10px;color:var(--text3)">AI-proposed from evidence analysis</div>' +
    '<button class="confirm-btn" id="confirm-' + claim.id + '">Confirm Claim</button>';
  // Attach event listener after DOM update
  setTimeout(function() {
    var cfBtn = document.getElementById('confirm-' + claim.id);
    if (cfBtn) cfBtn.onclick = function() { confirmClaim(cfBtn, claim.id); };
  }, 100);
  feed.appendChild(card);
  updateCounts();
}

function enrichClaim(en) {
  var card = document.getElementById('claim-' + en.claim_id);
  if (!card) return;
  var note = document.createElement('div');
  note.style.cssText = 'margin-top:8px;padding:8px;background:rgba(90,138,138,.05);border-left:2px solid var(--cyan);border-radius:0 6px 6px 0;font-size:10px;color:var(--text2);animation:fadeIn .5s';
  note.innerHTML = '<strong style="color:var(--cyan)">ENRICHED:</strong> ' + escHtml(en.changes || 'New evidence strengthens this claim');
  card.appendChild(note);
}

function updateClaimScore(s) {
  var card = document.getElementById('claim-' + s.claimId);
  if (!card) return;
  var score = Math.round(s.score * 100);
  var existing = card.querySelector('.score-badge');
  if (existing) { existing.textContent = score + '% relevant'; return; }
  var badge = document.createElement('span');
  badge.className = 'score-badge';
  badge.style.cssText = 'display:inline-block;margin-top:6px;padding:2px 8px;border-radius:10px;background:' + (score >= 70 ? 'rgba(90,138,90,.1);color:var(--green)' : 'rgba(196,122,74,.1);color:var(--primary)') + ';font-size:9px;font-weight:600';
  badge.textContent = score + '% relevant';
  card.querySelector('.claim-header').appendChild(badge);
}

function confirmClaim(btn, claimId) {
  fetch('/demo/clean/confirm/' + claimId, { method: 'POST' });
  var card = document.getElementById('claim-' + claimId);
  if (card) {
    card.classList.add('confirmed');
    var status = card.querySelector('.claim-status');
    if (status) { status.textContent = 'CONFIRMED'; status.className = 'claim-status confirmed'; }
  }
  btn.remove();
}

function addAlert(a) {
  var el = document.createElement('div');
  el.className = 'alert ' + (a.severity || 'critical');
  el.innerHTML = '<div class="alert-title">' + escHtml(a.title) + '</div><div class="alert-text">' + escHtml(a.description) + '</div>';
  document.getElementById('alerts').appendChild(el);
}

function addLog(step, msg) {
  var log = document.getElementById('log');
  log.classList.add('active');
  var line = document.createElement('div');
  line.className = 'log-line';
  var cls = step === 'complete' ? 'ok' : 'run';
  line.innerHTML = '<span class="tag ' + cls + '">[' + step.toUpperCase() + ']</span> ' + escHtml(msg);
  log.appendChild(line);
  log.scrollTop = log.scrollHeight;
}

function updateCounts() {
  var evCount = document.querySelectorAll('.ev-card').length;
  var clCount = document.querySelectorAll('.claim-card').length;
  document.getElementById('ev-count').textContent = evCount;
  document.getElementById('claim-count').textContent = clCount;
}

function escHtml(s) {
  if (!s) return '';
  var d = document.createElement('div');
  d.appendChild(document.createTextNode(s));
  return d.innerHTML;
}

// Restore state from existing data
${cleanClaims.length > 0 ? `currentStep = ${Math.min(cleanEvidence.length, 3)};
${[1,2,3].map(n => cleanEvidence.length >= n ? `document.getElementById('step-${n}').classList.add('done');` : '').join(NL)}
${cleanEvidence.length < 3 ? `var nextBtn = document.getElementById('step-${cleanEvidence.length + 1}'); if (nextBtn) nextBtn.disabled = false;` : ''}
` : ''}
</script>
</body>
</html>`);
}
