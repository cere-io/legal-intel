import 'dotenv/config';
import fs from 'fs';
import { pool, query } from './connection.js';
import { TEMPLATES } from '../data/seed-templates.js';
import { KENZI_CLAIMS, KENZI_EVIDENCE, KENZI_CASES, KENZI_WEIGHTS } from '../data/seed-kenzi.js';

async function seed() {
  // Run schema
  const schemaPath = new URL('schema.sql', import.meta.url);
  const schema = fs.readFileSync(schemaPath, 'utf-8');
  await pool.query(schema);
  console.log('Schema created (cubbies + cubby_versions)');

  // Helper: write cubby with version tracking
  async function setCubby(path: string, data: unknown, changedBy = 'seed') {
    await query(
      `INSERT INTO cubbies (path, data, version, updated_at) VALUES ($1, $2, 1, NOW())
       ON CONFLICT (path) DO UPDATE SET data = $2, version = cubbies.version + 1, updated_at = NOW()`,
      [path, JSON.stringify(data)]
    );
    await query(
      `INSERT INTO cubby_versions (path, data, version, changed_by, changed_at) VALUES ($1, $2, 1, $3, NOW())`,
      [path, JSON.stringify(data), changedBy]
    );
  }

  // === TEMPLATES ===
  for (const t of TEMPLATES) {
    await setCubby(`templates/${t.id}`, t);
  }
  console.log(`Seeded ${TEMPLATES.length} claim templates`);

  // === KENZI CLAIMS ===
  for (const c of KENZI_CLAIMS) {
    await setCubby(`claims/${c.id}`, c);
  }
  console.log(`Seeded ${KENZI_CLAIMS.length} claims`);

  // === KENZI EVIDENCE ===
  for (const e of KENZI_EVIDENCE) {
    await setCubby(`evidence/${e.id}`, e);
  }
  console.log(`Seeded ${KENZI_EVIDENCE.length} evidence items`);

  // === KENZI CASES ===
  for (const c of KENZI_CASES) {
    await setCubby(`cases/${c.id}`, c);
  }
  console.log(`Seeded ${KENZI_CASES.length} cases`);

  // === INITIAL WEIGHTS ===
  await setCubby('meta/claim_weights/default', KENZI_WEIGHTS);
  console.log('Seeded initial claim weights');

  // === PRE-SCORED EVIDENCE (scores cubby) ===
  for (const e of KENZI_EVIDENCE) {
    const scoreRecord = {
      evidence_id: e.id,
      scores: e.claims_implicated.map(ci => ({
        claim_id: ci.claim_id,
        element_scores: {},
        overall: ci.relevance,
        reasoning: ci.reasoning,
      })),
      weights_used: KENZI_WEIGHTS,
      timestamp: e.extracted_at,
    };
    await setCubby(`scores/${e.id}`, scoreRecord);
  }
  console.log(`Seeded ${KENZI_EVIDENCE.length} score records`);

  // Verify
  const countRes = await query(`SELECT COUNT(*) as count FROM cubbies`);
  console.log(`\nTotal cubby entries: ${countRes.rows[0].count}`);

  const pathsRes = await query(`SELECT path FROM cubbies ORDER BY path`);
  console.log('\nCubby paths:');
  for (const row of pathsRes.rows) {
    console.log(`  ${row.path}`);
  }

  console.log('\nSeed complete!');
  await pool.end();
}

seed().catch(e => { console.error(e); process.exit(1); });
