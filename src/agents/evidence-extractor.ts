import { Event, Context, EvidenceItem } from '../types/index.js';

export async function handle(event: Event, context: Context) {
    return extract(event.payload as { evidenceId: string; evidenceType: string; source: string; content: string }, context);
}

function geminiEndpoint(): string {
    return 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';
}

function geminiHeaders(): Record<string, string> {
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GEMINI_API_KEY}`,
    };
}

function extractJson(raw: string): Record<string, unknown> {
    const cleaned = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start === -1 || end === -1) throw new Error('No JSON object found in LLM output');
    return JSON.parse(cleaned.slice(start, end + 1)) as Record<string, unknown>;
}

/**
 * Evidence Extractor — extracts structured signals from raw evidence.
 * Reads existing claims from `claims/*` to know what to score against (dynamic, not hardcoded).
 * Writes to `evidence/{evidence_id}` cubby.
 */
export async function extract(
    payload: { evidenceId: string; evidenceType: string; source: string; content: string },
    context: Context
) {
    const { evidenceId, evidenceType, source, content } = payload;
    if (!content || !evidenceId) return { success: false, error: 'Missing content or evidenceId' };

    context.log({ event: 'agent_run', agent: 'evidence-extractor', evidence_id: evidenceId, output_cubby: 'evidence' });

    // Read existing claim IDs to include in prompt
    const claimsCubby = context.cubby('claims');
    const claimKeys = claimsCubby.json.keys();
    const claimList = claimKeys.map(k => {
        const c = claimsCubby.json.get(k) as { id: string; title: string } | null;
        return c ? `${c.id}: "${c.title}"` : null;
    }).filter(Boolean).join('\n    ');

    const systemPrompt = `You are a legal evidence analyst for a complex multi-jurisdictional fraud case. Extract structured signals from this evidence.

EXISTING CLAIMS (score relevance against ALL of these — be BROAD, not narrow):
    ${claimList || '(no claims yet — propose claim IDs based on evidence content)'}

IMPORTANT: A single piece of evidence typically implicates 5-10 claims in a complex fraud case. Think about:
- Direct claims (who is the evidence about?)
- Pattern claims (does it show a repeated modus operandi?)
- Enterprise claims (does it show coordination between parties?)
- Corroborating claims (does it independently confirm something in another claim?)
- Identity/fabrication claims (does it reveal deception?)

Return ONLY this JSON:
{
  "source_credibility": <0-10>,
  "jurisdictions": ["NDCA", "Dubai", etc],
  "entities": ["person/company names mentioned"],
  "urgency": <0-10>,
  "claims_implicated": [
    {"claim_id": "claim-id-here", "relevance": 0.85, "reasoning": "one sentence"}
  ]
}

Include ALL claims with relevance >= 0.25. Be generous — it's better to flag a marginal connection than miss a real one.`;

    const response = await context.fetch(geminiEndpoint(), {
        method: 'POST',
        headers: geminiHeaders(),
        body: JSON.stringify({
            model: process.env.GEMINI_MODEL || 'gemini-2.0-flash',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: `Type: ${evidenceType}\nSource: ${source}\n\n${content.slice(0, 6000)}` }
            ],
            temperature: 0.2
        })
    });

    if (!response.ok) throw new Error(`Gemini API error ${response.status}`);

    const rawContent = (response.data as { choices: Array<{ message: { content: string } }> }).choices[0].message.content;
    context.log('LLM extraction:', rawContent.slice(0, 400));

    const parsed = extractJson(rawContent);

    const signal: EvidenceItem = {
        id: evidenceId,
        type: evidenceType,
        title: content.split('\n')[0].slice(0, 100),
        source,
        source_credibility: typeof parsed.source_credibility === 'number' ? parsed.source_credibility : 5,
        content_hash: `sha256:${evidenceId}`,
        jurisdictions: Array.isArray(parsed.jurisdictions) ? parsed.jurisdictions as string[] : [],
        entities: Array.isArray(parsed.entities) ? parsed.entities as string[] : [],
        urgency: typeof parsed.urgency === 'number' ? parsed.urgency : 5,
        claims_implicated: Array.isArray(parsed.claims_implicated)
            ? (parsed.claims_implicated as Array<{ claim_id: string; relevance: number; reasoning: string }>)
            : [],
        extracted_at: new Date().toISOString(),
    };

    const evidenceCubby = context.cubby('evidence');
    evidenceCubby.json.set(`/${evidenceId}`, signal);
    context.log({ event: 'cubby_write', cubby: 'evidence', key: evidenceId, success: true });

    return { success: true, signal };
}
