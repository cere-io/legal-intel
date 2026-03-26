/**
 * Seeds the document sections and evidence graphs into cubbies.
 * Run after the main seed to add the knowledge graph layer.
 */
import 'dotenv/config';
import { pool, query } from '../db/connection.js';
import { DOCUMENT_SECTIONS, EVIDENCE_GRAPHS } from './seed-document.js';

async function setCubby(path: string, data: unknown) {
  const json = JSON.stringify(data);
  await query(
    `INSERT INTO cubbies (path, data, version, updated_at) VALUES ($1, $2::jsonb, 1, NOW())
     ON CONFLICT (path) DO UPDATE SET data = $2::jsonb, version = cubbies.version + 1, updated_at = NOW()`,
    [path, json]
  );
  await query(
    `INSERT INTO cubby_versions (path, data, version, changed_by, changed_at) VALUES ($1, $2::jsonb, 1, 'seed-graphs', NOW())`,
    [path, json]
  );
}

async function seed() {
  // Seed document sections
  for (const section of DOCUMENT_SECTIONS) {
    await setCubby(`document/sections/${section.id}`, section);
  }
  console.log(`Seeded ${DOCUMENT_SECTIONS.length} document sections`);

  // Seed document metadata (section order, title, etc.)
  await setCubby('document/meta', {
    title: 'THE KEN ZI WANG CRIME',
    subtitle: 'THE KENZI FILES - ATTACHED EVIDENCE FILES REFERENCES',
    submitted: 'March 23, 2026',
    section_order: DOCUMENT_SECTIONS.map(s => s.id),
    total_sections: 18,
    seeded_sections: DOCUMENT_SECTIONS.length,
    total_evidence_files: EVIDENCE_GRAPHS.length,
  });

  // Seed evidence graphs
  for (const graph of EVIDENCE_GRAPHS) {
    await setCubby(`graphs/${graph.id}`, graph);
  }
  console.log(`Seeded ${EVIDENCE_GRAPHS.length} evidence graphs`);

  // Count total
  const res = await query(`SELECT COUNT(*) as count FROM cubbies`);
  console.log(`Total cubby entries: ${res.rows[0].count}`);

  await pool.end();
}

seed().catch(e => { console.error(e); process.exit(1); });
