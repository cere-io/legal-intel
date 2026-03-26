// === CEF Runtime Interfaces (identical to HiringPipeline) ===

export interface Event {
    id: string;
    event_type: string;
    app_id: string;
    account_id: string;
    timestamp: string;
    payload: unknown;
    signature: string;
    context_path: {
        agent_service: string;
        workspace: string;
        stream?: string;
    };
}

export interface Context {
    log(...args: unknown[]): void;
    emit(eventType: string, payload: object, targetId?: string): void;
    fetch(url: string, options?: RequestInit): Promise<FetchResponse>;
    agents: Record<string, { [method: string]: (payload: unknown) => Promise<unknown> }>;
    cubby(name: string): CubbyClient;
}

export interface FetchResponse {
    ok: boolean;
    status: number;
    data: Record<string, unknown>;
}

export interface CubbyClient {
    json: {
        get(path: string): unknown;
        set(path: string, value: unknown, opts?: unknown): void;
        delete(path: string): void;
        exists(path: string): boolean;
        mget(paths: string[]): Record<string, unknown>;
        mset(items: Record<string, unknown>, opts?: unknown): void;
        keys(pattern?: string): string[];
        incr(path: string, delta?: number): number;
    };
    vector: {
        createIndex(): void;
        add(id: string, embedding: number[], metadata?: Record<string, unknown>): void;
        search(embedding: number[], opts?: unknown): VectorMatch[];
        get(id: string): unknown;
        delete(id: string): void;
        exists(id: string): boolean;
        count(): number;
    };
}

export interface VectorMatch {
    id: string;
    score: number;
    metadata?: Record<string, unknown>;
}

// === Claim Intelligence Engine Domain Types ===

/** A legal element within a claim */
export interface ClaimElement {
    id: string;
    name: string;
    description: string;
    status: 'unproven' | 'partial' | 'proven';
    supporting_evidence: string[];
    contradicting_evidence: string[];
    gap_description?: string;
    strength: number;
}

/** A dynamic claim node — the core entity */
export interface Claim {
    id: string;
    title: string;
    template_id: string;
    status: 'proposed' | 'active' | 'rejected' | 'merged';
    proposed_by: string;
    confirmed_by?: string;
    elements: ClaimElement[];
    connected_claims: Record<string, number>;
    evidence_chain: string[];
    strength: number;
    key_entities: string[];
    jurisdictions: string[];
    current_understanding: string;
    evolution_log: Array<{ date: string; delta: string; evidence_id?: string }>;
    created_at: string;
    updated_at: string;
}

/** Claim template — defines element structure for a claim type */
export interface ClaimTemplate {
    id: string;
    name: string;
    description: string;
    elements: Array<{ id: string; name: string; description: string }>;
    typical_evidence_types: string[];
}

/** Dynamic claim weights — keys are claim IDs, sum to 1.0 */
export interface ClaimWeights {
    [claim_id: string]: number;
}

/** Evidence item stored in cubby */
export interface EvidenceItem {
    id: string;
    type: string;
    title: string;
    source: string;
    source_credibility: number;
    content_hash: string;
    content?: string;
    jurisdictions: string[];
    entities: string[];
    urgency: number;
    claims_implicated: Array<{ claim_id: string; relevance: number; reasoning: string }>;
    extracted_at: string;
}

/** Score record per evidence item */
export interface ClaimScoreRecord {
    evidence_id: string;
    scores: Array<{
        claim_id: string;
        element_scores: Record<string, number>;
        overall: number;
        reasoning: string;
    }>;
    weights_used: ClaimWeights;
    timestamp: string;
}

/** Case stored in cubby */
export interface LegalCase {
    id: string;
    case_number: string;
    short_name: string;
    jurisdiction: string;
    court: string;
    filed_date: string;
    status: string;
    case_type: string;
    next_deadline: string;
    next_deadline_desc: string;
    connected_claims: string[];
    participants: Array<{ name: string; role: string; firm?: string }>;
}

/** Case impact from cross-case analysis */
export interface CaseImpact {
    case_id: string;
    case_name: string;
    jurisdiction: string;
    impact_level: 'direct' | 'supporting' | 'peripheral';
    reasoning: string;
}

/** Action item routed to attorney */
export interface ActionItem {
    assigned_to: string;
    firm: string;
    title: string;
    description: string;
    priority: 'critical' | 'high' | 'medium' | 'low';
    sla_hours: number;
}

/** Attorney feedback */
export interface AttorneyFeedback {
    evidence_id: string;
    assessor: string;
    impact_rating: number;
    useful: boolean;
    admissible: boolean;
    notes: string;
    assessed_at: string;
}

// === Event Payloads ===

export interface NewEvidencePayload {
    evidenceId: string;
    evidenceType: string;
    source: string;
    content: string;
    tab: string;
}

export interface SSEEvent {
    type: string;
    data: unknown;
}
