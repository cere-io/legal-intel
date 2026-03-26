import { Event, Context, Claim, EvidenceItem, ClaimTemplate } from '../types/index.js';

export async function handle(event: Event, context: Context) {
    return propose(event.payload as { evidenceId: string }, context);
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

function extractJson(raw: string): unknown {
    const cleaned = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start === -1 || end === -1) throw new Error('No JSON found in claim proposer output');
    return JSON.parse(cleaned.slice(start, end + 1));
}

/**
 * Claim Proposer Agent — the key innovation with no hiring pipeline equivalent.
 *
 * Reads evidence signals from `evidence/{id}`.
 * Reads all existing claims from `claims/*`.
 * Reads templates from `templates/*`.
 * Decides: enrich existing claims OR propose new claims.
 * All proposals start as status: 'proposed'.
 *
 * Writes to: `claims/{id}` (enrichments and new proposals)
 */
export async function propose(payload: { evidenceId: string; rawContent?: string }, context: Context) {
    const { evidenceId, rawContent } = payload;
    if (!evidenceId) return { success: false, error: 'Missing evidenceId' };

    context.log({ event: 'agent_run', agent: 'claim-proposer', evidence_id: evidenceId, input_source: 'evidence', output_cubby: 'claims' });

    // Read evidence signals
    const evidenceCubby = context.cubby('evidence');
    const evidence = evidenceCubby.json.get(`/${evidenceId}`) as EvidenceItem | null;
    if (!evidence) throw new Error(`Evidence ${evidenceId} not found in cubby`);

    // Read all existing claims
    const claimsCubby = context.cubby('claims');
    const claimKeys = claimsCubby.json.keys();
    const existingClaims: Claim[] = claimKeys
        .map(k => claimsCubby.json.get(k) as Claim)
        .filter((c): c is Claim => c !== null && c.status !== 'rejected');

    // Read all templates
    const templatesCubby = context.cubby('templates');
    const templateKeys = templatesCubby.json.keys();
    const templates: ClaimTemplate[] = templateKeys
        .map(k => templatesCubby.json.get(k) as ClaimTemplate)
        .filter((t): t is ClaimTemplate => t !== null);

    context.log(`Analyzing evidence ${evidenceId} against ${existingClaims.length} existing claims and ${templates.length} templates`);

    // Build prompt
    const claimSummaries = existingClaims.map(c => {
        const elementStatus = c.elements.map(e => `${e.id}:${e.status}`).join(', ');
        return `- ${c.id}: "${c.title}" (strength: ${c.strength}, elements: [${elementStatus}])`;
    }).join('\n');

    const templateSummaries = templates.map(t =>
        `- ${t.id}: "${t.name}" — elements: [${t.elements.map(e => e.id).join(', ')}]`
    ).join('\n');

    // Prioritize claims that the Evidence Extractor flagged as relevant — but include MORE for cross-claim analysis
    const implicated = new Set(evidence.claims_implicated.map(c => c.claim_id));
    const prioritized = [
        ...existingClaims.filter(c => implicated.has(c.id)),
        ...existingClaims.filter(c => !implicated.has(c.id)).slice(0, 8),
    ].slice(0, 14);

    const claimDetails = prioritized.map(c => {
        const elDetail = c.elements.map(e => `    - ${e.name}: ${e.status}${e.gap_description ? ' (GAP: ' + e.gap_description + ')' : ''}`).join('\n');
        return `${implicated.has(c.id) ? '>>> DIRECTLY RELEVANT: ' : ''}${c.id}: "${c.title}" (strength: ${Math.round(c.strength * 100)}%)\n  Current understanding: ${c.current_understanding.slice(0, 300)}...\n  Elements:\n${elDetail}`;
    }).join('\n\n');

    const systemPrompt = `You are an elite legal analyst working on a multi-jurisdictional fraud case involving 18 crime categories. New evidence has arrived. Your job is to analyze its SPECIFIC LEGAL IMPLICATIONS for EVERY claim it could affect — not just the obvious ones.

CRITICAL: A single piece of evidence often impacts 5-8+ claims. For example, an email about a CEO confirming no lawsuit authorization affects:
- The direct victim claim (token theft)
- The criminal syndicate claim (manipulating parties)
- The identity fraud claim (false representation)
- The embezzlement claim (corroborating fund diversion)
- The fabrication claim (pattern of deception)
Think BROADLY. If the evidence mentions ANY entity, fact, or pattern relevant to a claim — enrich it.

Do NOT say "corroborates findings" or "provides further context." Instead, explain EXACTLY what this evidence changes:
- Which legal elements are now stronger or proven?
- Which gaps are now closed?
- What new legal theories does this open?
- What specific entities, dates, or facts from the evidence matter and why?

EXISTING CLAIMS (with current element status):
${claimDetails || '(NONE — this is a fresh case. You MUST propose at least 1 new claim from the templates below.)'}

AVAILABLE CLAIM TEMPLATES (use these to propose NEW claims):
${templateSummaries || '(no templates available)'}

RAW EVIDENCE CONTENT:
${rawContent ? rawContent.slice(0, 4000) : `Type: ${evidence.type}, Source: ${evidence.source}, Entities: ${evidence.entities.join(', ')}, Claims: ${evidence.claims_implicated.map(c => c.claim_id).join(', ')}`}

Return ONLY this JSON:
{
  "enrichments": [
    {
      "claim_id": "existing-claim-id",
      "element_updates": [
        { "element_id": "element-id", "new_status": "proven"|"partial", "reasoning": "SPECIFIC explanation of what this evidence proves for this element — name entities, cite facts from the evidence" }
      ],
      "strength_delta": 0.05,
      "understanding_update": "A DETAILED paragraph (3-5 sentences) explaining exactly what this evidence means for this claim. Name specific people, dates, facts. Explain the legal significance. Do NOT be generic.",
      "new_connections": { "other-claim-id": 0.85 }
    }
  ],
  "proposals": [
    {
      "id": "new-claim-id",
      "title": "Human-readable claim title",
      "template_id": "which-template-to-use",
      "reasoning": "DETAILED explanation of the new legal theory this evidence introduces",
      "initial_strength": 0.25,
      "key_entities": ["Entity1"],
      "jurisdictions": ["NDCA"]
    }
  ]
}

CRITICAL RULES:
- If there are NO existing claims, you MUST propose at least 1 new claim using the templates above. Pick the template that best matches the evidence.
- For proposals: "id" should be a lowercase-hyphenated slug (e.g., "embezzlement", "forgery"). "template_id" must match an available template.
- understanding_update MUST be 3-5 specific sentences. Generic one-liners will be rejected.
- element_updates reasoning MUST reference specific facts from the evidence
- If evidence mentions an entity taking an action, NAME the entity and the action
- Think like a litigation attorney: what does this mean for my case SPECIFICALLY?`;

    const response = await context.fetch(geminiEndpoint(), {
        method: 'POST',
        headers: geminiHeaders(),
        body: JSON.stringify({
            model: 'gemini-2.5-flash',
            messages: [{ role: 'user', content: systemPrompt }],
            temperature: 0.2,
        }),
    });

    if (!response.ok) {
        throw new Error(`Gemini API error ${response.status}`);
    }

    const llmContent = (response.data as { choices: Array<{ message: { content: string } }> }).choices[0].message.content;
    context.log('LLM Claim Proposer output:', llmContent.slice(0, 500));

    const result = extractJson(llmContent) as {
        enrichments: Array<{
            claim_id: string;
            element_updates: Array<{ element_id: string; new_status: string; reasoning: string }>;
            strength_delta: number;
            understanding_update: string;
            new_connections?: Record<string, number>;
        }>;
        proposals: Array<{
            id: string;
            title: string;
            template_id: string;
            reasoning: string;
            initial_strength: number;
            key_entities: string[];
            jurisdictions: string[];
        }>;
    };

    const enrichments: Array<{ claim_id: string; changes: string }> = [];
    const proposals: Claim[] = [];

    // Process enrichments
    for (const enrichment of (result.enrichments || [])) {
        const existing = existingClaims.find(c => c.id === enrichment.claim_id);
        if (!existing) continue;

        const updated = { ...existing };

        // Update elements
        for (const eu of (enrichment.element_updates || [])) {
            const el = updated.elements.find(e => e.id === eu.element_id);
            if (el && (eu.new_status === 'proven' || eu.new_status === 'partial')) {
                el.status = eu.new_status as 'proven' | 'partial';
                if (!el.supporting_evidence.includes(evidenceId)) {
                    el.supporting_evidence.push(evidenceId);
                }
                if (eu.new_status === 'proven') el.gap_description = undefined;
            }
        }

        // Update strength
        updated.strength = Math.min(1.0, updated.strength + (enrichment.strength_delta || 0));

        // Update evidence chain
        if (!updated.evidence_chain.includes(evidenceId)) {
            updated.evidence_chain.push(evidenceId);
        }

        // Update connections
        if (enrichment.new_connections) {
            for (const [connId, connStrength] of Object.entries(enrichment.new_connections)) {
                updated.connected_claims[connId] = Math.max(updated.connected_claims[connId] || 0, connStrength);
            }
        }

        // Update understanding
        if (enrichment.understanding_update) {
            updated.current_understanding += ` [UPDATED ${new Date().toISOString().split('T')[0]}]: ${enrichment.understanding_update}`;
        }

        // Add to evolution log
        updated.evolution_log.push({
            date: new Date().toISOString().split('T')[0],
            delta: enrichment.understanding_update || 'Evidence enriched claim',
            evidence_id: evidenceId,
        });

        updated.updated_at = new Date().toISOString();

        // Write back to cubby
        claimsCubby.json.set(`/${updated.id}`, updated);
        context.log({ event: 'cubby_write', cubby: 'claims', key: updated.id, success: true });
        enrichments.push({ claim_id: updated.id, changes: enrichment.understanding_update || '' });
    }

    // Process proposals
    for (const proposal of (result.proposals || [])) {
        const template = templates.find(t => t.id === proposal.template_id);
        if (!template) {
            context.log(`Template ${proposal.template_id} not found, skipping proposal ${proposal.id}`);
            continue;
        }

        const newClaim: Claim = {
            id: proposal.id,
            title: proposal.title,
            template_id: proposal.template_id,
            status: 'proposed',
            proposed_by: 'ai',
            elements: template.elements.map(te => ({
                id: te.id,
                name: te.name,
                description: te.description,
                status: 'unproven' as const,
                supporting_evidence: [],
                contradicting_evidence: [],
                gap_description: `No evidence yet for: ${te.description}`,
                strength: 0,
            })),
            connected_claims: {},
            evidence_chain: [evidenceId],
            strength: proposal.initial_strength || 0.25,
            key_entities: proposal.key_entities || evidence.entities,
            jurisdictions: proposal.jurisdictions || evidence.jurisdictions,
            current_understanding: proposal.reasoning,
            evolution_log: [{
                date: new Date().toISOString().split('T')[0],
                delta: `Proposed by AI based on evidence ${evidenceId}: ${proposal.reasoning}`,
                evidence_id: evidenceId,
            }],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        };

        claimsCubby.json.set(`/${newClaim.id}`, newClaim);
        context.log({ event: 'cubby_write', cubby: 'claims', key: newClaim.id, success: true });
        proposals.push(newClaim);
    }

    context.log(`Claim Proposer complete: ${enrichments.length} enrichments, ${proposals.length} proposals`);

    return {
        success: true,
        enrichments,
        proposals,
    };
}
