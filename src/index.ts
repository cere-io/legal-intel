import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { query } from './db/connection.js';
import { initRuntime, dumpCubbies, getCubbyTree, getCubby, resetCubbies, getCubbyHistory, createContext, clearCleanCache } from './runtime.js';
import { handle as conciergeHandle } from './agents/concierge.js';
import { distill } from './agents/distillation.js';
import { ROCKY_EMAIL } from './data/rocky-email.js';
import { CLEAN_EVIDENCE_STEPS, CLEAN_FEEDBACK } from './data/clean-scenario.js';
import { renderLanding } from './routes/landing.js';
import { renderDocument } from './routes/document-view.js';
import { renderCleanOnboarding } from './routes/clean-onboarding.js';
import { renderCleanCaseView } from './routes/clean-case-view.js';
import { mainGraph, claimGraph } from './routes/graphs-api.js';
import type { Event, Claim, EvidenceItem, LegalCase, ClaimWeights, SSEEvent } from './types/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json());
app.use('/static', express.static(path.join(__dirname, 'routes')));
app.use('/assets', express.static(path.join(__dirname, '..', 'public')));

// === LANDING PAGE ===
app.get('/', renderLanding);

// === DOCUMENT VIEW (the real product) ===
app.get('/document', renderDocument);

// === CLEAN ONBOARDING (new case experience) ===
app.get('/clean', renderCleanOnboarding);
app.get('/clean/case', renderCleanCaseView);

// === SSE ===
const sseClients: Set<express.Response> = new Set();

app.get('/api/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();
  sseClients.add(res);
  req.on('close', () => sseClients.delete(res));
});

function broadcast(event: SSEEvent) {
  const data = 'data: ' + JSON.stringify(event) + '\n\n';
  for (const client of sseClients) client.write(data);
}

// === GRAPH API ===
app.get('/api/graph/main', mainGraph);
app.get('/api/graph/claim/:id', claimGraph);

// Clean case graph API
app.get('/api/graph/clean', (_req, res) => {
  const allData = dumpCubbies();
  const nodes: Array<{ id: string; label: string; type: string; strength?: number; radius: number; color: string }> = [];
  const links: Array<{ source: string; target: string; strength: number }> = [];
  const claims: Array<{ id: string; title: string; strength: number; connected_claims?: Record<string, number>; evidence_chain?: string[] }> = [];

  Object.entries(allData).forEach(([k, v]) => {
    if (k.startsWith('clean/claims/')) {
      const c = v as typeof claims[0] & { title: string };
      claims.push(c);
      nodes.push({ id: c.id, label: c.title, type: 'claim', strength: c.strength, radius: 10 + (c.strength || 0) * 16, color: (c.strength || 0) >= 0.7 ? '#5a8a5e' : (c.strength || 0) >= 0.4 ? '#c47a4a' : '#9a9087' });
    }
  });

  // Evidence nodes
  Object.entries(allData).forEach(([k, v]) => {
    if (k.startsWith('clean/evidence/')) {
      const ev = v as { id: string; title: string; type: string };
      nodes.push({ id: 'ev-' + ev.id, label: ev.title, type: 'evidence', radius: 7, color: '#5a8a8a' });
    }
  });

  // Links: claim → evidence
  claims.forEach(c => {
    (c.evidence_chain || []).forEach(eid => {
      if (nodes.find(n => n.id === 'ev-' + eid)) {
        links.push({ source: c.id, target: 'ev-' + eid, strength: 0.6 });
      }
    });
    // Claim → claim connections
    Object.entries(c.connected_claims || {}).forEach(([connId, str]) => {
      if (c.id < connId && claims.find(cl => cl.id === connId)) {
        links.push({ source: c.id, target: connId, strength: str as number });
      }
    });
  });

  res.json({ nodes, links });
});

// Per-claim graph for clean namespace
app.get('/api/graph/clean/claim/:id', (req, res) => {
  const claimId = req.params.id;
  const allData = dumpCubbies();
  const claim = allData['clean/claims/' + claimId] as { id: string; title: string; strength: number; elements?: Array<{ id: string; name: string; status: string; supporting_evidence?: string[] }>; evidence_chain?: string[]; key_entities?: string[]; connected_claims?: Record<string, number> } | undefined;
  if (!claim) return res.status(404).json({ error: 'Claim not found' });

  const nodes: Array<{ id: string; label: string; type: string; status?: string; radius: number; color: string }> = [];
  const links: Array<{ source: string; target: string; strength: number; label?: string }> = [];

  // Center: claim
  nodes.push({ id: claim.id, label: claim.title, type: 'claim', radius: 20, color: '#c47a4a' });

  // Elements
  (claim.elements || []).forEach(el => {
    const elId = claim.id + '/el/' + el.id;
    const color = el.status === 'proven' ? '#5a8a5e' : el.status === 'partial' ? '#c47a4a' : '#b84233';
    nodes.push({ id: elId, label: el.name, type: 'element', status: el.status, radius: 8, color });
    links.push({ source: claim.id, target: elId, strength: 0.7, label: el.status });

    (el.supporting_evidence || []).forEach(eid => {
      const evNodeId = 'ev/' + eid;
      if (!nodes.find(n => n.id === evNodeId)) {
        const ev = allData['clean/evidence/' + eid] as { title?: string } | undefined;
        nodes.push({ id: evNodeId, label: ev?.title || eid, type: 'evidence', radius: 6, color: '#5a8a8a' });
      }
      links.push({ source: elId, target: evNodeId, strength: 0.5 });
    });
  });

  // Evidence chain items not yet linked
  (claim.evidence_chain || []).forEach(eid => {
    const evNodeId = 'ev/' + eid;
    if (!nodes.find(n => n.id === evNodeId)) {
      const ev = allData['clean/evidence/' + eid] as { title?: string } | undefined;
      nodes.push({ id: evNodeId, label: ev?.title || eid, type: 'evidence', radius: 6, color: '#5a8a8a' });
      links.push({ source: claim.id, target: evNodeId, strength: 0.4 });
    }
  });

  // Key entities
  (claim.key_entities || []).slice(0, 5).forEach(entity => {
    const entId = 'ent/' + entity.replace(/[^a-zA-Z0-9]/g, '-');
    if (!nodes.find(n => n.id === entId)) {
      nodes.push({ id: entId, label: entity, type: 'entity', radius: 5, color: '#7a6398' });
      links.push({ source: claim.id, target: entId, strength: 0.3 });
    }
  });

  // Connected claims
  Object.entries(claim.connected_claims || {}).forEach(([connId, str]) => {
    const conn = allData['clean/claims/' + connId] as { title?: string } | undefined;
    if (conn) {
      const connNodeId = 'conn/' + connId;
      nodes.push({ id: connNodeId, label: conn.title || connId, type: 'claim', radius: 10, color: '#9a9087' });
      links.push({ source: claim.id, target: connNodeId, strength: str as number });
    }
  });

  res.json({ nodes, links, claim: { id: claim.id, title: claim.title, strength: claim.strength } });
});

// === CUBBY API ===

app.get('/api/cubbies', (_req, res) => {
  res.json(getCubbyTree());
});

app.get('/api/cubby/:a', (req, res) => {
  const data = getCubby(req.params.a);
  if (data === null) return res.status(404).json({ error: 'Not found' });
  res.json(data);
});

app.get('/api/cubby/:a/:b', (req, res) => {
  const data = getCubby(req.params.a + '/' + req.params.b);
  if (data === null) return res.status(404).json({ error: 'Not found' });
  res.json(data);
});

app.get('/api/cubby/:a/:b/:c', (req, res) => {
  const data = getCubby(req.params.a + '/' + req.params.b + '/' + req.params.c);
  if (data === null) return res.status(404).json({ error: 'Not found' });
  res.json(data);
});

app.get('/api/cubby-history/:a/:b', async (req, res) => {
  const history = await getCubbyHistory(req.params.a + '/' + req.params.b);
  res.json(history);
});

app.get('/api/data', (_req, res) => {
  res.json(dumpCubbies());
});

// === CLAIM ACTIONS ===

