import type { ClaimTemplate } from '../types/index.js';

export const TEMPLATES: ClaimTemplate[] = [
  {
    id: 'crypto-fraud-rico',
    name: 'RICO (Crypto Fraud)',
    description: 'Racketeer Influenced and Corrupt Organizations Act — requires proving an enterprise engaged in a pattern of racketeering activity',
    elements: [
      { id: 'enterprise', name: 'Enterprise Existence', description: 'An enterprise (any legal entity or association-in-fact) that affects interstate commerce' },
      { id: 'pattern', name: 'Pattern of Racketeering Activity', description: 'At least two predicate acts within 10 years that are related and amount to continued criminal activity' },
      { id: 'conduct', name: 'Conduct Through Enterprise', description: 'Defendant conducted or participated in the enterprise through the pattern of racketeering' },
      { id: 'injury', name: 'Injury to Business or Property', description: 'Plaintiff suffered injury to business or property by reason of the RICO violation' },
    ],
    typical_evidence_types: ['blockchain_tx', 'filing', 'report', 'declaration'],
  },
  {
    id: 'securities-fraud',
    name: 'Securities Fraud (10b-5)',
    description: 'Securities fraud under SEC Rule 10b-5 — material misrepresentation or omission in connection with securities',
    elements: [
      { id: 'material_misrep', name: 'Material Misrepresentation or Omission', description: 'Defendant made an untrue statement of material fact or omitted a material fact' },
      { id: 'scienter', name: 'Scienter (Intent)', description: 'Defendant acted with intent to deceive, manipulate, or defraud' },
      { id: 'connection', name: 'Connection to Securities', description: 'The misrepresentation was made in connection with the purchase or sale of securities' },
      { id: 'reliance', name: 'Reliance', description: 'Plaintiff reasonably relied on the misrepresentation' },
      { id: 'damages', name: 'Damages', description: 'Plaintiff suffered economic loss as a result' },
    ],
    typical_evidence_types: ['filing', 'report', 'email', 'screenshot'],
  },
  {
    id: 'embezzlement',
    name: 'Embezzlement / Conversion',
    description: 'Fraudulent appropriation of property by a person entrusted with its care',
    elements: [
      { id: 'fiduciary', name: 'Fiduciary or Trust Relationship', description: 'Defendant had a fiduciary duty or was entrusted with property' },
      { id: 'property', name: 'Property Entrusted', description: 'Specific property or funds were entrusted to defendant\'s care' },
      { id: 'conversion', name: 'Fraudulent Conversion', description: 'Defendant converted the property to personal use without authorization' },
      { id: 'intent', name: 'Intent to Deprive', description: 'Defendant acted intentionally, not by mistake or negligence' },
    ],
    typical_evidence_types: ['report', 'blockchain_tx', 'bank_statement', 'filing'],
  },
  {
    id: 'extortion-coercion',
    name: 'Extortion / Coercion',
    description: 'Obtaining property or action through threats, intimidation, or abuse of authority',
    elements: [
      { id: 'threat', name: 'Threat or Intimidation', description: 'Defendant communicated a threat of harm (financial, reputational, or physical)' },
      { id: 'intent_obtain', name: 'Intent to Obtain Property or Action', description: 'The threat was made with intent to obtain property, money, or specific action' },
      { id: 'causation', name: 'Causation', description: 'The victim\'s action (payment, signing, compliance) was caused by the threat' },
    ],
    typical_evidence_types: ['email', 'screenshot', 'declaration'],
  },
  {
    id: 'evidence-destruction',
    name: 'Spoliation / Evidence Destruction',
    description: 'Intentional destruction or alteration of evidence relevant to pending or anticipated litigation',
    elements: [
      { id: 'duty', name: 'Duty to Preserve', description: 'Defendant had a duty to preserve evidence (litigation anticipated or pending)' },
      { id: 'destruction', name: 'Intentional Destruction', description: 'Defendant intentionally destroyed, deleted, or altered evidence' },
      { id: 'relevance', name: 'Relevance of Destroyed Evidence', description: 'The destroyed evidence was relevant to the claims at issue' },
    ],
    typical_evidence_types: ['screenshot', 'filing', 'declaration'],
  },
  {
    id: 'money-laundering',
    name: 'Money Laundering',
    description: 'Financial transactions designed to conceal the origin, ownership, or destination of illegally obtained money',
    elements: [
      { id: 'proceeds', name: 'Proceeds of Specified Unlawful Activity', description: 'The funds involved were proceeds from criminal activity' },
      { id: 'transaction', name: 'Financial Transaction', description: 'Defendant conducted or attempted a financial transaction with the proceeds' },
      { id: 'knowledge', name: 'Knowledge of Unlawful Origin', description: 'Defendant knew the funds were proceeds of unlawful activity' },
    ],
    typical_evidence_types: ['blockchain_tx', 'report', 'filing'],
  },
];
