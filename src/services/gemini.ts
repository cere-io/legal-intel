import type { Crime, Case, CrimeScore, CaseImpact } from '../types/index.js';

function endpoint(): string {
  return 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';
}

function headers(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${process.env.GEMINI_API_KEY}`,
  };
}

function extractJson(raw: string): any {
  const cleaned = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
  const start = cleaned.indexOf('[');
  const end = cleaned.lastIndexOf(']');
  if (start !== -1 && end !== -1) return JSON.parse(cleaned.slice(start, end + 1));
  const objStart = cleaned.indexOf('{');
  const objEnd = cleaned.lastIndexOf('}');
  if (objStart === -1 || objEnd === -1) throw new Error('No JSON found in response');
  return JSON.parse(cleaned.slice(objStart, objEnd + 1));
}

export async function scoreAgainstCrimes(evidenceText: string, crimes: Crime[]): Promise<CrimeScore[]> {
  const crimeList = crimes.map(c => `- ${c.code}: "${c.title}" (Section ${c.section}) — ${c.description.slice(0, 150)}`).join('\n');

  const prompt = `You are a legal evidence analyst for a multi-jurisdictional fraud case against Kenzi Wang.

New evidence has arrived. Score its relevance to EACH of the 18 crime categories below on a scale of 0.00 to 1.00.

CRIME CATEGORIES:
${crimeList}

NEW EVIDENCE:
${evidenceText}

Return a JSON array with an object for each crime:
[{"crimeCode": "C-FABRICATION", "score": 0.85, "reasoning": "one sentence why"}]

Score 0.80+ = directly relevant. 0.50-0.79 = supporting. 0.20-0.49 = tangential. Below 0.20 = not relevant.
Return ALL 18 crimes. Be precise and specific in reasoning.`;

  const res = await fetch(endpoint(), {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      model: process.env.GEMINI_MODEL || 'gemini-2.0-flash',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
    }),
  });

  const json = await res.json() as any;
  const content = json.choices?.[0]?.message?.content || '';
  const scores = extractJson(content) as Array<{ crimeCode: string; score: number; reasoning: string }>;

  return scores.map(s => {
    const crime = crimes.find(c => c.code === s.crimeCode);
    return {
      crimeId: crime?.id || 0,
      crimeCode: s.crimeCode,
      crimeTitle: crime?.title || s.crimeCode,
      score: s.score,
      reasoning: s.reasoning,
    };
  }).filter(s => s.crimeId > 0);
}

export async function detectCaseImpact(evidenceText: string, cases: Case[]): Promise<CaseImpact[]> {
  const caseList = cases.map(c => `- "${c.short_name}" (${c.case_number}, ${c.jurisdiction}, ${c.case_type}) — Next deadline: ${c.next_deadline_desc}`).join('\n');

  const prompt = `You are a legal evidence analyst for a multi-jurisdictional fraud case.

New evidence has arrived. Determine which of these active proceedings are affected.

ACTIVE CASES:
${caseList}

NEW EVIDENCE:
${evidenceText}

For each affected case, return:
[{"caseName": "Goopal v. Jin", "impactLevel": "direct", "reasoning": "one sentence"}]

impactLevel: "direct" = this evidence directly changes this case. "supporting" = strengthens position. "peripheral" = tangential relevance.
Only include cases with direct or supporting impact.`;

  const res = await fetch(endpoint(), {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      model: process.env.GEMINI_MODEL || 'gemini-2.0-flash',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
    }),
  });

  const json = await res.json() as any;
  const content = json.choices?.[0]?.message?.content || '';
  const impacts = extractJson(content) as Array<{ caseName: string; impactLevel: string; reasoning: string }>;

  return impacts.map(i => {
    const c = cases.find(cs => cs.short_name === i.caseName);
    return {
      caseId: c?.id || 0,
      caseName: i.caseName,
      impactLevel: i.impactLevel,
      reasoning: i.reasoning,
    };
  }).filter(i => i.caseId > 0);
}
