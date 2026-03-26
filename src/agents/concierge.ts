import { Event, Context, NewEvidencePayload } from '../types/index.js';
import { extract } from './evidence-extractor.js';
import { propose } from './claim-proposer.js';
import { score } from './claim-scorer.js';
import { analyze } from './cross-case-analyzer.js';

/**
 * Concierge — orchestrates the 4-step evidence processing pipeline.
 * Pipeline: Evidence Extractor → Claim Proposer → Claim Scorer → Cross-Case Analyzer
 */
export async function handle(event: Event, context: Context) {
    const { event_type, payload } = event;

    if (event_type !== 'NEW_EVIDENCE') {
        return { success: false, error: `Unsupported event type: ${event_type}` };
    }

    const { evidenceId, evidenceType, source, content } = payload as NewEvidencePayload;
    if (!evidenceId || !content || !source) {
        return { success: false, error: 'Missing evidenceId, content, or source' };
    }

    context.log('[CONCIERGE] NEW_EVIDENCE → dispatching to 4 agents');
    context.log('[CONCIERGE] Evidence:', evidenceId, '| Type:', evidenceType);

    try {
        // Step 1: Extract evidence signals
        context.log('[CONCIERGE] → Evidence Extractor');
        const extractResult = await extract({ evidenceId, evidenceType, source, content }, context) as {
            success: boolean; error?: string; signal?: unknown;
        };
        if (!extractResult.success) throw new Error(`Extraction failed: ${extractResult.error}`);

        // Step 2: Propose/enrich claims
        context.log('[CONCIERGE] → Claim Proposer');
        const proposeResult = await propose({ evidenceId, rawContent: content }, context) as {
            success: boolean; error?: string;
            enrichments?: Array<{ claim_id: string; changes: string }>;
            proposals?: Array<{ id: string; title: string; status: string }>;
        };
        if (!proposeResult.success) throw new Error(`Proposal failed: ${proposeResult.error}`);

        // Step 3: Score against all claims
        context.log('[CONCIERGE] → Claim Scorer');
        const scoreResult = await score({ evidenceId }, context) as {
            success: boolean; error?: string; scoreRecord?: unknown;
        };
        if (!scoreResult.success) throw new Error(`Scoring failed: ${scoreResult.error}`);

        // Step 4: Cross-case analysis
        context.log('[CONCIERGE] → Cross-Case Analyzer');
        const analyzeResult = await analyze({ evidenceId }, context) as {
            success: boolean; error?: string;
            impacts?: Array<{ case_name: string; impact_level: string; reasoning: string }>;
            actions?: Array<{ assigned_to: string; firm: string; title: string; description: string; priority: string; sla_hours: number }>;
        };
        if (!analyzeResult.success) throw new Error(`Analysis failed: ${analyzeResult.error}`);

        context.log('[CONCIERGE] Pipeline complete for', evidenceId);

        return {
            success: true,
            evidenceId,
            signal: extractResult.signal,
            enrichments: proposeResult.enrichments || [],
            proposals: proposeResult.proposals || [],
            scores: scoreResult.scoreRecord,
            impacts: analyzeResult.impacts || [],
            actions: analyzeResult.actions || [],
        };

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        context.log('[CONCIERGE] Pipeline failed:', message);
        return { success: false, error: message };
    }
}
