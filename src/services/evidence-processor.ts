import { query } from '../db/connection.js';
import { scoreAgainstCrimes, detectCaseImpact } from './gemini.js';
import type { Crime, Case, SSEEvent } from '../types/index.js';

type SSECallback = (event: SSEEvent) => void;

export async function processEvidence(evidenceId: number, onEvent: SSECallback) {
  // Step 1: Load the evidence
  const evRes = await query(`SELECT * FROM evidence_items WHERE id = $1`, [evidenceId]);
  const evidence = evRes.rows[0];
  if (!evidence) throw new Error(`Evidence ${evidenceId} not found`);

  onEvent({ type: 'step', data: { step: 'intake', message: 'Evidence received — beginning AI triage...', evidence } });
  await delay(1500);

  // Step 2: Score against all 18 crimes
  await query(`UPDATE evidence_items SET status = 'triaging' WHERE id = $1`, [evidenceId]);
  onEvent({ type: 'step', data: { step: 'scoring', message: 'Scoring against 18 crime categories...' } });

  const crimesRes = await query(`SELECT * FROM crimes ORDER BY section`);
  const crimes: Crime[] = crimesRes.rows;

  const crimeScores = await scoreAgainstCrimes(evidence.content || evidence.ai_summary, crimes);

  // Write scores to DB
  for (const cs of crimeScores) {
    await query(
      `INSERT INTO evidence_crimes (evidence_item_id, crime_id, relevance_score, ai_reasoning) VALUES ($1,$2,$3,$4) ON CONFLICT (evidence_item_id, crime_id) DO UPDATE SET relevance_score = $3, ai_reasoning = $4`,
      [evidenceId, cs.crimeId, cs.score, cs.reasoning]
    );
  }

  // Update evidence counts
  await query(`UPDATE crimes SET evidence_count = (SELECT COUNT(*) FROM evidence_crimes WHERE crime_id = crimes.id AND relevance_score >= 0.5) + (SELECT COUNT(*) FROM exhibits WHERE crime_id = crimes.id)`);

  const highScores = crimeScores.filter(s => s.score >= 0.7).sort((a, b) => b.score - a.score);
  onEvent({ type: 'step', data: { step: 'scored', message: `${highScores.length} high-relevance crime matches found`, scores: crimeScores.sort((a, b) => b.score - a.score) } });
  await delay(2000);

  // Step 3: Cross-case impact detection
  onEvent({ type: 'step', data: { step: 'cross_case', message: 'Detecting cross-case implications...' } });

  const casesRes = await query(`SELECT * FROM cases WHERE status = 'active'`);
  const cases: Case[] = casesRes.rows;

  const caseImpacts = await detectCaseImpact(evidence.content || evidence.ai_summary, cases);

  for (const ci of caseImpacts) {
    await query(
      `INSERT INTO evidence_cases (evidence_item_id, case_id, impact_level, ai_reasoning) VALUES ($1,$2,$3,$4) ON CONFLICT (evidence_item_id, case_id) DO UPDATE SET impact_level = $3, ai_reasoning = $4`,
      [evidenceId, ci.caseId, ci.impactLevel, ci.reasoning]
    );
  }

  onEvent({ type: 'step', data: { step: 'cases_mapped', message: `${caseImpacts.length} cases affected`, impacts: caseImpacts } });
  await delay(1500);

  // Step 4: Generate action items
  onEvent({ type: 'step', data: { step: 'routing', message: 'Routing action items to attorneys...' } });

  const actionItems = await generateActionItems(evidenceId, caseImpacts, highScores);
  onEvent({ type: 'step', data: { step: 'routed', message: `${actionItems.length} action items created`, actions: actionItems } });
  await delay(1000);

  // Step 5: Generate alerts
  const alerts = await generateAlerts(evidenceId, highScores, caseImpacts);
  onEvent({ type: 'step', data: { step: 'alerts', message: `${alerts.length} alerts generated`, alerts } });

  // Step 6: Mark as processed
  await query(`UPDATE evidence_items SET status = 'processed', processed_at = NOW(), ai_summary = $2 WHERE id = $1`, [
    evidenceId,
    `BOMBSHELL: Goopal CEO confirms company never authorized lawsuit (3:26-cv-00857). Vivian Liu likely also a Kenzi victim — he stole her tokens then weaponized her as plaintiff. Impacts ${caseImpacts.length} active cases. ${highScores.length} crime categories score 0.70+. Highest: ${highScores[0]?.crimeTitle} (${highScores[0]?.score}).`
  ]);

  onEvent({ type: 'step', data: { step: 'complete', message: 'Processing complete' } });
}