app.post('/api/claims/:id/confirm', (req, res) => {
  const { context } = createContext();
  const claimsCubby = context.cubby('claims');
  const claim = claimsCubby.json.get('/' + req.params.id) as Claim | null;
  if (!claim) return res.status(404).json({ error: 'Claim not found' });
  claim.status = 'active';
  claim.confirmed_by = req.body.confirmed_by || 'Attorney';
  claim.updated_at = new Date().toISOString();
  claim.evolution_log.push({ date: new Date().toISOString().split('T')[0], delta: 'Confirmed by ' + claim.confirmed_by });
  claimsCubby.json.set('/' + claim.id, claim);

  // Add to weights
  const metaCubby = context.cubby('meta');
  const weights = (metaCubby.json.get('/claim_weights/default') || {}) as ClaimWeights;
  if (!(claim.id in weights)) {
    const baseWeight = Object.keys(weights).length > 0 ? 1.0 / (Object.keys(weights).length + 1) : 0.5;
    weights[claim.id] = baseWeight;
    // Renormalize
    const sum = Object.values(weights).reduce((a, b) => a + b, 0);
    for (const k of Object.keys(weights)) weights[k] = weights[k]! / sum;
    metaCubby.json.set('/claim_weights/default', weights);
  }

  broadcast({ type: 'claim_confirmed', data: { claim } });
  res.json({ ok: true, claim });
});

app.post('/api/claims/:id/reject', (req, res) => {
  const { context } = createContext();
  const claimsCubby = context.cubby('claims');
  const claim = claimsCubby.json.get('/' + req.params.id) as Claim | null;
  if (!claim) return res.status(404).json({ error: 'Claim not found' });
  claim.status = 'rejected';
  claim.updated_at = new Date().toISOString();
  claim.evolution_log.push({ date: new Date().toISOString().split('T')[0], delta: 'Rejected by attorney' });
  claimsCubby.json.set('/' + claim.id, claim);
  broadcast({ type: 'claim_rejected', data: { claim_id: claim.id } });
  res.json({ ok: true });
});

// === FEEDBACK (triggers distillation) ===

app.post('/api/feedback', async (req, res) => {
  const { context, logs } = createContext();
  const result = await distill(req.body, context);
  broadcast({ type: 'weights_updated', data: result });
  res.json({ ...result, logs });
});

// === DEMO: KENZI TAB ===

app.post('/demo/reset', async (_req, res) => {
  // Re-run seed
  const fs = await import('fs');
  const schemaPath = new URL('db/schema.sql', import.meta.url);
  const schema = fs.readFileSync(schemaPath, 'utf-8');
  await query(schema);
  // Re-seed
  const { TEMPLATES } = await import('./data/seed-templates.js');
  const { KENZI_CLAIMS, KENZI_EVIDENCE, KENZI_CASES, KENZI_WEIGHTS } = await import('./data/seed-kenzi.js');
  for (const t of TEMPLATES) await query(`INSERT INTO cubbies (path, data) VALUES ($1, $2::jsonb) ON CONFLICT (path) DO UPDATE SET data = $2::jsonb`, ['templates/' + t.id, JSON.stringify(t)]);
  for (const c of KENZI_CLAIMS) await query(`INSERT INTO cubbies (path, data) VALUES ($1, $2::jsonb) ON CONFLICT (path) DO UPDATE SET data = $2::jsonb`, ['claims/' + c.id, JSON.stringify(c)]);
  for (const e of KENZI_EVIDENCE) await query(`INSERT INTO cubbies (path, data) VALUES ($1, $2::jsonb) ON CONFLICT (path) DO UPDATE SET data = $2::jsonb`, ['evidence/' + e.id, JSON.stringify(e)]);
  for (const c of KENZI_CASES) await query(`INSERT INTO cubbies (path, data) VALUES ($1, $2::jsonb) ON CONFLICT (path) DO UPDATE SET data = $2::jsonb`, ['cases/' + c.id, JSON.stringify(c)]);
  await query(`INSERT INTO cubbies (path, data) VALUES ($1, $2::jsonb) ON CONFLICT (path) DO UPDATE SET data = $2::jsonb`, ['meta/claim_weights/default', JSON.stringify(KENZI_WEIGHTS)]);
  for (const e of KENZI_EVIDENCE) {
    const sr = { evidence_id: e.id, scores: e.claims_implicated.map(ci => ({ claim_id: ci.claim_id, element_scores: {}, overall: ci.relevance, reasoning: ci.reasoning })), weights_used: KENZI_WEIGHTS, timestamp: e.extracted_at };
    await query(`INSERT INTO cubbies (path, data) VALUES ($1, $2::jsonb) ON CONFLICT (path) DO UPDATE SET data = $2::jsonb`, ['scores/' + e.id, JSON.stringify(sr)]);
  }
  // Also re-seed document sections and evidence graphs
  const { DOCUMENT_SECTIONS, EVIDENCE_GRAPHS } = await import('./data/seed-document.js');
  for (const s of DOCUMENT_SECTIONS) await query(`INSERT INTO cubbies (path, data) VALUES ($1, $2::jsonb) ON CONFLICT (path) DO UPDATE SET data = $2::jsonb`, ['document/sections/' + s.id, JSON.stringify(s)]);
  await query(`INSERT INTO cubbies (path, data) VALUES ($1, $2::jsonb) ON CONFLICT (path) DO UPDATE SET data = $2::jsonb`, ['document/meta', JSON.stringify({ title: 'THE KEN ZI WANG CRIME', subtitle: 'THE KENZI FILES - ATTACHED EVIDENCE FILES REFERENCES', submitted: 'March 23, 2026', section_order: DOCUMENT_SECTIONS.map(s => s.id), total_sections: 18, seeded_sections: DOCUMENT_SECTIONS.length, total_evidence_files: EVIDENCE_GRAPHS.length })]);
  for (const g of EVIDENCE_GRAPHS) await query(`INSERT INTO cubbies (path, data) VALUES ($1, $2::jsonb) ON CONFLICT (path) DO UPDATE SET data = $2::jsonb`, ['graphs/' + g.id, JSON.stringify(g)]);

  // Re-run granular evidence seed
  try {
    const { execSync } = await import('child_process');
    execSync('npx tsx src/data/seed-granular-evidence.ts', { cwd: process.cwd(), timeout: 15000 });
    execSync('npx tsx src/data/seed-missing-sections.ts', { cwd: process.cwd(), timeout: 10000 });
  } catch (e) { console.log('Extra seed skipped:', (e as Error).message?.slice(0, 100)); }

  await initRuntime();
  broadcast({ type: 'reset', data: {} });
  res.json({ ok: true });
});

