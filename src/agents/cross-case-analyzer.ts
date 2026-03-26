import { Event, Context, EvidenceItem, LegalCase, CaseImpact, ActionItem } from '../types/index.js';

export async function handle(event: Event, context: Context) {
    return analyze(event.payload as { evidenceId: string }, context);
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
    if (start === -1 || end === -1) throw new Error('No JSON found');
    return JSON.parse(cleaned.slice(start, end + 1)) as Record<string, unknown>;
}

/**
 * Cross-Case Analyzer — detects which proceedings are affected by new evidence.
 * Reads evidence from `evidence/{id}`, cases from `cases/*`.
 * Generates action items routed to specific attorneys.
 * Writes to `cases/{evidence_id}/impacts`.
 */
export async function analyze(payload: { evidenceId: string }, context: Context) {
    const { evidenceId } = payload;
    if (!evidenceId) return { success: false, error: 'Missing evidenceId' };

    context.log({ event: 'agent_run', agent: 'cross-case-analyzer', evidence_id: evidenceId, output_cubby: 'cases' });

    const evidenceCubby = context.cubby('evidence');
    const evidence = evidenceCubby.json.get(`/${evidenceId}`) as EvidenceItem | null;
    if (!evidence) throw new Error(`Evidence ${evidenceId} not found`);

    // Read all cases from cubbies
    const casesCubby = context.cubby('cases');
    const caseKeys = casesCubby.json.keys();
    const cases: LegalCase[] = caseKeys
        .map(k => casesCubby.json.get(k) as LegalCase)
        .filter((c): c is LegalCase => c !== null);

    if (cases.length === 0) {
        context.log('No cases found — skipping cross-case analysis');
        return { success: true, impacts: [], actions: [] };
    }

    const caseList = cases.map(c =>
        `- "${c.short_name}" (${c.case_number}, ${c.jurisdiction}, ${c.case_type}) — deadline: ${c.next_deadline_desc}`
    ).join('\n');

    const systemPrompt = `You are a legal cross-case analyst. Determine which proceedings are affected by new evidence, and what attorney actions are needed.

ACTIVE CASES:
${caseList}

NEW EVIDENCE SIGNALS:
- Type: ${evidence.type}, Source: ${evidence.source} (credibility: ${evidence.source_credibility}/10)
- Entities: ${evidence.entities.join(', ')}
- Jurisdictions: ${evidence.jurisdictions.join(', ')}
- Urgency: ${evidence.urgency}/10
- Claims: ${evidence.claims_implicated.map(c => `${c.claim_id}(${c.relevance})`).join(', ')}

Return ONLY JSON:
{
  "impacts": [{"case_name": "Short Name", "impact_level": "direct"|"supporting", "reasoning": "sentence"}],
  "actions": [{"assigned_to": "Name", "firm": "Firm", "title": "action", "description": "detail", "priority": "critical"|"high"|"medium", "sla_hours": 24}]
}

Only include cases with direct or supporting impact.`;

    const response = await context.fetch(geminiEndpoint(), {
        method: 'POST',
        headers: geminiHeaders(),
        body: JSON.stringify({
            model: process.env.GEMINI_MODEL || 'gemini-2.0-flash',
            messages: [{ role: 'user', content: systemPrompt }],
            temperature: 0.2
        })
    });

    if (!response.ok) throw new Error(`Gemini API error ${response.status}`);

    const rawContent = (response.data as { choices: Array<{ message: { content: string } }> }).choices[0].message.content;
    context.log('Cross-case output:', rawContent.slice(0, 400));

    const parsed = extractJson(rawContent);

    const impacts: CaseImpact[] = ((parsed.impacts || []) as Array<{ case_name: string; impact_level: string; reasoning: string }>).map(i => {
        const matched = cases.find(c => c.short_name === i.case_name);
        return {
            case_id: matched?.id || '',
            case_name: i.case_name,
            jurisdiction: matched?.jurisdiction || '',
            impact_level: i.impact_level as 'direct' | 'supporting' | 'peripheral',
            reasoning: i.reasoning,
        };
    });

    const actions: ActionItem[] = ((parsed.actions || []) as Array<{
        assigned_to: string; firm: string; title: string; description: string; priority: string; sla_hours: number
    }>).map(a => ({
        assigned_to: a.assigned_to,
        firm: a.firm || '',
        title: a.title,
        description: a.description,
        priority: a.priority as 'critical' | 'high' | 'medium' | 'low',
        sla_hours: a.sla_hours || 48,
    }));

    // Store impacts
    const impactRecord = { evidence_id: evidenceId, impacts, actions, analyzed_at: new Date().toISOString() };
    casesCubby.json.set(`/${evidenceId}/impacts`, impactRecord);
    context.log({ event: 'cubby_write', cubby: 'cases', key: `${evidenceId}/impacts`, success: true });

    return { success: true, impacts, actions };
}