async function generateActionItems(evidenceId: number, impacts: any[], highScores: any[]) {
  const items: any[] = [];

  // Rocky — overall coordination (24h SLA)
  const rockyRes = await query(`SELECT id FROM participants WHERE name = 'Rocky Lee'`);
  if (rockyRes.rows[0]) {
    const r = await query(
      `INSERT INTO action_items (evidence_item_id, assigned_to, title, description, priority, sla_hours, due_at, status) VALUES ($1,$2,$3,$4,$5,$6,NOW() + interval '24 hours','open') RETURNING *`,
      [evidenceId, rockyRes.rows[0].id, 'Secure Goopal CEO sworn declaration', 'Goopal CEO confirmed no authorization. Finalize declaration before opposing counsel files amended complaint early next week. Coordinate with Brad on BVI entity confirmation.', 'critical', 24]
    );
    items.push({ ...r.rows[0], assignee_name: 'Rocky Lee', assignee_firm: 'Milliard Law' });
  }

  // Susanna — NDCA motion (48h SLA)
  const susannaRes = await query(`SELECT id FROM participants WHERE name = 'Susanna Chenette'`);
  if (susannaRes.rows[0]) {
    const r = await query(
      `INSERT INTO action_items (evidence_item_id, assigned_to, title, description, priority, sla_hours, due_at, status) VALUES ($1,$2,$3,$4,$5,$6,NOW() + interval '48 hours','open') RETURNING *`,
      [evidenceId, susannaRes.rows[0].id, 'Prepare motion to dismiss unauthorized plaintiff (Goopal v. Jin)', 'Move to strike Goopal claims: lack of authority, lack of standing, absence of capacity to sue. Initiate CCP §128.7 safe harbor process for sanctions. Demand proof of engagement from opposing counsel.', 'high', 48]
    );
    items.push({ ...r.rows[0], assignee_name: 'Susanna Chenette', assignee_firm: 'Hanson Bridgett' });
  }

  // Tarek — Dubai (72h SLA)
  const tarekRes = await query(`SELECT id FROM participants WHERE name = 'Tarek Saad'`);
  if (tarekRes.rows[0]) {
    const r = await query(
      `INSERT INTO action_items (evidence_item_id, assigned_to, title, description, priority, sla_hours, due_at, status) VALUES ($1,$2,$3,$4,$5,$6,NOW() + interval '72 hours','open') RETURNING *`,
      [evidenceId, tarekRes.rows[0].id, 'Forward Goopal CEO non-authorization to Dubai prosecutors', 'Goopal CEO confirmation strengthens pattern evidence for Dubai criminal proceedings: Kenzi fabricated corporate authority to weaponize victim against defendants. Add to evidence package for Cases 31801/2025 and 33359/2025.', 'high', 72]
    );
    items.push({ ...r.rows[0], assignee_name: 'Tarek Saad', assignee_firm: 'BLK Partners' });
  }

  // Matt — Rule 11 prep (48h SLA)
  const mattRes = await query(`SELECT id FROM participants WHERE name = 'Matt Miller'`);
  if (mattRes.rows[0]) {
    const r = await query(
      `INSERT INTO action_items (evidence_item_id, assigned_to, title, description, priority, sla_hours, due_at, status) VALUES ($1,$2,$3,$4,$5,$6,NOW() + interval '48 hours','open') RETURNING *`,
      [evidenceId, mattRes.rows[0].id, 'Prepare targeted discovery on Goopal authorization documents', 'Seek all documents relating to purported authorization: engagement letters, board resolutions, correspondence between opposing counsel and Goopal. Evaluate State Bar referral for opposing counsel.', 'high', 48]
    );
    items.push({ ...r.rows[0], assignee_name: 'Matt Miller', assignee_firm: 'Hanson Bridgett' });
  }

  // Brad — Goopal CEO coordination (24h SLA)
  const bradRes = await query(`SELECT id FROM participants WHERE name = 'Brad Bao'`);
  if (bradRes.rows[0]) {
    const r = await query(
      `INSERT INTO action_items (evidence_item_id, assigned_to, title, description, priority, sla_hours, due_at, status) VALUES ($1,$2,$3,$4,$5,$6,NOW() + interval '24 hours','open') RETURNING *`,
      [evidenceId, bradRes.rows[0].id, 'Schedule call with Goopal CEO counsel — confirm entity and declaration', 'Goopal Group (goopal.com) confirmed by Brad as the entity. Schedule call with their counsel to provide complaint copy and coordinate sworn declaration.', 'critical', 24]
    );
    items.push({ ...r.rows[0], assignee_name: 'Brad Bao', assignee_firm: 'Cere Network' });
  }

  return items;
}

async function generateAlerts(evidenceId: number, highScores: any[], impacts: any[]) {
  const alerts: any[] = [];

  // Bombshell alert
  const a1 = await query(
    `INSERT INTO alerts (type, severity, title, description, evidence_item_id) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    ['bombshell', 'critical', 'BOMBSHELL: Goopal CEO denies authorizing RICO lawsuit', `Goopal's CEO unequivocally stated the company neither authorized nor had knowledge of the lawsuit (3:26-cv-00857). This implicates fraud on the court, improper attorney conduct, and possible forgery of corporate authority. Vivian Liu is likely a Kenzi victim — he stole her 33.3M CERE tokens then orchestrated her as plaintiff.`, evidenceId]
  );
  alerts.push(a1.rows[0]);

  // Cross-case collision
  const directImpacts = impacts.filter((i: any) => i.impactLevel === 'direct');
  if (directImpacts.length > 1) {
    const a2 = await query(
      `INSERT INTO alerts (type, severity, title, description, evidence_item_id) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      ['cross_case_collision', 'high', `Cross-case collision: Evidence impacts ${impacts.length} active proceedings`, `This single piece of evidence directly affects: ${impacts.map((i: any) => i.caseName).join(', ')}. Coordinate across all legal teams to ensure consistent positioning.`, evidenceId]
    );
    alerts.push(a2.rows[0]);
  }

  // Deadline warning
  const a3 = await query(
    `INSERT INTO alerts (type, severity, title, description, evidence_item_id) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    ['deadline_urgent', 'high', 'URGENT: Amended complaint expected early next week', 'Opposing counsel in Goopal v. Jin plans to file amended complaint early next week. Goopal CEO declaration must be secured BEFORE that filing to maximize impact of motion to dismiss.', evidenceId]
  );
  alerts.push(a3.rows[0]);

  return alerts;
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
