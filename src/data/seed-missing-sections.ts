import 'dotenv/config';
import { pool, query } from '../db/connection.js';

const sections = [
  {
    id: 'section-5', number: 5, title: 'Reputational Taint by Association',
    content: `The facade of Kenzi's misrepresentations began to collapse publicly in late 2021. Social media replies to Cere's posts revealed accusations that Kenzi was actively stealing money. In January 2022, ZachXBT — crypto's most respected on-chain fraud investigator — publicly called out Kenzi for "threatening and abusing founders."

The public accusations from the Kylin Network team and other victims forced Cere's management to question Kenzi's identity and character. The board became concerned about the whereabouts of the company's $3M Symbolic Ventures LP stablecoin investment held by Kenzi, unreturned for over a year.

Management realized that if Kenzi's entire persona was fabricated, the delayed $3M was not an administrative error but outright theft. Kenzi eventually went into hiding in Dubai.`,
    exhibits: [], evidence_ids: ['kenzi-files-pdf'],
    cross_references: [{ section_id: 'section-1', reason: 'Public exposure of fabricated identity', strength: 0.70 }, { section_id: 'section-7', reason: 'Reputational taint led to formal disassociation', strength: 0.90 }],
    key_entities: ['ZachXBT', 'Kenzi Wang', 'Kylin Network'],
    key_facts: ['ZachXBT public callout January 2022', 'Kylin Network accusations surfaced', '$3M Symbolic Ventures stablecoin unreturned 1+ year', 'Kenzi went into hiding in Dubai'],
    gaps: [], last_regenerated: '2022-01-01', regeneration_log: []
  },
  {
    id: 'section-7', number: 7, title: 'Reputational Taint and Disassociation',
    content: `Beyond the theft of the $3M, Cere recognized that their continued affiliation with Kenzi was an existential threat. Over time, more content entered the public domain by victims of Kenzi demonstrating that he was a serial con artist.

The CEO realized that Kenzi's foundational misrepresentations were pervasive. Seeking to protect the project, Cere engaged outside legal guidance from the Wayfair LLP law firm to clean up the fallout, attempting to formally sever all ties and disassociate the company from Kenzi's cascading web of falsification and fraud.`,
    exhibits: [], evidence_ids: ['kenzi-files-pdf'],
    cross_references: [{ section_id: 'section-1', reason: 'Foundational misrepresentations discovered', strength: 0.85 }, { section_id: 'section-5', reason: 'Public taint forced formal action', strength: 0.90 }],
    key_entities: ['Kenzi Wang', 'Wayfair LLP'],
    key_facts: ['Engaged Wayfair LLP for formal disassociation', 'Cascading evidence of serial fraud from public domain', 'Existential threat to project recognized'],
    gaps: [], last_regenerated: '2022-06-01', regeneration_log: []
  },
  {
    id: 'section-9', number: 9, title: 'Term Sheet Signed Under False Pretense and Duress',
    content: `To escape a sustained campaign of threats, psychological pressure, false accusations, and reputational attacks, Cere's CEO ultimately signed a Term Sheet dated September 2022. This was not a voluntary, arms-length agreement — it was executed under conditions that vitiate genuine consent.

The Term Sheet granted Kenzi a $2.49 million payout personally, an 18.8% equity of Cere company shares, and 861 million CERE tokens — provided that Kenzi honored his obligations. Kenzi did not fulfill any obligations. He never signed the required RSPA, never returned social media accounts, never ceased disparagement.

Two independent legal arguments render this document void: (a) signed under duress and fraudulent pretense, making it unenforceable; or (b) breached through total non-performance, rendering all consideration owed back to the company.`,
    exhibits: [], evidence_ids: ['kenzi-files-pdf'],
    cross_references: [{ section_id: 'section-8', reason: 'Eight months of coercion preceded the signing', strength: 0.95 }, { section_id: 'section-10', reason: 'Term Sheet Item 1 is the written confession', strength: 0.95 }],
    key_entities: ['Kenzi Wang', 'Fred Jin'],
    key_facts: ['$2.49M payout + 18.8% equity + 861M CERE tokens granted', 'Kenzi never fulfilled any obligations', 'Never signed required RSPA', 'Two legal theories void it: duress and non-performance'],
    gaps: [], last_regenerated: '2023-05-19', regeneration_log: []
  },
  {
    id: 'section-13', number: 13, title: 'Intentional Destruction of Evidence',
    content: `Once Kenzi realized the company would not yield to his shakedown and the audits were underway, he took active steps to falsify the historical record and destroy evidence of his theft.

He systematically deleted dozens of highly incriminating messages on Telegram and Facebook Messenger regarding his pump-and-dump market-making schemes. He revoked company access to the Token Sale Tracker spreadsheet and deleted corporate documents from shared drives to hide his fund diversions.

After eliminating his digital footprint, Kenzi launched a psychological assault, defaming the company and the CEO with falsified messages and accusations designed to hurt the company's standing, destabilize staff, and inflict tremendous emotional distress on Cere's leadership.`,
    exhibits: [], evidence_ids: ['kenzi-files-pdf'],
    cross_references: [{ section_id: 'section-4', reason: 'Deleted messages from market manipulation Messenger threads', strength: 0.80 }, { section_id: 'section-14', reason: 'Digital asset seizure is evidence destruction at scale', strength: 0.75 }, { section_id: 'section-12', reason: 'Revoked Token Sale Tracker to hide embezzlement', strength: 0.80 }],
    key_entities: ['Kenzi Wang'],
    key_facts: ['Deleted dozens of Telegram/Facebook messages about pump-and-dump', 'Revoked Token Sale Tracker spreadsheet access', 'Deleted corporate documents from shared drives', 'Launched psychological assault after eliminating evidence'],
    gaps: [], last_regenerated: '2026-03-23', regeneration_log: []
  },
];

async function seed() {
  for (const s of sections) {
    await query(
      `INSERT INTO cubbies (path, data, version, updated_at) VALUES ($1, $2::jsonb, 1, NOW())
       ON CONFLICT (path) DO UPDATE SET data = $2::jsonb, version = cubbies.version + 1`,
      ['document/sections/' + s.id, JSON.stringify(s)]
    );
    console.log('Seeded ' + s.id + ': ' + s.title);
  }
  const r = await query(`SELECT COUNT(*) FROM cubbies WHERE path LIKE 'document/sections/%'`);
  console.log('Total sections: ' + r.rows[0].count);
  await pool.end();
}
seed();
