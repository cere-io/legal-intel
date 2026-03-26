/**
 * Clean Example: Apex Ventures CFO Embezzlement
 *
 * Scenario: Marcus Chen, CFO of Apex Ventures, has been embezzling from the company.
 * The system starts with ZERO claims, ZERO evidence. Everything emerges from the data.
 *
 * Step 1: Suspicious bank statement → proposes `embezzlement` claim
 * Step 2: Forged vendor invoice → enriches embezzlement + proposes `forgery`
 * Step 3: Second victim's bank statement → playbook detection, proposes `conspiracy`
 */

export const CLEAN_EVIDENCE_STEPS = [
  {
    step: 1,
    title: 'Suspicious Bank Statement',
    evidence: {
      id: 'apex-bank-stmt-1',
      type: 'bank_statement',
      title: 'Apex Ventures Q4 Bank Statement — Suspicious Transfer',
      source: 'Jennifer Wu <jwu@parkwu.law>',
      content: `Apex Ventures Inc. — Bank of America Commercial Account
Statement Period: October 1 - December 31, 2025

FLAGGED TRANSACTIONS:
- Nov 3, 2025: Wire Transfer $75,000 to "TechPartners Consulting LLC" — Invoice #TP-2025-441
- Nov 17, 2025: Wire Transfer $50,000 to "TechPartners Consulting LLC" — Invoice #TP-2025-458
- Dec 8, 2025: Wire Transfer $25,000 to "TechPartners Consulting LLC" — Invoice #TP-2025-472

Note from Sarah Park (CEO): "I have no knowledge of TechPartners Consulting LLC or any consulting agreement. These transfers were authorized solely by Marcus Chen (CFO) using his signing authority. TechPartners LLC is registered to an address that appears to be Marcus Chen's personal residence."

Total suspicious transfers: $150,000
All approved by: Marcus Chen, CFO
Vendor not in approved vendor list.
No corresponding consulting agreement on file.`,
    },
    expected_claims: ['embezzlement'],
    description: 'First evidence arrives. System proposes embezzlement claim with 4 elements — all starting as unproven.',
  },
  {
    step: 2,
    title: 'Forged Vendor Invoice',
    evidence: {
      id: 'apex-invoice-1',
      type: 'invoice',
      title: 'TechPartners Consulting LLC — Invoice #TP-2025-441 (Suspected Forgery)',
      source: 'Jennifer Wu <jwu@parkwu.law>',
      content: `TechPartners Consulting LLC
1847 Oak Lane, San Jose, CA 95124 (Marcus Chen's home address per property records)

Invoice #TP-2025-441
Date: October 28, 2025
Bill To: Apex Ventures Inc.

Services Rendered:
- "Strategic Technology Advisory Services" — October 2025: $75,000

Notes:
- No engagement letter exists between Apex and TechPartners
- TechPartners LLC was incorporated September 15, 2025 (6 weeks before first invoice)
- Sole member: M. Chen Holdings LLC (registered to same address)
- No other clients or revenue sources identified for TechPartners
- Invoice template matches Apex Ventures' own internal invoice format (same font, layout)
- Invoice was approved in the AP system by Marcus Chen himself

This is a textbook self-dealing scheme: CFO creates shell company, invoices his own employer, approves his own invoices.`,
    },
    expected_claims: ['forgery'],
    expected_enrichments: ['embezzlement'],
    description: 'Second evidence enriches embezzlement (element 3 now partial) and proposes new forgery claim.',
  },
  {
    step: 3,
    title: 'Second Victim — Ortiz Capital Bank Statement',
    evidence: {
      id: 'ortiz-bank-stmt-1',
      type: 'bank_statement',
      title: 'Ortiz Capital Partners — Suspicious TechPartners Invoices',
      source: 'David Ortiz <dortiz@ortizcapital.com>',
      content: `Ortiz Capital Partners LLC — Chase Business Account
Statement Period: November 1 - December 31, 2025

FLAGGED TRANSACTIONS:
- Nov 12, 2025: Wire Transfer $100,000 to "TechPartners Consulting LLC" — Invoice #TP-2025-447
- Dec 1, 2025: Wire Transfer $100,000 to "TechPartners Consulting LLC" — Invoice #TP-2025-465

Context from David Ortiz:
"Marcus Chen serves as an advisor to our fund. He recommended TechPartners for technology due diligence services. I approved these invoices based on his recommendation. I have now learned that TechPartners is Marcus's own company. The invoices use the EXACT SAME TEMPLATE as the ones he submitted to Apex Ventures. The 'services' described are identical boilerplate text."

Total suspicious transfers: $200,000
Same vendor (TechPartners Consulting LLC)
Same invoice template
Same boilerplate service descriptions
Different victim, same perpetrator, same scheme.`,
    },
    expected_claims: ['conspiracy'],
    expected_enrichments: ['embezzlement', 'forgery'],
    expected_pattern: 'PLAYBOOK DETECTED: Same forged invoice template used across multiple victims',
    description: 'Third evidence triggers playbook detection — same scheme across two victims. Proposes conspiracy claim.',
  },
];

export const CLEAN_FEEDBACK = {
  evidence_id: 'apex-bank-stmt-1',
  assessor: 'Jennifer Wu',
  impact_rating: 9,
  useful: true,
  admissible: true,
  notes: 'Bank statement is direct evidence of unauthorized transfers. Will be Exhibit A in the complaint.',
};
