/**
 * Granular evidence items extracted from the Kenzi Files PDF.
 * Each exhibit sub-item becomes its own cubby node at evidence/{id}.
 * This transforms thin claim graphs (2-3 nodes) into dense evidence webs (10-15 nodes per claim).
 */

import 'dotenv/config';
import { pool, query } from '../db/connection.js';

interface GranularEvidence {
  id: string;
  type: string;
  title: string;
  source: string;
  source_credibility: number;
  date: string;
  content_hash: string;
  jurisdictions: string[];
  entities: string[];
  urgency: number;
  claims_implicated: Array<{ claim_id: string; relevance: number; reasoning: string }>;
  key_finding: string;
  exhibit_ref: string;
}

const GRANULAR_EVIDENCE: GranularEvidence[] = [
  // === SECTION 1: FABRICATION — 10 evidence items ===
  {
    id: 'ex1-1-wikitia-page', type: 'screenshot', title: 'Wikitia Paid Biography Page', source: 'Wikitia.com / Web Archive',
    source_credibility: 8, date: '2025-08-27', content_hash: 'sha256:wikitia1', jurisdictions: ['NDCA'], entities: ['Kenzi Wang', 'Ankush.srg', 'Wikitia'],
    urgency: 7, exhibit_ref: 'Exhibit 1.1',
    claims_implicated: [{ claim_id: 'fabrication', relevance: 0.95, reasoning: 'Paid Wikipedia-lookalike page with fabricated citations created by user Ankush.srg' }],
    key_finding: 'Kenzi purchased a pay-to-play Wikitia biography through account "Ankush.srg" that mimics Wikipedia layout to deceive readers into believing verified information.',
  },
  {
    id: 'ex1-2-career-info', type: 'screenshot', title: 'Self-Submitted Career Claims on Wikitia', source: 'Wikitia.com',
    source_credibility: 7, date: '2025-08-27', content_hash: 'sha256:wikitia2', jurisdictions: ['NDCA'], entities: ['Kenzi Wang', 'Columbia University', 'Wharton'],
    urgency: 7, exhibit_ref: 'Exhibit 1.2',
    claims_implicated: [{ claim_id: 'fabrication', relevance: 0.90, reasoning: 'Kenzi supplied false education and career info including Columbia CS and Wharton MBA' }],
    key_finding: 'Kenzi self-submitted early life, education, and career information including Computer Science at Columbia and MBA from Wharton — both unverifiable.',
  },
  {
    id: 'ex1-3-traction-404', type: 'screenshot', title: 'Fake Traction Labs Acquisition — TechCrunch 404', source: 'TechCrunch / Web Archive',
    source_credibility: 9, date: '2026-03-15', content_hash: 'sha256:traction404', jurisdictions: ['NDCA'], entities: ['Kenzi Wang', 'Traction Labs', 'TechCrunch'],
    urgency: 6, exhibit_ref: 'Exhibit 1.3',
    claims_implicated: [{ claim_id: 'fabrication', relevance: 0.92, reasoning: 'Claims Traction Labs "successfully acquired in 2017" but referenced TechCrunch article returns 404 — never existed' }],
    key_finding: 'Wikitia claims Traction Labs was acquired, linking to techcrunch.com/2017/03/10/traction-labs-acquired/ which returns 404. Web Archive confirms URL never existed.',
  },
  {
    id: 'ex1-4-dead-citations', type: 'screenshot', title: '7 of 15 Wikitia Citations Are Dead Links', source: 'Wikitia.com reference verification',
    source_credibility: 9, date: '2026-03-15', content_hash: 'sha256:deadlinks', jurisdictions: ['NDCA'], entities: ['Kenzi Wang', 'TechCrunch', 'BusinessInsider', 'Forbes', 'CoinDesk'],
    urgency: 7, exhibit_ref: 'Exhibit 1.4',
    claims_implicated: [{ claim_id: 'fabrication', relevance: 0.95, reasoning: 'Every third-party journalistic citation is fabricated — 7 of 15 references return 404' }],
    key_finding: 'All citations to BusinessInsider, TechCrunch (x2), CoinDesk, Forbes (x2), and The Information return 404. Only working links are Kenzi\'s own properties.',
  },
  {
    id: 'ex1-nsc-clearinghouse', type: 'report', title: 'National Student Clearinghouse — No Columbia Record', source: 'National Student Clearinghouse via Emmie Chang',
    source_credibility: 10, date: '2018-01-01', content_hash: 'sha256:nsc', jurisdictions: ['NDCA'], entities: ['Kenzi Wang', 'Columbia University', 'Emmie Chang'],
    urgency: 8, exhibit_ref: 'QRI Third Report',
    claims_implicated: [{ claim_id: 'fabrication', relevance: 0.98, reasoning: 'Official academic clearinghouse returned "no record found" for Kenzi at Columbia' }],
    key_finding: 'Emmie Chang verified through National Student Clearinghouse: "no record found" for Kenzi Wang at Columbia University.',
  },
  {
    id: 'ex1-signal-nfx', type: 'screenshot', title: 'Signal NFX — Lists Mathematics, Not Computer Science', source: 'Signal NFX investor platform',
    source_credibility: 8, date: '2026-03-15', content_hash: 'sha256:signalnfx', jurisdictions: ['NDCA'], entities: ['Kenzi Wang'],
    urgency: 5, exhibit_ref: 'Exhibit 1',
    claims_implicated: [{ claim_id: 'fabrication', relevance: 0.80, reasoning: 'Contradicts Columbia CS claim — Signal NFX (self-reported) lists Mathematics only' }],
    key_finding: 'Signal NFX, where investors self-report credentials, lists Kenzi studying Mathematics — contradicting his CS claim. Even his own lies are inconsistent.',
  },
  {
    id: 'ex1-ycombinator', type: 'report', title: 'Kicked Out of Y Combinator for Dual Submission', source: 'QRI Third Report / Alex Gold testimony',
    source_credibility: 9, date: '2023-11-17', content_hash: 'sha256:yc', jurisdictions: ['NDCA'], entities: ['Kenzi Wang', 'Alex Gold', 'Y Combinator'],
    urgency: 7, exhibit_ref: 'QRI Third Report',
    claims_implicated: [{ claim_id: 'fabrication', relevance: 0.88, reasoning: 'Kicked out of YC for submitting under two companies — Gold admitted it, Kenzi "denied until the end"' }],
    key_finding: 'Alex Gold told Emmie Chang: they got kicked out of Y Combinator for submitting under two companies. Gold broke down and admitted it; Kenzi "denied it until the end."',
  },
  {
    id: 'ex1-alex-gold-unlv', type: 'declaration', title: 'Alex Gold Confirms UNLV — Not Columbia', source: 'Alex Gold via Emmie Chang / QRI',
    source_credibility: 9, date: '2023-11-17', content_hash: 'sha256:goldunlv', jurisdictions: ['NDCA'], entities: ['Kenzi Wang', 'Alex Gold', 'UNLV'],
    urgency: 8, exhibit_ref: 'QRI Third Report',
    claims_implicated: [{ claim_id: 'fabrication', relevance: 0.95, reasoning: 'Former business partner confirms Kenzi attended UNLV, not Columbia or Wharton' }],
    key_finding: 'Alex Gold, Traction Labs co-founder, confirmed to Emmie Chang: Kenzi Wang actually attended University of Nevada Las Vegas.',
  },

  // === SECTION 2: GRAND THEFT — 4 evidence items ===
  {
    id: 'ex2-1-court-record', type: 'filing', title: 'Grand Theft Charge — SFSC Case 18017577', source: 'San Francisco County Superior Court',
    source_credibility: 10, date: '2018-11-13', content_hash: 'sha256:grandtheft', jurisdictions: ['NDCA'], entities: ['Kenzi Wang', 'HBUS'],
    urgency: 8, exhibit_ref: 'Exhibit 2.1',
    claims_implicated: [{ claim_id: 'grand-theft', relevance: 0.98, reasoning: 'Official court record of Grand Theft felony charge under California Penal Code 487(a)' }],
    key_finding: 'Case No. 18017577, filed November 13, 2018. Statute 487(a) Grand Theft. HBUS CEO: "We had to file a criminal complaint to get our stolen laptop back."',
  },
  {
    id: 'ex2-superbloom-dismissed', type: 'filing', title: 'SuperBloom Lawsuit — Dismissed After Lawyer Dropped Kenzi', source: 'LA County Case 18STCV05701',
    source_credibility: 10, date: '2018-01-01', content_hash: 'sha256:superbloom', jurisdictions: ['NDCA'], entities: ['Kenzi Wang', 'Emmie Chang', 'SuperBloom'],
    urgency: 6, exhibit_ref: 'Exhibit 2.3',
    claims_implicated: [{ claim_id: 'grand-theft', relevance: 0.75, reasoning: 'Pattern: sued victim who caught him self-dealing, case dismissed after his own lawyer dropped him' }],
    key_finding: 'Kenzi sued Emmie Chang after she caught him self-dealing. Case dismissed after Kenzi\'s own lawyer told Chang\'s lawyer his client was "a con artist" and terminated representation.',
  },
  {
    id: 'ex2-forum-bad-faith', type: 'filing', title: 'FORUM Arbitration — Bad Faith Domain Squatting', source: 'FORUM Case FA1709001750913',
    source_credibility: 10, date: '2017-01-01', content_hash: 'sha256:forum', jurisdictions: ['NDCA'], entities: ['Kenzi Wang', 'Traction Corp'],
    urgency: 5, exhibit_ref: 'Exhibit 2.3',
    claims_implicated: [{ claim_id: 'grand-theft', relevance: 0.70, reasoning: 'FORUM panel found "bad faith registration and use" — pattern of taking what doesn\'t belong to him' }],
    key_finding: 'Registered 7+ "Traction-formative" domains, agreed to settle for $3K, then reneged. FORUM ruled bad faith. All domains ordered transferred.',
  },

  // === SECTION 4: MARKET MANIPULATION — 5 evidence items ===
  {
    id: 'ex4-smoking-gun', type: 'screenshot', title: '"Just pretend you didn\'t see it. Sign... They are dumb."', source: 'Facebook Messenger / Fred Jin',
    source_credibility: 9, date: '2021-11-08', content_hash: 'sha256:pretend', jurisdictions: ['NDCA'], entities: ['Kenzi Wang', 'Fred Jin', 'Mike Chen'],
    urgency: 10, exhibit_ref: 'Exhibit 4.4',
    claims_implicated: [
      { claim_id: 'market-manipulation', relevance: 0.98, reasoning: 'Smoking gun: Kenzi instructs Fred to exploit calculation error in market maker contract' },
      { claim_id: 'evidence-destruction', relevance: 0.70, reasoning: 'Same Messenger thread shows multiple "Kenzi deleted a message" entries' },
    ],
    key_finding: 'THE SMOKING GUN — Fred flags calculation error in MM contract. Kenzi: "Just pretend you didn\'t see it. Sign... They are dumb."',
  },
  {
    id: 'ex4-ld-capital-payout', type: 'blockchain_tx', title: 'LD Capital 800K USDT Payout — Verified On-Chain', source: 'Etherscan',
    source_credibility: 10, date: '2021-12-16', content_hash: 'sha256:ldcapital', jurisdictions: ['NDCA'], entities: ['Kenzi Wang', 'LD Capital'],
    urgency: 8, exhibit_ref: 'Exhibit 4.8',
    claims_implicated: [
      { claim_id: 'market-manipulation', relevance: 0.90, reasoning: 'Co-conspirator payout verified on-chain 8 days after threat to "spread FUD"' },
      { claim_id: 'syndicate', relevance: 0.85, reasoning: 'LD Capital is part of Kenzi\'s syndicate — threatened FUD to extract payment' },
    ],
    key_finding: 'LD Capital received 800K USDT on Dec 16, 2021 — verified at etherscan.io/tx/0xc01ef... Kenzi pressured: "we can\'t lowball these guys, they will spread FUD."',
  },
  {
    id: 'ex4-nailwal-coordination', type: 'screenshot', title: 'Sandeep Nailwal Coordinating with Ciara (Huobi)', source: 'Facebook Messenger',
    source_credibility: 8, date: '2021-11-08', content_hash: 'sha256:nailwal', jurisdictions: ['NDCA'], entities: ['Sandeep Nailwal', 'Ciara', 'Huobi'],
    urgency: 7, exhibit_ref: 'Exhibit 4',
    claims_implicated: [
      { claim_id: 'market-manipulation', relevance: 0.85, reasoning: 'Nailwal directly involved in listing coordination with Huobi' },
      { claim_id: 'syndicate', relevance: 0.90, reasoning: 'Polygon co-founder directly coordinating token listing with exchange' },
    ],
    key_finding: '"Sandeep talking to Ciara" — Nailwal directly involved in Huobi listing coordination. This page shows the highest concentration of deleted messages.',
  },
  {
    id: 'ex4-fred-stop-selling', type: 'screenshot', title: 'Fred\'s Plea: "We should stop selling from MM part now"', source: 'Facebook Messenger',
    source_credibility: 9, date: '2021-11-09', content_hash: 'sha256:stopselling', jurisdictions: ['NDCA'], entities: ['Fred Jin', 'Kenzi Wang'],
    urgency: 7, exhibit_ref: 'Exhibit 4.6',
    claims_implicated: [{ claim_id: 'market-manipulation', relevance: 0.85, reasoning: 'CEO recognized damage and tried to halt sell-off, was overridden by Kenzi' }],
    key_finding: 'Fred: "We probably should stop selling from mm part now.. To keep the price above $2B." Four more deleted messages precede this plea.',
  },
  {
    id: 'ex4-kenzi-mike-photo', type: 'screenshot', title: 'Photo of Kenzi with Market Maker Mike Chen (Aug 2022)', source: 'Facebook Messenger',
    source_credibility: 8, date: '2022-08-08', content_hash: 'sha256:kenzimike', jurisdictions: ['NDCA'], entities: ['Kenzi Wang', 'Mike Chen'],
    urgency: 5, exhibit_ref: 'Exhibit 4.7',
    claims_implicated: [{ claim_id: 'market-manipulation', relevance: 0.75, reasoning: 'Proves ongoing personal relationship 9 months after coordinated token dump' }],
    key_finding: 'Kenzi sends selfie with Mike Chen 9 months after the coordinated dump. Fred responds "Who is that?" — didn\'t recognize the market maker.',
  },

  // === SECTION 12: EMBEZZLEMENT — 5 evidence items ===
  {
    id: 'ex12-docusign-wallets', type: 'email', title: 'DocuSign SAFT — Kenzi Directing to Personal Wallets', source: 'DocuSign via kenzi@cere.network',
    source_credibility: 9, date: '2021-02-01', content_hash: 'sha256:docusign', jurisdictions: ['NDCA'], entities: ['Kenzi Wang'],
    urgency: 9, exhibit_ref: 'Exhibit 12.2',
    claims_implicated: [{ claim_id: 'embezzlement', relevance: 0.95, reasoning: 'DocuSign from kenzi@cere.network directed investors to personal wallets — unique wallet per investor to obscure trail' }],
    key_finding: 'DocuSign SAFT emails from kenzi@cere.network directed investors to deposit to wallet 0x32C325950.. which was NOT a company wallet.',
  },
  {
    id: 'ex12-ld-capital-300k', type: 'blockchain_tx', title: 'LD Capital $300K Diverted to Kenzi Wallet', source: 'Etherscan',
    source_credibility: 10, date: '2021-01-01', content_hash: 'sha256:ld300k', jurisdictions: ['NDCA'], entities: ['LD Capital', 'Kenzi Wang'],
    urgency: 8, exhibit_ref: 'Exhibit 12.3',
    claims_implicated: [{ claim_id: 'embezzlement', relevance: 0.92, reasoning: 'On-chain proof: $300K from LD Capital sent to Kenzi-controlled wallet, never reached company treasury' }],
    key_finding: 'LD Capital invested $300K via SAFT. Funds sent to Kenzi wallet. Majority still residing in wallet controlled by Kenzi — should have been company funds.',
  },
  {
    id: 'ex12-republic-100k', type: 'blockchain_tx', title: 'Republic $100K Diverted to Kenzi Wallet', source: 'Etherscan',
    source_credibility: 10, date: '2021-01-01', content_hash: 'sha256:republic100k', jurisdictions: ['NDCA'], entities: ['Republic', 'Kenzi Wang'],
    urgency: 8, exhibit_ref: 'Exhibit 12.4',
    claims_implicated: [{ claim_id: 'embezzlement', relevance: 0.90, reasoning: 'Even Republic (Cere\'s certified platform partner) was victimized by wallet substitution' }],
    key_finding: 'Republic invested $100K. Even Cere\'s certified token issuance platform partner was victimized by Kenzi\'s wallet substitution scheme.',
  },
  {
    id: 'ex12-influencer-fraud', type: 'report', title: 'Influencer Fund Fraud — $462.5K from 39 Influencers', source: 'Ascent Investigation / Influencer tracker',
    source_credibility: 9, date: '2021-01-01', content_hash: 'sha256:influencer', jurisdictions: ['NDCA'], entities: ['Kenzi Wang'],
    urgency: 7, exhibit_ref: 'Exhibit 12.7',
    claims_implicated: [{ claim_id: 'embezzlement', relevance: 0.88, reasoning: '39 influencers, $462.5K total — all directed to Kenzi-controlled wallets via DocuSign' }],
    key_finding: '39 influencers contributed $462,500 total. All via DocuSign SAFTs to Kenzi wallets. Many "influencers" later identified as Kenzi\'s own associates.',
  },

  // === SECTION 16: VIVIAN LIU — 6 evidence items ===
  {
    id: 'ex16-slack-takeover', type: 'screenshot', title: 'Kenzi Volunteers to "Handle Vivian" (Slack Dec 2021)', source: 'Slack internal communications',
    source_credibility: 9, date: '2021-12-23', content_hash: 'sha256:slackvivian', jurisdictions: ['NDCA', 'Dubai'], entities: ['Kenzi Wang', 'Vivian Liu'],
    urgency: 9, exhibit_ref: 'Exhibit 16.2',
    claims_implicated: [{ claim_id: 'vivian-theft', relevance: 0.95, reasoning: 'Kenzi specifically volunteered for Vivian\'s account — the only investor whose tokens were later stolen' }],
    key_finding: 'Kenzi: "I\'ll handle Vivian" and "I\'ll take Vivian and Jacky." Vivian was pregnant and unavailable — deliberately targeted vulnerable investor.',
  },
  {
    id: 'ex16-deleted-user-wallet', type: 'screenshot', title: '"Deleted User" Replaced Vivian\'s Wallet in Distribution Sheet', source: 'Google Sheets audit log',
    source_credibility: 9, date: '2022-05-03', content_hash: 'sha256:deleteduser', jurisdictions: ['NDCA', 'Dubai'], entities: ['Kenzi Wang', 'Vivian Liu'],
    urgency: 9, exhibit_ref: 'Exhibit 16.3',
    claims_implicated: [{ claim_id: 'vivian-theft', relevance: 0.95, reasoning: 'Google Sheets edit history shows "deleted user" swapped real wallet at Row 58 — and Google Workspace data was destroyed' }],
    key_finding: 'A "Deleted User" entered fake mainnet wallet at Row 58. Google Workspace account data destroyed after 20-day retention period, eliminating the audit trail.',
  },
  {
    id: 'ex16-tranche-1', type: 'blockchain_tx', title: 'First Tranche: 13.33M CERE to Fake Wallet (Mar 2022)', source: 'Cere Mainnet Block 4361724',
    source_credibility: 10, date: '2022-03-25', content_hash: 'sha256:tranche1', jurisdictions: ['NDCA', 'Dubai'], entities: ['Vivian Liu', '6R1GPxm3...'],
    urgency: 8, exhibit_ref: 'Exhibit 16.4',
    claims_implicated: [{ claim_id: 'vivian-theft', relevance: 0.95, reasoning: 'On-chain record of first tranche diversion — 13.33M CERE sent to Kenzi-controlled wallet' }],
    key_finding: '13,333,334 CERE sent from company wallet to fake wallet 6R1GPxm3... on Fri, 25 Mar 2022. A test of 1 CERE was sent first on March 1.',
  },
  {
    id: 'ex16-tranche-2', type: 'blockchain_tx', title: 'Second Tranche: 20M CERE to Same Fake Wallet (May 2022)', source: 'Cere Mainnet Block 5019196',
    source_credibility: 10, date: '2022-05-10', content_hash: 'sha256:tranche2', jurisdictions: ['NDCA', 'Dubai'], entities: ['Vivian Liu', '6R1GPxm3...'],
    urgency: 8, exhibit_ref: 'Exhibit 16.5',
    claims_implicated: [{ claim_id: 'vivian-theft', relevance: 0.95, reasoning: 'Second tranche completes 33.33M total theft — exact SAFT allocation amount' }],
    key_finding: '20,000,000 CERE to same fake wallet. Total stolen: 33,333,334 CERE — matching exactly the SAFT allocation.',
  },
  {
    id: 'ex16-test-bridge', type: 'blockchain_tx', title: 'Test Bridge: 33,333 CERE (0.1% Test Transaction)', source: 'Etherscan Block 18948896',
    source_credibility: 10, date: '2024-01-06', content_hash: 'sha256:testbridge', jurisdictions: ['NDCA', 'Dubai'], entities: ['0xb08f...'],
    urgency: 9, exhibit_ref: 'Exhibit 16.7',
    claims_implicated: [{ claim_id: 'vivian-theft', relevance: 0.92, reasoning: 'Professional test transaction — exactly 0.1% of total, proves premeditation' }],
    key_finding: '33,333 CERE (exactly 0.1%) bridged as test transaction. Professional criminals test their escape routes before committing to the full operation.',
  },
  {
    id: 'ex16-full-dump-kucoin', type: 'blockchain_tx', title: 'Full Dump: 33.3M CERE Sold on KuCoin in 24h', source: 'Etherscan',
    source_credibility: 10, date: '2024-01-08', content_hash: 'sha256:fulldump', jurisdictions: ['NDCA', 'Dubai'], entities: ['KuCoin', '0xb08f...'],
    urgency: 9, exhibit_ref: 'Exhibit 16.9',
    claims_implicated: [
      { claim_id: 'vivian-theft', relevance: 0.95, reasoning: 'Complete liquidation within 24 hours — grab and run' },
      { claim_id: 'market-manipulation', relevance: 0.70, reasoning: 'Massive sell pressure on single exchange deliberately damages token price' },
    ],
    key_finding: '33,299,997.97 CERE dumped to KuCoin within 24 hours. KuCoin selected for lower KYC requirements.',
  },

  // === SECTION 17: SYNDICATE — 4 evidence items ===
  {
    id: 'ex17-kevin-xu-dump', type: 'blockchain_tx', title: 'Kevin Xu / BlockVC Dumped 50M CERE Immediately', source: 'Etherscan wallet 0x2B9C...',
    source_credibility: 10, date: '2022-05-10', content_hash: 'sha256:kevindump', jurisdictions: ['NDCA'], entities: ['Kevin Xu', 'BlockVC'],
    urgency: 8, exhibit_ref: 'Exhibit 18.3',
    claims_implicated: [{ claim_id: 'syndicate', relevance: 0.92, reasoning: 'Co-conspirator dumped 50M tokens immediately — not a long-term investment' }],
    key_finding: '50,000,000 CERE dumped by Kevin Xu / BlockVC Dec 2021 - May 2022. Verified at etherscan.io/address/0x2B9Cc2...',
  },
  {
    id: 'ex17-josef-qu-fabricated', type: 'filing', title: '"Josef Qu" RICO Complaint — Fabricated KYC Identity', source: 'USDC Northern District 3:26-cv-1235',
    source_credibility: 10, date: '2026-02-10', content_hash: 'sha256:josefqu', jurisdictions: ['NDCA'], entities: ['Josef Qu', 'Kevin Ding'],
    urgency: 8, exhibit_ref: 'Exhibit 18.5',
    claims_implicated: [{ claim_id: 'syndicate', relevance: 0.90, reasoning: 'Kevin Ding used relative "Josef Qu" as KYC front — "The SAFT is under my relative name Josef Qu (Austria KYC) for easier management"' }],
    key_finding: 'Kevin Ding email Jan 11, 2022: "The SAFT is under my relative name Josef Qu (Austria KYC) for easier management." Filing described as "largely carbon copies" of Kenzi\'s Delaware complaint.',
  },
  {
    id: 'ex17-ele-pump-dump', type: 'report', title: '$ELE Meme Coin Pump & Dump with Nailwal (May 2024)', source: 'AiCoin, ChainCatcher, Bitget News',
    source_credibility: 7, date: '2024-05-01', content_hash: 'sha256:ele', jurisdictions: ['NDCA'], entities: ['Kenzi Wang', 'Sandeep Nailwal', 'Sachi Kamiya'],
    urgency: 6, exhibit_ref: 'Exhibit 17',
    claims_implicated: [
      { claim_id: 'syndicate', relevance: 0.85, reasoning: 'Organized meme coin pump with Nailwal and Polygon insiders — $17M to $2M crash' },
      { claim_id: 'market-manipulation', relevance: 0.80, reasoning: 'Same pump-and-dump pattern as CERE, now applied to $ELE' },
    ],
    key_finding: 'KOLs promised USDC compensation — never paid. Insiders sold while promoters hyped. Market cap crashed $17M → $2M.',
  },

  // === SECTION 14: DIGITAL ASSET SEIZURE — 3 evidence items ===
  {
    id: 'ex14-twitter-hijack', type: 'screenshot', title: '@cerenetwork Twitter Hijack (105K Followers)', source: 'Twitter/X records',
    source_credibility: 9, date: '2023-04-18', content_hash: 'sha256:twitterhijack', jurisdictions: ['Dubai'], entities: ['Kenzi Wang', '@cerenetwork'],
    urgency: 8, exhibit_ref: 'Exhibit 14.0',
    claims_implicated: [{ claim_id: 'digital-seizure', relevance: 0.95, reasoning: 'Full lockout of 105K-follower corporate Twitter account — password changed 3 times' }],
    key_finding: 'Dec 24, 2022: first password change. Apr 18, 2023: full lockout. Sep 22, 2023: posted "ONLY official account on X" from hijacked account.',
  },
  {
    id: 'ex14-telegram-hijack', type: 'screenshot', title: 'Telegram Hijack — 75K Member Group', source: 'Telegram admin records',
    source_credibility: 9, date: '2023-04-18', content_hash: 'sha256:telegramhijack', jurisdictions: ['Dubai'], entities: ['Kenzi Wang', 'Martijn Broersma', 'Fred Jin'],
    urgency: 8, exhibit_ref: 'Exhibit 14.1',
    claims_implicated: [{ claim_id: 'digital-seizure', relevance: 0.95, reasoning: 'Removed Fred and Martijn as admins from ALL channels — Marketmaker, Binance, Huobi, KuCoin, main group' }],
    key_finding: 'Apr 18, 2023: Fred Jin and Martijn Broersma removed as administrators from all Telegram channels. Cere lost ALL investor communication channels.',
  },
  {
    id: 'ex14-fake-websites', type: 'screenshot', title: 'Fake Websites: cerenetwork.io + cerenetworkvictims.com + coinyada.com', source: 'WHOIS records',
    source_credibility: 9, date: '2026-02-20', content_hash: 'sha256:fakewebsites', jurisdictions: ['NDCA', 'Dubai'], entities: ['Kenzi Wang', 'cerenetwork.io', 'cerenetworkvictims.com', 'coinyada.com'],
    urgency: 7, exhibit_ref: 'Exhibit 14.3-14.6',
    claims_implicated: [
      { claim_id: 'digital-seizure', relevance: 0.90, reasoning: 'Created fake company website, fake victim site, and fake news site with backdated articles' },
      { claim_id: 'aliases', relevance: 0.80, reasoning: 'cerenetworkvictims.com and coinyada.com share identical WHOIS registration — same anonymous operator' },
    ],
    key_finding: 'cerenetwork.io (fake SEC links), cerenetworkvictims.com (smear campaigns), coinyada.com (backdated fake news). All share WHOIS: Tucows/Charlestown KN.',
  },
];