app.post('/demo/trigger', async (_req, res) => {
  res.json({ ok: true, message: 'Concierge → 4 agents' });

  const evidenceId = 'rocky-goopal-' + Date.now();

  broadcast({ type: 'step', data: { step: 'received', message: 'New evidence incoming — Rocky Lee email', evidence: { id: evidenceId, type: ROCKY_EMAIL.type, title: ROCKY_EMAIL.title, source: ROCKY_EMAIL.source } } });

  try {
    const { context, logs } = createContext();
    const event: Event = {
      id: 'ev-' + evidenceId,
      event_type: 'NEW_EVIDENCE',
      app_id: 'kenzi-intel',
      account_id: 'cere-legal',
      timestamp: new Date().toISOString(),
      payload: { evidenceId, evidenceType: ROCKY_EMAIL.type, source: ROCKY_EMAIL.source, content: ROCKY_EMAIL.content },
      signature: '',
      context_path: { agent_service: 'kenzi-intel', workspace: 'legal', stream: 'evidence-intake' },
    };

    // Run agents individually with broadcasts between each step
    const { extract } = await import('./agents/evidence-extractor.js');
    const { propose } = await import('./agents/claim-proposer.js');
    const { score: scoreEvidence } = await import('./agents/claim-scorer.js');
    const { analyze } = await import('./agents/cross-case-analyzer.js');

    const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

    // Step 1: Evidence Extractor
    broadcast({ type: 'step', data: { step: 'extracting', message: '[1/4] Evidence Extractor — extracting signals from Rocky\'s email...' } });
    const extractResult = await extract({ evidenceId, evidenceType: ROCKY_EMAIL.type, source: ROCKY_EMAIL.source, content: ROCKY_EMAIL.content }, context) as { success: boolean; signal?: EvidenceItem };
    if (!extractResult.success) throw new Error('Extraction failed');
    broadcast({ type: 'step', data: { step: 'extracted', message: '[1/4] Complete — ' + (extractResult.signal?.entities?.length || 0) + ' entities, urgency ' + (extractResult.signal?.urgency || 0) + '/10' } });

    await delay(2000); // Avoid Gemini rate limiting

    // Step 2: Claim Proposer
    broadcast({ type: 'step', data: { step: 'proposing', message: '[2/4] Claim Proposer — analyzing against 18 claims...' } });
    let proposeResult: { success: boolean; enrichments?: Array<{ claim_id: string; changes: string }>; proposals?: Array<Claim> };
    try {
      proposeResult = await propose({ evidenceId, rawContent: ROCKY_EMAIL.content }, context) as typeof proposeResult;
    } catch (err) {
      console.log('Proposer failed, retrying after 5s...', err instanceof Error ? err.message : err);
      broadcast({ type: 'step', data: { step: 'proposing', message: '[2/4] Retrying Claim Proposer...' } });
      await delay(5000);
      proposeResult = await propose({ evidenceId, rawContent: ROCKY_EMAIL.content }, context) as typeof proposeResult;
    }
    if (!proposeResult.success) throw new Error('Proposal failed');
    broadcast({ type: 'step', data: {
      step: 'proposed',
      message: '[2/4] Complete — ' + (proposeResult.enrichments?.length || 0) + ' sections enriched',
      enrichments: proposeResult.enrichments,
      proposals: proposeResult.proposals?.map(p => ({ id: p.id, title: p.title, status: p.status })),
    }});

    await delay(2000); // Avoid Gemini rate limiting

    // Step 3: Claim Scorer
    broadcast({ type: 'step', data: { step: 'scoring', message: '[3/4] Claim Scorer — scoring with dynamic weights...' } });
    let scoreResult: { success: boolean; scoreRecord?: { scores: Array<{ claim_id: string; overall: number; reasoning: string }> } };
    try {
      scoreResult = await scoreEvidence({ evidenceId }, context) as typeof scoreResult;
    } catch (err) {
      console.log('Scorer failed, retrying after 5s...', err instanceof Error ? err.message : err);
      await delay(5000);
      scoreResult = await scoreEvidence({ evidenceId }, context) as typeof scoreResult;
    }
    if (!scoreResult.success) throw new Error('Scoring failed');
    const scores = scoreResult.scoreRecord?.scores || [];
    broadcast({ type: 'step', data: {
      step: 'scored',
      message: '[3/4] Complete — ' + scores.filter(s => s.overall >= 0.7).length + ' high-relevance matches',
      scores: scores.map(s => ({ claimId: s.claim_id, score: s.overall, reasoning: s.reasoning })),
    }});

    // Step 4: Cross-Case Analyzer
    broadcast({ type: 'step', data: { step: 'analyzing', message: '[4/4] Cross-Case Analyzer — checking 7 proceedings...' } });
    const analyzeResult = await analyze({ evidenceId }, context) as { success: boolean; impacts?: Array<{ case_name: string; impact_level: string; reasoning: string }>; actions?: Array<{ assigned_to: string; firm: string; title: string; description: string; priority: string; sla_hours: number }> };
    if (!analyzeResult.success) throw new Error('Analysis failed');
    broadcast({ type: 'step', data: {
      step: 'analyzed',
      message: '[4/4] Complete — ' + (analyzeResult.impacts?.length || 0) + ' cases affected, ' + (analyzeResult.actions?.length || 0) + ' actions',
      impacts: analyzeResult.impacts,
      actions: analyzeResult.actions,
    }});

    // Alerts
    const impacts = analyzeResult.impacts || [];
    const alerts = [
      { severity: 'critical', title: 'BOMBSHELL: Goopal CEO denies authorizing RICO lawsuit', description: 'Goopal CEO unequivocally stated company neither authorized nor had knowledge of lawsuit (3:26-cv-00857).' },
      ...(impacts.length > 1 ? [{ severity: 'high', title: 'Cross-case collision: ' + impacts.length + ' proceedings affected', description: impacts.map((i: { case_name: string }) => i.case_name).join(', ') }] : []),
      { severity: 'high', title: 'URGENT: Amended complaint expected early next week', description: 'Goopal CEO declaration needed before opposing counsel files.' },
    ];
    broadcast({ type: 'step', data: { step: 'alerts', message: alerts.length + ' alerts', alerts } });

    // Step 5: Update evidence graphs + document sections affected by enrichments
    const enrichments = proposeResult.enrichments || [];
    if (enrichments.length > 0) {
      broadcast({ type: 'step', data: { step: 'regenerating', message: 'Regenerating affected knowledge graphs...' } });

      // Update the document sections in cubbies with new content
      for (const en of enrichments) {
        const claimPath = 'claims/' + en.claim_id;
        const claimData = getCubby(claimPath) as { current_understanding?: string; evolution_log?: Array<{ date: string; delta: string }> } | null;
        if (claimData && en.changes) {
          // Broadcast the updated claim understanding to the frontend
          broadcast({ type: 'graph_update', data: {
            claim_id: en.claim_id,
            new_understanding: en.changes,
            updated_claim: claimData,
          }});
        }
      }

      // Update evidence graph summaries that are connected to enriched claims
      const affectedEvGraphs = new Set<string>();
      for (const en of enrichments) {
        // Map claim to evidence graphs
        const evidenceMap: Record<string, string[]> = {
          'vivian-theft': ['big-report'],
          'confrontation': ['dhty-report'],
          'fabrication': ['qri-report-3', 'qri-report-1'],
          'embezzlement': ['dhty-report', 'ascent-audit'],
          'board-investigation': ['practus-report', 'ascent-audit', 'dhty-report'],
          'syndicate': ['big-report', 'qri-report-3'],
        };
        const graphs = evidenceMap[en.claim_id] || [];
        graphs.forEach(g => affectedEvGraphs.add(g));
      }

      for (const graphId of affectedEvGraphs) {
        broadcast({ type: 'evidence_graph_update', data: {
          graph_id: graphId,
          update_note: 'New evidence from Rocky Lee corroborates findings in this report. Goopal CEO non-authorization strengthens the evidentiary chain.',
        }});
      }
    }

    // Human-readable "What's New" summary for lawyers
    const enrichedClaimNames = enrichments.map(en => {
      const c = getCubby('claims/' + en.claim_id) as { title?: string } | null;
      return c?.title || en.claim_id;
    });
    const impactedCaseNames = (analyzeResult.impacts || []).map((i: { case_name: string }) => i.case_name);
    const actionCount = (analyzeResult.actions || []).length;

    broadcast({ type: 'whats_new', data: {
      headline: 'Rocky Lee\'s email processed — ' + enrichments.length + ' claims strengthened across ' + impactedCaseNames.length + ' cases',
      enriched_claims: enrichedClaimNames,
      impacted_cases: impactedCaseNames,
      action_count: actionCount,
      key_insight: enrichments.length > 0 ? enrichments[0].changes : 'Evidence analyzed and scored.',
    }});

    broadcast({ type: 'step', data: { step: 'complete', message: 'Pipeline complete — ' + enrichments.length + ' sections enriched, ' + scores.length + ' claims scored, ' + impactedCaseNames.length + ' cases affected' } });

  } catch (err: unknown) {
    broadcast({ type: 'error', data: { message: err instanceof Error ? err.message : String(err) } });
  }
});

// === DEMO: CLEAN TAB ===

app.post('/demo/clean/reset', async (_req, res) => {
  // Delete all clean/ prefixed cubbies
  await query(`DELETE FROM cubbies WHERE path LIKE 'clean/%'`);
  clearCleanCache();
  await initRuntime();
  broadcast({ type: 'clean_reset', data: {} });
  res.json({ ok: true });
});

