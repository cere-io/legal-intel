import { Event, Context, CrimeWeights, CrimeScoreRecord, EvidenceSignal, CrimeImplication } from '../types/index.js';

export async function handle(event: Event, context: Context) {
    return score(event.payload as { evidenceId: string }, context);
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
    if (start === -1 || end === -1) throw new Error('No JSON found in scorer output');
    return JSON.parse(cleaned.slice(start, end + 1)) as Record<string, unknown>;
}

const CRIME_KEYS: (keyof CrimeWeights)[] = [
    'fabrication', 'grand_theft', 'aliases', 'market_manipulation', 'taint',
    'confrontation', 'reputation', 'intimidation', 'term_sheet', 'confession',
    'board_investigation', 'embezzlement', 'evidence_destruction', 'digital_seizure',
    'ponzi_laundering', 'vivian_theft', 'syndicate', 'broker_dealer'
];

const DEFAULT_WEIGHTS: CrimeWeights = {
    fabrication: 0.056, grand_theft: 0.056, aliases: 0.056, market_manipulation: 0.056,
    taint: 0.056, confrontation: 0.056, reputation: 0.056, intimidation: 0.056,
    term_sheet: 0.056, confession: 0.056, board_investigation: 0.056, embezzlement: 0.056,
    evidence_destruction: 0.056, digital_seizure: 0.056, ponzi_laundering: 0.056,
    vivian_theft: 0.056, syndicate: 0.056, broker_dealer: 0.048
};

const CRIME_CODE_MAP: Record<string, keyof CrimeWeights> = {
    'C-FABRICATION': 'fabrication', 'C-GRAND-THEFT': 'grand_theft', 'C-ALIASES': 'aliases',
    'C-MARKET-MANIP': 'market_manipulation', 'C-TAINT': 'taint', 'C-CONFRONTATION': 'confrontation',
    'C-REPUTATION': 'reputation', 'C-INTIMIDATION': 'intimidation', 'C-TERM-SHEET': 'term_sheet',
    'C-CONFESSION': 'confession', 'C-BOARD-INVEST': 'board_investigation', 'C-EMBEZZLEMENT': 'embezzlement',
    'C-DESTRUCTION': 'evidence_destruction', 'C-DIGITAL-SEIZE': 'digital_seizure',
    'C-PONZI': 'ponzi_laundering', 'C-VIVIAN-THEFT': 'vivian_theft', 'C-SYNDICATE': 'syndicate',
    'C-BROKER-DEALER': 'broker_dealer'
};

/**
 * Score evidence against all 18 crime categories using dynamic weights.
 * Reads evidence signals from `legal-evidence`, weights from `legal-meta`.
 * Writes to `legal-scores` cubby at `/{evidence_id}`.
 */
export async function score(payload: { evidenceId: string }, context: Context) {
    const { evidenceId } = payload;

    if (!evidenceId) {
        return { success: false, error: 'Missing evidenceId' };
    }

    context.log({ event: 'agent_run', agent: 'crime-scorer', evidence_id: evidenceId, input_source: 'legal-evidence', output_cubby: 'legal-scores' });

    const evidenceCubby = context.cubby('legal-evidence');
    const signal = evidenceCubby.json.get(`/${evidenceId}`) as EvidenceSignal | undefined;
    if (!signal) throw new Error(`Evidence signals not found for ${evidenceId}`);

    const metaCubby = context.cubby('legal-meta');
    let weights = metaCubby.json.get('/crime_weights/default') as CrimeWeights | undefined;

    if (!weights) {
        context.log('No crime weights found, initialising defaults (uniform distribution)');
        weights = { ...DEFAULT_WEIGHTS };
        metaCubby.json.set('/crime_weights/default', weights);
    }

    // Build weighted scores: combine extractor signals with weight adjustments
    const weightedScores: CrimeImplication[] = signal.crimes_implicated.map(ci => {
        const weightKey = CRIME_CODE_MAP[ci.crime_code];
        const weight = weightKey ? weights![weightKey] : 0.056;
        // Weighted score = raw relevance * (1 + weight boost factor)
        const boostedScore = Math.min(1.0, ci.relevance * (1 + (weight - 0.056) * 10));
        return {
            crime_code: ci.crime_code,
            relevance: parseFloat(boostedScore.toFixed(3)),
            reasoning: ci.reasoning,
        };
    }).sort((a, b) => b.relevance - a.relevance);

    context.log('Weighted scores:', JSON.stringify(weightedScores.slice(0, 5).map(s => `${s.crime_code}: ${s.relevance}`)));

    const scoreRecord: CrimeScoreRecord = {
        id: evidenceId,
        scores: weightedScores,
        weights_used: weights,
        timestamp: new Date().toISOString(),
    };

    const scoresCubby = context.cubby('legal-scores');
    scoresCubby.json.set(`/${evidenceId}`, scoreRecord);
    context.log({ event: 'cubby_write', cubby: 'legal-scores', key: evidenceId, success: true });

    return { success: true, scoreRecord };
}