async function seed() {
  console.log('Seeding granular evidence items...');

  for (const ev of GRANULAR_EVIDENCE) {
    const cubbyData = {
      id: ev.id,
      type: ev.type,
      title: ev.title,
      source: ev.source,
      source_credibility: ev.source_credibility,
      content_hash: ev.content_hash,
      jurisdictions: ev.jurisdictions,
      entities: ev.entities,
      urgency: ev.urgency,
      claims_implicated: ev.claims_implicated,
      key_finding: ev.key_finding,
      exhibit_ref: ev.exhibit_ref,
      extracted_at: ev.date,
    };

    await query(
      `INSERT INTO cubbies (path, data, version, updated_at) VALUES ($1, $2::jsonb, 1, NOW())
       ON CONFLICT (path) DO UPDATE SET data = $2::jsonb, version = cubbies.version + 1, updated_at = NOW()`,
      ['evidence/' + ev.id, JSON.stringify(cubbyData)]
    );

    // Also add to cubby_versions
    await query(
      `INSERT INTO cubby_versions (path, data, version, changed_by, changed_at) VALUES ($1, $2::jsonb, 1, 'seed-granular', NOW())`,
      ['evidence/' + ev.id, JSON.stringify(cubbyData)]
    );
  }

  console.log(`Seeded ${GRANULAR_EVIDENCE.length} granular evidence items`);

  // Now update claims to reference these granular evidence items in their elements
  const claimUpdates: Record<string, Record<string, string[]>> = {
    'fabrication': {
      'material_misrep': ['ex1-1-wikitia-page', 'ex1-2-career-info', 'ex1-3-traction-404', 'ex1-4-dead-citations', 'ex1-nsc-clearinghouse'],
      'scienter': ['ex1-1-wikitia-page', 'ex1-4-dead-citations'],
      'connection': ['ex1-alex-gold-unlv', 'ex1-ycombinator'],
      'reliance': ['ex1-nsc-clearinghouse', 'ex1-signal-nfx'],
      'damages': ['kenzi-files-pdf'],
    },
    'grand-theft': {
      'fiduciary': ['ex2-1-court-record'],
      'property': ['ex2-1-court-record'],
      'conversion': ['ex2-1-court-record', 'ex2-superbloom-dismissed'],
      'intent': ['ex2-1-court-record', 'ex2-forum-bad-faith'],
    },
    'market-manipulation': {
      'material_misrep': ['ex4-smoking-gun', 'ex4-nailwal-coordination'],
      'scienter': ['ex4-smoking-gun', 'ex4-fred-stop-selling'],
      'connection': ['ex4-ld-capital-payout'],
      'reliance': [],
      'damages': ['ex4-ld-capital-payout', 'ex4-kenzi-mike-photo'],
    },
    'embezzlement': {
      'fiduciary': ['ex12-docusign-wallets', 'ascent-audit'],
      'property': ['ex12-ld-capital-300k', 'ex12-republic-100k', 'ex12-influencer-fraud'],
      'conversion': ['ex12-docusign-wallets', 'ex12-ld-capital-300k', 'ex12-republic-100k', 'dhty-report'],
      'intent': ['ex12-docusign-wallets', 'ascent-audit'],
    },
    'vivian-theft': {
      'fiduciary': ['ex16-slack-takeover'],
      'property': ['ex16-tranche-1', 'ex16-tranche-2', 'big-report'],
      'conversion': ['ex16-deleted-user-wallet', 'ex16-tranche-1', 'ex16-tranche-2', 'ex16-test-bridge', 'ex16-full-dump-kucoin'],
      'intent': ['ex16-test-bridge', 'ex16-full-dump-kucoin', 'big-report'],
    },
    'syndicate': {
      'enterprise': ['ex17-kevin-xu-dump', 'ex17-ele-pump-dump', 'kenzi-files-pdf'],
      'pattern': ['ex17-kevin-xu-dump', 'ex17-josef-qu-fabricated', 'ex17-ele-pump-dump', 'ex4-ld-capital-payout', 'ex16-full-dump-kucoin', 'big-report'],
      'conduct': ['ex17-kevin-xu-dump', 'ex4-nailwal-coordination'],
      'injury': ['kenzi-files-pdf', 'dhty-report'],
    },
    'digital-seizure': {
      'fiduciary': ['ex14-twitter-hijack'],
      'property': ['ex14-twitter-hijack', 'ex14-telegram-hijack'],
      'conversion': ['ex14-twitter-hijack', 'ex14-telegram-hijack', 'ex14-fake-websites'],
      'intent': ['ex14-fake-websites'],
    },
  };

  for (const [claimId, elements] of Object.entries(claimUpdates)) {
    const claimRes = await query(`SELECT data FROM cubbies WHERE path = $1`, ['claims/' + claimId]);
    if (claimRes.rows.length === 0) continue;

    const claim = claimRes.rows[0].data;
    let updated = false;

    for (const [elementId, evidenceIds] of Object.entries(elements)) {
      const element = claim.elements?.find((e: { id: string }) => e.id === elementId);
      if (element && evidenceIds.length > 0) {
        element.supporting_evidence = [...new Set([...(element.supporting_evidence || []), ...evidenceIds])];
        if (element.supporting_evidence.length >= 2) element.status = 'proven';
        else if (element.supporting_evidence.length >= 1) element.status = 'partial';
        updated = true;
      }
    }

    // Update evidence_chain with all granular evidence
    const allEvidence = new Set(claim.evidence_chain || []);
    Object.values(elements).flat().forEach((id: string) => allEvidence.add(id));
    claim.evidence_chain = Array.from(allEvidence);

    if (updated) {
      // Recalculate strength based on element statuses
      const proven = claim.elements.filter((e: { status: string }) => e.status === 'proven').length;
      const total = claim.elements.length;
      claim.strength = parseFloat((0.5 + (proven / total) * 0.5).toFixed(2));

      await query(
        `UPDATE cubbies SET data = $2::jsonb, version = version + 1, updated_at = NOW() WHERE path = $1`,
        ['claims/' + claimId, JSON.stringify(claim)]
      );
      console.log(`  Updated ${claimId}: ${claim.evidence_chain.length} evidence items, strength ${claim.strength}`);
    }
  }

  const countRes = await query(`SELECT COUNT(*) as count FROM cubbies`);
  console.log(`\nTotal cubby entries: ${countRes.rows[0].count}`);

  await pool.end();
}

seed().catch(e => { console.error(e); process.exit(1); });