app.post('/demo/clean/step/:n', async (req, res) => {
  const stepNum = parseInt(req.params.n);
  const step = CLEAN_EVIDENCE_STEPS.find(s => s.step === stepNum);
  if (!step) return res.status(404).json({ error: 'Step not found' });

  res.json({ ok: true, step: stepNum });

  const evidenceId = step.evidence.id;

  broadcast({ type: 'step', data: { step: 'received', message: 'Step ' + stepNum + ': ' + step.title, evidence: step.evidence, tab: 'clean' } });

  try {
    const { context, logs } = createContext('clean');
    // Load templates into clean namespace
    const { TEMPLATES } = await import('./data/seed-templates.js');
    const templatesCubby = context.cubby('templates');
    for (const t of TEMPLATES) {
      if (!templatesCubby.json.exists('/' + t.id)) {
        templatesCubby.json.set('/' + t.id, t);
      }
    }

    const event: Event = {
      id: 'ev-clean-' + evidenceId,
      event_type: 'NEW_EVIDENCE',
      app_id: 'kenzi-intel',
      account_id: 'apex-ventures',
      timestamp: new Date().toISOString(),
      payload: { evidenceId, evidenceType: step.evidence.type, source: step.evidence.source, content: step.evidence.content },
      signature: '',
      context_path: { agent_service: 'kenzi-intel', workspace: 'clean', stream: 'evidence-intake' },
    };

    // Run agents individually with broadcasts between each (like Kenzi demo)
    const { extract } = await import('./agents/evidence-extractor.js');
    const { propose } = await import('./agents/claim-proposer.js');
    const { score: scoreEvidence } = await import('./agents/claim-scorer.js');

    const delay = (ms: number) => new Promise(r => setTimeout(r, ms));
    // Longer delay for later steps (Gemini rate limits after many calls)
    const baseDelay = stepNum >= 3 ? 5000 : stepNum >= 2 ? 3000 : 2000;

    // Helper: retry Gemini call up to 2 times with increasing backoff
    async function withRetry<T>(name: string, fn: () => Promise<T>, tab: string): Promise<T> {
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          return await fn();
        } catch (err) {
          if (attempt < 2) {
            const backoff = (attempt + 1) * 8000;
            console.log(`${name} failed (attempt ${attempt + 1}), retrying in ${backoff/1000}s...`, err instanceof Error ? err.message : err);
            broadcast({ type: 'step', data: { step: 'proposing', message: `Retrying ${name} (${attempt + 1}/2)...`, tab } });
            await delay(backoff);
          } else {
            throw err;
          }
        }
      }
      throw new Error(`${name} failed after 3 attempts`);
    }

    // Agent 1: Evidence Extractor
    broadcast({ type: 'step', data: { step: 'extracting', message: '[1/3] Evidence Extractor — analyzing ' + step.title + '...', tab: 'clean' } });
    const extractResult = await withRetry('Evidence Extractor', () => extract({ evidenceId, evidenceType: step.evidence.type, source: step.evidence.source, content: step.evidence.content }, context), 'clean') as { success: boolean; signal?: EvidenceItem };
    if (!extractResult.success) throw new Error('Evidence Extractor failed');
    broadcast({ type: 'step', data: { step: 'extracted', message: '[1/3] Complete — ' + (extractResult.signal?.entities?.length || 0) + ' entities extracted', tab: 'clean' } });

    await delay(baseDelay);

    // Agent 2: Claim Proposer
    broadcast({ type: 'step', data: { step: 'proposing', message: '[2/3] Claim Proposer — proposing claims from evidence...', tab: 'clean' } });
    const proposeResult = await withRetry('Claim Proposer', () => propose({ evidenceId, rawContent: step.evidence.content }, context), 'clean') as { success: boolean; enrichments?: Array<{ claim_id: string; changes: string }>; proposals?: Array<Claim> };
    if (!proposeResult.success) throw new Error('Claim Proposer failed — Gemini may be rate-limited, try again in 30s');
    const enrichments = proposeResult.enrichments || [];
    const proposals = proposeResult.proposals || [];
    broadcast({ type: 'step', data: { step: 'proposed', message: '[2/3] Complete — ' + enrichments.length + ' enrichments, ' + proposals.length + ' new claims', enrichments, proposals: proposals.map(p => ({ id: p.id, title: p.title, status: p.status })), tab: 'clean' } });

    await delay(baseDelay);

    // Agent 3: Claim Scorer
    broadcast({ type: 'step', data: { step: 'scoring', message: '[3/3] Claim Scorer — scoring relevance...', tab: 'clean' } });
    const scoreResult = await withRetry('Claim Scorer', () => scoreEvidence({ evidenceId }, context), 'clean') as { success: boolean; scoreRecord?: { scores: Array<{ claim_id: string; overall: number; reasoning: string }> } };
    const scores = scoreResult.scoreRecord?.scores || [];
    broadcast({ type: 'step', data: { step: 'scored', message: '[3/3] Complete — ' + scores.filter(s => s.overall >= 0.5).length + ' relevant matches', scores: scores.map(s => ({ claimId: s.claim_id, score: s.overall, reasoning: s.reasoning })), tab: 'clean' } });

    broadcast({ type: 'step', data: { step: 'complete', message: 'Step ' + stepNum + ' complete — ' + (enrichments.length + proposals.length) + ' claims affected', tab: 'clean' } });

    // Playbook detection on step 3
    if (stepNum === 3 && step.expected_pattern) {
      broadcast({ type: 'step', data: { step: 'alerts', message: '1 alert', alerts: [{ severity: 'critical', title: 'PLAYBOOK DETECTED', description: step.expected_pattern }], tab: 'clean' } });
    }

  } catch (err: unknown) {
    broadcast({ type: 'error', data: { message: err instanceof Error ? err.message : String(err), tab: 'clean' } });
  }
});

app.post('/demo/clean/confirm/:claimId', (req, res) => {
  const { context } = createContext('clean');
  const claimsCubby = context.cubby('claims');
  const claim = claimsCubby.json.get('/' + req.params.claimId) as Claim | null;
  if (!claim) return res.status(404).json({ error: 'Claim not found in clean namespace' });
  claim.status = 'active';
  claim.confirmed_by = 'Jennifer Wu';
  claim.updated_at = new Date().toISOString();
  claimsCubby.json.set('/' + claim.id, claim);

  const metaCubby = context.cubby('meta');
  const weights = (metaCubby.json.get('/claim_weights/default') || {}) as ClaimWeights;
  weights[claim.id] = Object.keys(weights).length > 0 ? 1.0 / (Object.keys(weights).length + 1) : 1.0;
  const sum = Object.values(weights).reduce((a, b) => a + b, 0);
  for (const k of Object.keys(weights)) weights[k] = weights[k]! / sum;
  metaCubby.json.set('/claim_weights/default', weights);

  broadcast({ type: 'claim_confirmed', data: { claim, tab: 'clean' } });
  res.json({ ok: true, claim });
});

