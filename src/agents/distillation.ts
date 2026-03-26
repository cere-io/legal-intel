import { Event, Context, ClaimWeights, EvidenceItem, Claim } from '../types/index.js';

export async function handle(event: Event, context: Context) {
    return distill(event.payload as { evidenceId: string; assessor: string; impactRating: number; useful: boolean; admissible: boolean; notes: string }, context);
}

const MAX_DELTA = 0.03;

/** Normalize dynamic weights to sum to 1.0 */
function normalize(w: ClaimWeights): ClaimWeights {
    const keys = Object.keys(w);
    const sum = keys.reduce((acc, k) => acc + (w[k] ?? 0), 0);
    if (sum === 0 || keys.length === 0) return w;
    const result: ClaimWeights = {};
    for (const k of keys) {
        result[k] = parseFloat(((w[k] ?? 0) / sum).toFixed(6));
    }
    return result;
}

/**
 * Distillation Agent — updates claim weights based on attorney feedback.
 * High impact (>=7): boost weights for claims this evidence scored well on.
 * Low impact (<=4): penalize those claim weights.
 * Also records feedback in `outcomes/{evidence_id}`.
 */
export async function distill(
    payload: { evidenceId: string; assessor: string; impactRating: number; useful: boolean; admissible: boolean; notes: string },
    context: Context
) {
    const { evidenceId, assessor, impactRating, useful, admissible, notes } = payload;
    if (!evidenceId || !assessor || impactRating === undefined) {
        return { success: false, error: 'Missing required fields' };
    }

    context.log({ event: 'agent_run', agent: 'distillation', evidence_id: evidenceId, output_cubby: 'meta' });

    // Record outcome
    const outcomesCubby = context.cubby('outcomes');
    outcomesCubby.json.set(`/${evidenceId}`, {
        assessor, impact_rating: impactRating, useful, admissible, notes,
        timestamp: new Date().toISOString(),
    });
    context.log({ event: 'cubby_write', cubby: 'outcomes', key: evidenceId, success: true });

    // Read evidence signals
    const evidenceCubby = context.cubby('evidence');
    const evidence = evidenceCubby.json.get(`/${evidenceId}`) as EvidenceItem | null;
    if (!evidence) return { success: false, error: 'Evidence not found' };

    // Read current weights
    const metaCubby = context.cubby('meta');
    const currentWeights = (metaCubby.json.get('/claim_weights/default') || {}) as ClaimWeights;
    const oldWeights = { ...currentWeights };

    // Adjust weights based on feedback
    for (const ci of evidence.claims_implicated) {
        const key = ci.claim_id;
        if (!(key in currentWeights)) continue;

        if (impactRating >= 7) {
            const boost = Math.min(MAX_DELTA, ci.relevance * 0.02);
            currentWeights[key] = (currentWeights[key] ?? 0.056) + boost;
        } else if (impactRating <= 4) {
            const penalty = Math.min(MAX_DELTA, ci.relevance * 0.015);
            currentWeights[key] = Math.max(0.01, (currentWeights[key] ?? 0.056) - penalty);
        }
    }

    const newWeights = normalize(currentWeights);
    metaCubby.json.set('/claim_weights/default', newWeights);

    // Log weight changes
    const changes: Record<string, { old: number; new: number }> = {};
    for (const k of Object.keys(newWeights)) {
        const diff = Math.abs((newWeights[k] ?? 0) - (oldWeights[k] ?? 0));
        if (diff > 0.001) {
            changes[k] = { old: oldWeights[k] ?? 0, new: newWeights[k] ?? 0 };
        }
    }

    context.log({ event: 'weight_update', changes, triggered_by: `${assessor}:${evidenceId}` });
    context.log({ event: 'attorney_feedback', evidence_id: evidenceId, ai_score: evidence.claims_implicated[0]?.relevance ?? 0, attorney_assessment: impactRating });

    return { success: true, old_weights: oldWeights, new_weights: newWeights, changes };
}
