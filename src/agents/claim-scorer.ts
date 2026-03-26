import { Event, Context, Claim, EvidenceItem, ClaimWeights, ClaimScoreRecord } from '../types/index.js';

export async function handle(event: Event, context: Context) {
    return score(event.payload as { evidenceId: string }, context);
}

/**
 * Claim Scorer — scores evidence against ALL active claims using dynamic weights.
 * Reads evidence from `evidence/{id}`, claims from `claims/*`, weights from `meta/claim_weights/default`.
 * Writes to `scores/{evidence_id}`.
 */
export async function score(payload: { evidenceId: string }, context: Context) {
    const { evidenceId } = payload;
    if (!evidenceId) return { success: false, error: 'Missing evidenceId' };

    context.log({ event: 'agent_run', agent: 'claim-scorer', evidence_id: evidenceId, output_cubby: 'scores' });

    const evidenceCubby = context.cubby('evidence');
    const evidence = evidenceCubby.json.get(`/${evidenceId}`) as EvidenceItem | null;
    if (!evidence) throw new Error(`Evidence ${evidenceId} not found`);

    // Read all active claims
    const claimsCubby = context.cubby('claims');
    const claimKeys = claimsCubby.json.keys();
    const claims: Claim[] = claimKeys
        .map(k => claimsCubby.json.get(k) as Claim)
        .filter((c): c is Claim => c !== null && (c.status === 'active' || c.status === 'proposed'));

    // Read weights
    const metaCubby = context.cubby('meta');
    const weights = (metaCubby.json.get('/claim_weights/default') || {}) as ClaimWeights;

    // Base weight for claims not in weights map
    const baseWeight = claims.length > 0 ? 1.0 / claims.length : 0.056;

    // Score each claim using evidence implication + weight boost
    const scores = evidence.claims_implicated
        .map(ci => {
            const claim = claims.find(c => c.id === ci.claim_id);
            if (!claim) return null;

            const weight = weights[ci.claim_id] ?? baseWeight;
            const boosted = Math.min(1.0, ci.relevance * (1 + (weight - baseWeight) * 10));

            // Element-level scoring: which elements does this evidence touch?
            const elementScores: Record<string, number> = {};
            for (const el of claim.elements) {
                if (el.supporting_evidence.includes(evidenceId)) {
                    elementScores[el.id] = el.strength;
                } else {
                    // Estimate from overall relevance
                    elementScores[el.id] = ci.relevance * 0.5;
                }
            }

            return {
                claim_id: ci.claim_id,
                element_scores: elementScores,
                overall: parseFloat(boosted.toFixed(3)),
                reasoning: ci.reasoning,
            };
        })
        .filter((s): s is NonNullable<typeof s> => s !== null)
        .sort((a, b) => b.overall - a.overall);

    const scoreRecord: ClaimScoreRecord = {
        evidence_id: evidenceId,
        scores,
        weights_used: weights,
        timestamp: new Date().toISOString(),
    };

    const scoresCubby = context.cubby('scores');
    scoresCubby.json.set(`/${evidenceId}`, scoreRecord);
    context.log({ event: 'cubby_write', cubby: 'scores', key: evidenceId, success: true });
    context.log(`Scored ${scores.length} claims. Top: ${scores[0]?.claim_id} (${scores[0]?.overall})`);

    return { success: true, scoreRecord };
}