app.post('/demo/clean/feedback', async (req, res) => {
  const { context, logs } = createContext('clean');
  const body = req.body as { claim_id?: string; ai_score?: number; attorney_score?: number } | undefined;

  const claimId = body?.claim_id || 'embezzlement';
  const aiScore = body?.ai_score || 85;
  const attorneyScore = body?.attorney_score || 85;
  const delta = attorneyScore - aiScore;

  // Direct weight update (bypasses distillation agent's evidence lookup)
  const metaCubby = context.cubby('meta');
  const claimsCubby = context.cubby('claims');
  let currentWeights = (metaCubby.json.get('/claim_weights/default') || {}) as Record<string, number>;

  // Initialize weights from all claims if empty
  if (Object.keys(currentWeights).length === 0) {
    // Read claims from dumpCubbies (merges both caches)
    const allData = dumpCubbies();
    const cleanClaims = Object.entries(allData)
      .filter(([k]) => k.startsWith('clean/claims/'))
      .map(([, v]) => v as { id: string });
    if (cleanClaims.length > 0) {
      cleanClaims.forEach(c => { currentWeights[c.id] = 1.0 / cleanClaims.length; });
    }
  }

  // Adjust weight for reviewed claim based on delta
  const MAX_DELTA = 0.05;
  const absDelta = Math.abs(delta);
  if (claimId in currentWeights) {
    if (delta > 0) {
      // Attorney scored HIGHER than AI — boost this claim
      currentWeights[claimId] += Math.min(MAX_DELTA, absDelta * 0.001);
    } else if (delta < 0) {
      // Attorney scored LOWER than AI — penalize this claim
      currentWeights[claimId] = Math.max(0.01, currentWeights[claimId] - Math.min(MAX_DELTA, absDelta * 0.001));
    }
  }

  // Normalize to sum = 1.0
  const sum = Object.values(currentWeights).reduce((a, b) => a + b, 0);
  for (const k of Object.keys(currentWeights)) {
    currentWeights[k] = parseFloat((currentWeights[k]! / sum).toFixed(4));
  }

  // Persist
  metaCubby.json.set('/claim_weights/default', currentWeights);

  // Record outcome
  const outcomesCubby = context.cubby('outcomes');
  outcomesCubby.json.set('/review-' + claimId + '-' + Date.now(), {
    claim_id: claimId, ai_score: aiScore, attorney_score: attorneyScore, delta,
    assessor: 'Attorney', timestamp: new Date().toISOString(),
  });

  const response = {
    success: true,
    claim_id: claimId,
    ai_score: aiScore,
    attorney_score: attorneyScore,
    delta,
    updated_weights: currentWeights,
    logs,
  };
  broadcast({ type: 'weights_updated', data: { ...response, tab: 'clean' } });
  res.json(response);
});

// Custom evidence intake for clean case dashboard
app.post('/demo/clean/evidence', async (req, res) => {
  const { content, source, type: evType } = req.body as { content: string; source: string; type: string };
  if (!content) return res.status(400).json({ error: 'Missing content' });

  const evidenceId = 'custom-' + Date.now();
  res.json({ ok: true, evidenceId });

  broadcast({ type: 'step', data: { step: 'received', message: 'Custom evidence: ' + (content.slice(0, 50)) + '...', evidence: { id: evidenceId, type: evType || 'email', title: content.split(String.fromCharCode(10))[0].slice(0, 80), source: source || 'Manual input', content }, tab: 'clean' } });

  try {
    const { context } = createContext('clean');
    const { extract } = await import('./agents/evidence-extractor.js');
    const { propose } = await import('./agents/claim-proposer.js');
    const { score: scoreEvidence } = await import('./agents/claim-scorer.js');
    const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

    broadcast({ type: 'step', data: { step: 'extracting', message: '[1/3] Extracting...', tab: 'clean' } });
    const extractResult = await extract({ evidenceId, evidenceType: evType || 'email', source: source || 'Manual', content }, context) as { success: boolean; signal?: EvidenceItem };
    if (!extractResult.success) throw new Error('Extraction failed');
    broadcast({ type: 'step', data: { step: 'extracted', message: '[1/3] Done', tab: 'clean' } });

    await delay(3000);

    broadcast({ type: 'step', data: { step: 'proposing', message: '[2/3] Proposing claims...', tab: 'clean' } });
    const proposeResult = await propose({ evidenceId, rawContent: content }, context) as { success: boolean; enrichments?: Array<{ claim_id: string; changes: string }>; proposals?: Array<Claim> };
    if (!proposeResult.success) throw new Error('Proposal failed');
    broadcast({ type: 'step', data: { step: 'proposed', message: '[2/3] Done', enrichments: proposeResult.enrichments, proposals: (proposeResult.proposals || []).map(p => ({ id: p.id, title: p.title, status: p.status })), tab: 'clean' } });

    await delay(3000);

    broadcast({ type: 'step', data: { step: 'scoring', message: '[3/3] Scoring...', tab: 'clean' } });
    const scoreResult = await scoreEvidence({ evidenceId }, context) as { success: boolean; scoreRecord?: { scores: Array<{ claim_id: string; overall: number; reasoning: string }> } };
    const scores = scoreResult.scoreRecord?.scores || [];
    broadcast({ type: 'step', data: { step: 'scored', message: '[3/3] Done', scores: scores.map(s => ({ claimId: s.claim_id, score: s.overall, reasoning: s.reasoning })), tab: 'clean' } });

    broadcast({ type: 'step', data: { step: 'complete', message: 'Evidence processed', tab: 'clean' } });
  } catch (err: unknown) {
    broadcast({ type: 'error', data: { message: err instanceof Error ? err.message : String(err), tab: 'clean' } });
  }
});

// Simulated email for case dashboard
app.post('/demo/clean/simulate-email', async (_req, res) => {
  const emailContent = `From: Sarah Park <spark@apexventures.com>
To: Jennifer Wu <jwu@parkwu.law>
Subject: RE: Marcus Chen Investigation — Tax Evasion Discovery

Jennifer,

Following up on our forensic review. We discovered that Marcus Chen has been filing personal tax returns that do NOT report the $350,000 in payments from TechPartners Consulting LLC. The IRS Form 1099-MISC was never issued by TechPartners (because Chen controls both entities).

Additionally, our IT team recovered deleted emails showing Chen communicated with a second shell company — "DataBridge Solutions LLC" — registered in Nevada under his wife's maiden name. We found two more invoices totaling $180,000 that we hadn't previously identified.

This means the total embezzled amount is at least $530,000 across two shell companies and two victims, with potential tax fraud charges on top.

Sarah Park
CEO, Apex Ventures Inc.`;

  // Reuse the custom evidence endpoint logic
  const evidenceId = 'simulated-email-' + Date.now();
  res.json({ ok: true, evidenceId });

  broadcast({ type: 'step', data: { step: 'received', message: 'New email from Sarah Park (CEO)', evidence: { id: evidenceId, type: 'email', title: 'Sarah Park — Tax Evasion Discovery + Second Shell Company', source: 'Sarah Park <spark@apexventures.com>', content: emailContent }, tab: 'clean' } });

  try {
    const { context } = createContext('clean');
    const { extract } = await import('./agents/evidence-extractor.js');
    const { propose } = await import('./agents/claim-proposer.js');
    const { score: scoreEvidence } = await import('./agents/claim-scorer.js');
    const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

    broadcast({ type: 'step', data: { step: 'extracting', message: '[1/3] Extracting signals from Sarah Park email...', tab: 'clean' } });
    const extractResult = await extract({ evidenceId, evidenceType: 'email', source: 'Sarah Park <spark@apexventures.com>', content: emailContent }, context) as { success: boolean; signal?: EvidenceItem };
    if (!extractResult.success) throw new Error('Extraction failed');
    broadcast({ type: 'step', data: { step: 'extracted', message: '[1/3] Complete', tab: 'clean' } });

    await delay(3000);
    broadcast({ type: 'step', data: { step: 'proposing', message: '[2/3] Analyzing against existing claims...', tab: 'clean' } });
    const proposeResult = await propose({ evidenceId, rawContent: emailContent }, context) as { success: boolean; enrichments?: Array<{ claim_id: string; changes: string }>; proposals?: Array<Claim> };
    if (!proposeResult.success) throw new Error('Proposal failed');
    broadcast({ type: 'step', data: { step: 'proposed', message: '[2/3] Complete — ' + ((proposeResult.enrichments || []).length) + ' enrichments, ' + ((proposeResult.proposals || []).length) + ' new claims', enrichments: proposeResult.enrichments, proposals: (proposeResult.proposals || []).map(p => ({ id: p.id, title: p.title, status: p.status })), tab: 'clean' } });

    await delay(3000);
    broadcast({ type: 'step', data: { step: 'scoring', message: '[3/3] Scoring relevance...', tab: 'clean' } });
    const scoreResult = await scoreEvidence({ evidenceId }, context) as { success: boolean; scoreRecord?: { scores: Array<{ claim_id: string; overall: number; reasoning: string }> } };
    const scores = scoreResult.scoreRecord?.scores || [];
    broadcast({ type: 'step', data: { step: 'scored', message: '[3/3] Complete', scores: scores.map(s => ({ claimId: s.claim_id, score: s.overall, reasoning: s.reasoning })), tab: 'clean' } });

    broadcast({ type: 'step', data: { step: 'complete', message: 'Email processed — claims updated', tab: 'clean' } });
  } catch (err: unknown) {
    broadcast({ type: 'error', data: { message: err instanceof Error ? err.message : String(err), tab: 'clean' } });
  }
});

// === DASHBOARD ===

app.get('/dashboard', async (_req, res) => {
  // Load data from cubbies
  const allData = dumpCubbies();
  const claims: Claim[] = Object.entries(allData)
    .filter(([k]) => k.startsWith('claims/') && !k.startsWith('clean/'))
    .map(([, v]) => v as Claim)
    .sort((a, b) => (b.strength ?? 0) - (a.strength ?? 0));

  const cases: LegalCase[] = Object.entries(allData)
    .filter(([k]) => k.startsWith('cases/') && !k.includes('/impacts') && !k.startsWith('clean/'))
    .map(([, v]) => v as LegalCase);

  const evidence: EvidenceItem[] = Object.entries(allData)
    .filter(([k]) => k.startsWith('evidence/') && !k.startsWith('clean/'))
    .map(([, v]) => v as EvidenceItem);

  const weights = (allData['meta/claim_weights/default'] || {}) as ClaimWeights;

  const cubbyTree = getCubbyTree();

  const daysUntil = (d: string) => Math.max(0, Math.round((new Date(d).getTime() - Date.now()) / 86400000));

  // Element stats for KPI
  const totalElements = claims.reduce((acc, c) => acc + c.elements.length, 0);
  const provenElements = claims.reduce((acc, c) => acc + c.elements.filter(e => e.status === 'proven').length, 0);

  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Claim Intelligence Engine</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<script src="https://d3js.org/d3.v7.min.js"></script>
<style>
:root{--bg:#0b0d11;--surface:#131620;--surface2:#1a1f2e;--surface3:#232a3b;--border:#2a3045;--text:#e8eaed;--text2:#8b95a5;--text3:#5a6478;--primary:#3b82f6;--primary-dim:rgba(59,130,246,0.15);--red:#ef4444;--red-dim:rgba(239,68,68,0.12);--orange:#f59e0b;--orange-dim:rgba(245,158,11,0.12);--green:#22c55e;--green-dim:rgba(34,197,94,0.12);--purple:#a855f7;--purple-dim:rgba(168,85,247,0.12);--cyan:#06b6d4;--cyan-dim:rgba(6,182,212,0.12);--radius:10px;--font:'Inter',sans-serif;--mono:'JetBrains Mono',monospace}
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:var(--font);background:var(--bg);color:var(--text);font-size:13px;line-height:1.5}
.layout{display:grid;grid-template-columns:240px 1fr;min-height:100vh}

/* Sidebar */
.sidebar{background:var(--surface);border-right:1px solid var(--border);overflow-y:auto;padding-bottom:20px}
.sidebar-brand{padding:16px 16px 12px;border-bottom:1px solid var(--border)}
.sidebar-brand h1{font-size:14px;font-weight:700;color:var(--cyan);letter-spacing:0.5px}
.sidebar-brand p{font-size:10px;color:var(--text3);margin-top:2px}
.sidebar-section{padding:12px 16px 4px;font-size:9px;font-weight:600;text-transform:uppercase;letter-spacing:1.2px;color:var(--text3)}
.case-item{padding:8px 16px;border-left:3px solid transparent;cursor:pointer;transition:all .15s}
.case-item:hover{background:var(--surface2)}
.case-item .cn{font-size:12px;font-weight:600}
.case-item .cm{font-size:10px;color:var(--text2);margin-top:1px}
.case-item .cb{display:inline-block;font-size:8px;padding:1px 5px;border-radius:3px;font-weight:600;margin-top:3px}
.case-item[data-type="criminal"] .cb{background:var(--red-dim);color:var(--red)}
.case-item[data-type="civil"] .cb{background:var(--primary-dim);color:var(--primary)}
.case-item .dl{font-size:9px;color:var(--orange);margin-top:2px}
.person{padding:5px 16px;font-size:11px;display:flex;align-items:center;gap:6px}
.person .dot{width:5px;height:5px;border-radius:50%;flex-shrink:0}
.person .firm{font-size:9px;color:var(--text3)}

/* Main */
.main{padding:16px 20px;overflow-y:auto}

/* Tabs */
.tabs{display:flex;gap:2px;margin-bottom:16px;background:var(--surface);border-radius:8px;padding:3px;width:fit-content}
.tab{padding:7px 16px;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;color:var(--text2);transition:all .15s}
.tab.active{background:var(--primary);color:#fff}
.tab:hover:not(.active){background:var(--surface2)}

/* KPI */
.kpis{display:grid;grid-template-columns:repeat(6,1fr);gap:8px;margin-bottom:16px}
.kpi{background:var(--surface);border-radius:var(--radius);padding:12px;text-align:center;border:1px solid var(--border)}
.kpi .v{font-size:22px;font-weight:700}
.kpi .l{font-size:9px;color:var(--text2);text-transform:uppercase;letter-spacing:.5px;margin-top:2px}

/* Demo controls */
.demo-bar{display:flex;gap:8px;margin-bottom:16px;align-items:center}
.btn{padding:8px 16px;border-radius:6px;border:none;font-size:12px;font-weight:600;cursor:pointer;transition:all .15s;font-family:var(--font)}
.btn-primary{background:var(--primary);color:#fff}
.btn-primary:hover{opacity:.9}
.btn-secondary{background:var(--surface2);color:var(--text);border:1px solid var(--border)}
.btn-sm{padding:4px 10px;font-size:10px}
.btn:disabled{opacity:.4;cursor:not-allowed}
#demo-status{font-size:11px;color:var(--text2)}

/* Process log */
.log{background:#080a0e;border-radius:8px;padding:10px;font-family:var(--mono);font-size:11px;max-height:160px;overflow-y:auto;margin-bottom:16px;display:none;border:1px solid var(--border)}
.log.active{display:block}
.log-line{padding:2px 0;color:var(--text2)}
.log-line .ts{color:var(--text3);margin-right:6px}
.log-line .tag{font-weight:600}
.log-line .tag.ok{color:var(--green)}
.log-line .tag.run{color:var(--cyan)}
.log-line .tag.err{color:var(--red)}
.log-line .cubby-path{color:var(--purple);font-size:10px}

/* Grid */
.grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.grid.full{grid-template-columns:1fr}

/* Cards */
.card{background:var(--surface);border-radius:var(--radius);padding:14px;border:1px solid var(--border)}
.card-h{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px}
.card-t{font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.8px;color:var(--text3)}
.card-c{font-size:10px;color:var(--text3);background:var(--surface2);padding:2px 7px;border-radius:8px}

/* Alerts */
.alert-feed{max-height:200px;overflow-y:auto}
.alert{padding:10px;border-radius:8px;margin-bottom:6px;animation:slideIn .4s ease-out}
.alert.critical{background:var(--red-dim);border:1px solid rgba(239,68,68,.25)}
.alert.high{background:var(--orange-dim);border:1px solid rgba(245,158,11,.25)}
.alert .at{font-size:11px;font-weight:700}
.alert.critical .at{color:var(--red)}
.alert.high .at{color:var(--orange)}
.alert .ad{font-size:10px;color:var(--text2);margin-top:3px;line-height:1.4}

/* Claims grid */
.claims-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;max-height:520px;overflow-y:auto}
.claim-card{background:var(--surface2);border-radius:8px;padding:10px;border-left:3px solid var(--border);transition:all .3s;cursor:pointer;position:relative}
.claim-card:hover{transform:translateY(-1px);border-color:var(--primary)}
.claim-card.proposed{border-style:dashed;border-color:var(--orange);animation:pulse 2s infinite}
.claim-card .cc-section{font-size:9px;color:var(--text3);text-transform:uppercase}
.claim-card .cc-title{font-size:11px;font-weight:600;margin-top:2px;line-height:1.3}
.claim-card .cc-strength{font-size:18px;font-weight:700;margin-top:6px}
.claim-card .cc-badge{font-size:8px;padding:1px 5px;border-radius:3px;display:inline-block;font-weight:600;margin-top:4px}
.claim-card .cc-badge.active{background:var(--green-dim);color:var(--green)}
.claim-card .cc-badge.proposed{background:var(--orange-dim);color:var(--orange)}
/* Element progress bar */
.el-bar{display:flex;gap:2px;margin-top:6px;height:4px;border-radius:2px;overflow:hidden}
.el-seg{flex:1;border-radius:1px}
.el-seg.proven{background:var(--green)}
.el-seg.partial{background:var(--orange)}
.el-seg.unproven{background:var(--surface3)}
.claim-card.lit{animation:pulseOnce .5s ease-out}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.7}}
@keyframes pulseOnce{0%{transform:scale(1.02)}100%{transform:scale(1)}}
@keyframes slideIn{from{opacity:0;transform:translateX(-10px)}to{opacity:1;transform:translateX(0)}}

/* Evidence feed */
.ev-feed{max-height:520px;overflow-y:auto}
.ev-item{background:var(--surface2);border-radius:8px;padding:10px;margin-bottom:6px;border-left:3px solid var(--primary);transition:all .3s}
.ev-item.new{border-left-color:var(--cyan);animation:slideIn .5s;background:var(--cyan-dim)}
.ev-item .et{font-size:8px;text-transform:uppercase;letter-spacing:.5px;color:var(--cyan);font-weight:600}
.ev-item .en{font-size:11px;font-weight:600;margin-top:1px}
.ev-item .es{font-size:10px;color:var(--text2);margin-top:2px}
.impact-badges{display:flex;flex-wrap:wrap;gap:4px;margin-top:6px}
.ib{font-size:9px;padding:2px 6px;border-radius:4px;font-weight:600}
.ib.direct{background:var(--red-dim);color:var(--red)}
.ib.supporting{background:var(--orange-dim);color:var(--orange)}

/* Actions */
.action-list{max-height:400px;overflow-y:auto}
.action{background:var(--surface2);border-radius:8px;padding:10px;margin-bottom:6px;display:flex;justify-content:space-between;animation:slideIn .4s}
.action-main{flex:1}
.action .ai-title{font-size:11px;font-weight:600}
.action .ai-who{font-size:10px;color:var(--cyan);margin-top:1px}
.action .ai-desc{font-size:10px;color:var(--text2);margin-top:3px;line-height:1.3}
.action .ai-pri{font-size:8px;padding:1px 5px;border-radius:3px;display:inline-block;font-weight:600;margin-top:4px}
.action .ai-pri.critical{background:var(--red-dim);color:var(--red)}
.action .ai-pri.high{background:var(--orange-dim);color:var(--orange)}
.action-sla{text-align:right;min-width:60px}
.action-sla .hrs{font-size:18px;font-weight:700}
.action-sla .hrs.urgent{color:var(--red)}
.action-sla .hrs.warn{color:var(--orange)}
.action-sla .hrs.ok{color:var(--green)}
.action-sla .unit{font-size:8px;color:var(--text3);text-transform:uppercase}

/* Cubby inspector */
.inspector{background:#080a0e;border-radius:8px;padding:12px;font-family:var(--mono);font-size:11px;max-height:300px;overflow-y:auto;border:1px solid var(--border)}
.inspector-path{padding:3px 0;cursor:pointer;color:var(--text2);display:flex;gap:8px}
.inspector-path:hover{color:var(--cyan)}
.inspector-path .ip-path{color:var(--purple)}
.inspector-path .ip-preview{color:var(--text3);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.inspector-detail{background:var(--surface2);border-radius:6px;padding:10px;margin:4px 0 8px;font-size:10px;line-height:1.5;white-space:pre-wrap;word-break:break-all;max-height:200px;overflow-y:auto}

/* Email preview */
.email-preview{background:#fff;color:#1a1a1a;border-radius:8px;padding:16px;font-family:var(--font);font-size:12px;line-height:1.6;max-height:400px;overflow-y:auto}
.email-preview h3{font-size:14px;margin-bottom:8px}
.email-preview .ep-meta{font-size:11px;color:#666;margin-bottom:12px}
.email-preview .ep-case{background:#f0f4ff;border-left:3px solid #3b82f6;padding:8px 12px;margin:8px 0;border-radius:0 6px 6px 0}
.email-preview .ep-case h4{font-size:12px;color:#1e40af;margin-bottom:4px}
.email-preview .ep-action{background:#fef3c7;border-left:3px solid #f59e0b;padding:6px 12px;margin:4px 0;border-radius:0 6px 6px 0;font-weight:600;font-size:11px}

/* Knowledge graph */
#graph-container{width:100%;height:300px;background:var(--surface2);border-radius:8px;overflow:hidden}
#graph-container svg{width:100%;height:100%}

/* Modal */
.modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.7);display:none;align-items:center;justify-content:center;z-index:100}
.modal-overlay.open{display:flex}
.modal{background:var(--surface);border-radius:12px;padding:24px;max-width:700px;width:90%;max-height:80vh;overflow-y:auto;border:1px solid var(--border)}
.modal h2{font-size:16px;margin-bottom:4px}
.modal .modal-sub{font-size:11px;color:var(--text2);margin-bottom:16px}
.modal .el-row{display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--border)}
.modal .el-name{font-weight:600;font-size:12px;min-width:140px}
.modal .el-status{font-size:10px;padding:2px 8px;border-radius:4px;font-weight:600}
.modal .el-status.proven{background:var(--green-dim);color:var(--green)}
.modal .el-status.partial{background:var(--orange-dim);color:var(--orange)}
.modal .el-status.unproven{background:var(--red-dim);color:var(--red)}
.modal .el-evidence{font-size:10px;color:var(--text2);flex:1}
.modal .el-gap{font-size:10px;color:var(--orange);font-style:italic}
.modal .close-btn{position:absolute;top:12px;right:16px;font-size:18px;cursor:pointer;color:var(--text2)}

/* Clean tab empty state */
.empty-state{text-align:center;padding:60px 20px;color:var(--text3)}
.empty-state h2{font-size:18px;color:var(--text2);margin-bottom:8px}
.empty-state p{font-size:12px}

/* Responsive */
@media(max-width:1200px){.claims-grid{grid-template-columns:repeat(2,1fr)}}
</style>
</head>
<body>
<div class="layout">
<div class="sidebar">
  <div class="sidebar-brand">
    <h1>CLAIM INTELLIGENCE</h1>
    <p>Compound Intelligence for Legal Evidence</p>
  </div>
  <div class="sidebar-section">Active Cases (${cases.length})</div>
  ${cases.map(c => `<div class="case-item" data-type="${c.case_type}"><div class="cn">${c.short_name}</div><div class="cm">${c.case_number} &middot; ${c.jurisdiction}</div><span class="cb">${c.case_type.toUpperCase()}</span><div class="dl">${daysUntil(c.next_deadline)}d &rarr; ${c.next_deadline_desc}</div></div>`).join('')}
  <div class="sidebar-section">Legal Team</div>
  ${[{n:'Rocky Lee',f:'Milliard Law',c:'#ef4444'},{n:'Susanna Chenette',f:'Hanson Bridgett',c:'#3b82f6'},{n:'Matt Miller',f:'Hanson Bridgett',c:'#3b82f6'},{n:'Tarek Saad',f:'BLK Partners',c:'#f59e0b'},{n:'Ahmed ElSayed',f:'BLK Partners',c:'#f59e0b'}].map(p => `<div class="person"><div class="dot" style="background:${p.c}"></div><div>${p.n}<br><span class="firm">${p.f}</span></div></div>`).join('')}
  <div class="sidebar-section">Parties</div>
  ${[{n:'Fred Jin',f:'CEO, Cere',c:'#22c55e'},{n:'Brad Bao',f:'Ind. Director',c:'#22c55e'},{n:'Kenzi Wang',f:'Defendant',c:'#ef4444'}].map(p => `<div class="person"><div class="dot" style="background:${p.c}"></div><div>${p.n}<br><span class="firm">${p.f}</span></div></div>`).join('')}
  <div class="sidebar-section">Witnesses</div>
  ${[{n:'Dylan Dewdney',f:'RAZE Network'},{n:'Vijay Garg',f:'Inclusion Capital'},{n:'Vivian Liu',f:'Goopal (victim)'}].map(p => `<div class="person"><div class="dot" style="background:#a855f7"></div><div>${p.n}<br><span class="firm">${p.f}</span></div></div>`).join('')}
</div>
<div class="main">
  <!-- Tabs -->
  <div class="tabs">
    <div class="tab active" onclick="switchTab('kenzi')">Kenzi Case</div>
    <div class="tab" onclick="switchTab('clean')">Clean Example</div>
  </div>

  <!-- KENZI TAB -->
  <div id="tab-kenzi">

    <!-- DEMO TRIGGER (compact) -->
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
      <div>
        <div style="font-size:20px;font-weight:700">Kenzi Wang Case</div>
        <div style="font-size:12px;color:var(--text2)">${cases.length} active proceedings &middot; ${claims.length} claims tracked &middot; ${evidence.length} evidence items</div>
      </div>
      <div class="demo-bar" style="margin:0">
        <button class="btn btn-primary" id="btn-trigger" onclick="triggerKenzi()">Simulate Rocky's Email</button>
        <button class="btn btn-secondary btn-sm" onclick="resetKenzi()">Reset</button>
        <span id="demo-status"></span>
      </div>
    </div>

    <!-- ROW 1: ALERTS + ACTIONS (above the fold — what needs attention NOW) -->
    <div id="alerts-section" style="margin-bottom:16px;display:none">
      <div class="card" style="border-left:3px solid var(--red)">
        <div class="card-h"><span class="card-t" style="color:var(--red)">Alerts</span><span class="card-c" id="alert-count">0</span></div>
        <div class="alert-feed" id="alert-feed"></div>
      </div>
    </div>

    <div id="actions-section" style="margin-bottom:16px;display:none">
      <div class="card" style="border-left:3px solid var(--orange)">
        <div class="card-h"><span class="card-t" style="color:var(--orange)">Action Items</span><span class="card-c" id="action-count">0</span></div>
        <div class="action-list" id="action-list"></div>
      </div>
    </div>

    <!-- ROW 2: EMAIL PREVIEWS (what each attorney sees) -->
    <div style="margin-bottom:16px;display:none" id="email-section">
      <div class="grid">
        <div class="card"><div class="card-h"><span class="card-t">What Rocky Sees</span></div><div class="email-preview" id="rocky-email"></div></div>
        <div class="card"><div class="card-h"><span class="card-t">What Susanna Sees</span></div><div class="email-preview" id="susanna-email"></div></div>
      </div>
    </div>

    <!-- ROW 3: CLAIMS + EVIDENCE (the substance) -->
    <div class="grid" style="margin-bottom:16px">
      <div class="card">
        <div class="card-h"><span class="card-t">Case Theories (${claims.length})</span><span class="card-c">Click any to see legal elements</span></div>
        <div class="claims-grid" id="claims-grid">
          ${claims.map(c => {
            const proven = c.elements.filter(e => e.status === 'proven').length;
            const total = c.elements.length;
            return `<div class="claim-card ${c.status === 'proposed' ? 'proposed' : ''}" data-id="${c.id}" onclick="showClaim('${c.id}')">
              <div class="cc-title">${c.title}</div>
              <div style="display:flex;justify-content:space-between;align-items:baseline;margin-top:6px">
                <div class="cc-strength">${Math.round(c.strength * 100)}%</div>
                <span style="font-size:10px;color:var(--text3)">${proven}/${total} elements</span>
              </div>
              <div class="el-bar">${c.elements.map(e => `<div class="el-seg ${e.status}"></div>`).join('')}</div>
            </div>`;
          }).join('')}
        </div>
      </div>
      <div class="card">
        <div class="card-h"><span class="card-t">Recent Evidence</span><span class="card-c">${evidence.length} items</span></div>
        <div class="ev-feed" id="ev-feed">
          ${evidence.map(e => `<div class="ev-item"><div class="et">${e.type}</div><div class="en">${e.title}</div><div class="es">${e.source} &middot; ${e.extracted_at?.split('T')[0] || ''}</div></div>`).join('')}
        </div>
      </div>
    </div>

    <!-- TECHNICAL DETAILS (hidden by default) -->
    <div style="margin-bottom:16px">
      <div onclick="var t=document.getElementById('tech-details');t.style.display=t.style.display==='none'?'block':'none';this.querySelector('.toggle-icon').textContent=t.style.display==='none'?'+':'-'" style="cursor:pointer;font-size:11px;color:var(--text3);padding:8px 0;display:flex;align-items:center;gap:6px">
        <span class="toggle-icon" style="font-family:var(--mono);font-size:14px">+</span>
        <span>Technical Details (Processing Log, Cubby Inspector)</span>
      </div>
      <div id="tech-details" style="display:none">
        <div class="log" id="process-log"></div>
        <div class="card" style="margin-top:8px">
          <div class="card-h"><span class="card-t">Cubby Inspector</span><span class="card-c">${cubbyTree.length} entries</span></div>
          <div class="inspector" id="cubby-inspector">
            ${cubbyTree.filter(t => !t.path.startsWith('clean/')).map(t => `<div class="inspector-path" onclick="toggleCubby(this, '${t.path}')"><span class="ip-path">${t.path}</span><span class="ip-preview">${t.preview.slice(0, 50)}</span></div>`).join('')}
          </div>
        </div>
      </div>
    </div>

    <div id="kpi-alerts" style="display:none">0</div>
  </div>

  <!-- CLEAN TAB -->
  <div id="tab-clean" style="display:none">
    <div class="kpis">
      <div class="kpi"><div class="v" style="color:var(--cyan)" id="clean-claims">0</div><div class="l">Claims</div></div>
      <div class="kpi"><div class="v" style="color:var(--purple)" id="clean-evidence">0</div><div class="l">Evidence</div></div>
      <div class="kpi"><div class="v" style="color:var(--red)" id="clean-alerts">0</div><div class="l">Alerts</div></div>
    </div>

    <div class="demo-bar">
      <button class="btn btn-primary" id="clean-step1" onclick="cleanStep(1)">1: Add Bank Statement</button>
      <button class="btn btn-secondary" id="clean-step2" onclick="cleanStep(2)" disabled>2: Add Forged Invoice</button>
      <button class="btn btn-secondary" id="clean-step3" onclick="cleanStep(3)" disabled>3: Add 2nd Victim</button>
      <button class="btn btn-secondary" id="clean-feedback" onclick="cleanFeedback()" disabled>Rate Evidence</button>
      <button class="btn btn-secondary btn-sm" onclick="cleanReset()">Reset</button>
      <span id="clean-status"></span>
    </div>

    <div class="log" id="clean-log"></div>

    <div id="clean-alerts-section" style="margin-bottom:12px;display:none">
      <div class="card"><div class="card-h"><span class="card-t">Alerts</span></div><div class="alert-feed" id="clean-alert-feed"></div></div>
    </div>

    <div class="grid">
      <div class="card">
        <div class="card-h"><span class="card-t">Claims</span></div>
        <div class="claims-grid" id="clean-claims-grid">
          <div class="empty-state"><h2>No claims yet</h2><p>Add evidence to see claims emerge</p></div>
        </div>
      </div>
      <div class="card">
        <div class="card-h"><span class="card-t">Evidence Feed</span></div>
        <div class="ev-feed" id="clean-ev-feed">
          <div class="empty-state"><h2>No evidence yet</h2><p>Click "Add Bank Statement" to start</p></div>
        </div>
      </div>
    </div>
  </div>
</div>
</div>

<!-- Claim Detail Modal -->
<div class="modal-overlay" id="claim-modal" onclick="if(event.target===this)this.classList.remove('open')">
  <div class="modal" id="claim-modal-content"></div>
</div>

<script src="/static/client.js"></script>
</body>
</html>`);
});

// === START ===
const PORT = process.env.PORT || 3001;

async function start() {
  await initRuntime();
  app.listen(PORT, () => {
    console.log('CLAIM INTELLIGENCE ENGINE running on http://localhost:' + PORT + '/dashboard');
  });
}

start().catch(err => { console.error(err); process.exit(1); });
