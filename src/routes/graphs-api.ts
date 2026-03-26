/**
 * Graph data API — returns D3-ready node/link structures from cubbies.
 * Main graph: all claims + their connections
 * Claim graph: single claim + its evidence + elements + connected claims
 */

import type { Request, Response } from 'express';
import { dumpCubbies } from '../runtime.js';
import type { Claim, EvidenceItem } from '../types/index.js';

interface GraphNode {
  id: string;
  label: string;
  type: 'claim' | 'evidence' | 'element' | 'case' | 'entity';
  strength?: number;
  status?: string;
  radius?: number;
  color?: string;
}

interface GraphLink {
  source: string;
  target: string;
  strength: number;
  label?: string;
  type?: string;
}

export function mainGraph(_req: Request, res: Response) {
  const allData = dumpCubbies();

  const nodes: GraphNode[] = [];
  const links: GraphLink[] = [];
  const claims: Claim[] = [];

  // Collect all claims
  Object.entries(allData).forEach(([k, v]) => {
    if (k.startsWith('claims/') && !k.startsWith('clean/')) {
      const c = v as Claim;
      claims.push(c);
      const proven = c.elements.filter(e => e.status === 'proven').length;
      const total = c.elements.length;
      nodes.push({
        id: c.id,
        label: c.title,
        type: 'claim',
        strength: c.strength,
        status: c.status,
        radius: 8 + c.strength * 20,
        color: c.strength >= 0.9 ? '#5a8a5e' : c.strength >= 0.7 ? '#c47a4a' : '#9a9087',
      });
    }
  });

  // Collect cross-claim connections
  claims.forEach(c => {
    Object.entries(c.connected_claims || {}).forEach(([targetId, strength]) => {
      // Avoid duplicates (only add if source < target alphabetically)
      if (c.id < targetId && claims.find(cl => cl.id === targetId)) {
        links.push({
          source: c.id,
          target: targetId,
          strength: strength as number,
          type: 'claim-claim',
        });
      }
    });
  });

  res.json({ nodes, links });
}

export function claimGraph(req: Request, res: Response) {
  const claimId = req.params.id;
  const allData = dumpCubbies();

  const claim = allData['claims/' + claimId] as Claim | undefined;
  if (!claim) return res.status(404).json({ error: 'Claim not found' });

  const nodes: GraphNode[] = [];
  const links: GraphLink[] = [];

  // Center node: the claim itself
  nodes.push({
    id: claim.id,
    label: claim.title,
    type: 'claim',
    strength: claim.strength,
    radius: 24,
    color: '#c47a4a',
  });

  // Element nodes
  claim.elements.forEach(el => {
    const elId = claim.id + '/el/' + el.id;
    nodes.push({
      id: elId,
      label: el.name,
      type: 'element',
      status: el.status,
      radius: 10,
      color: el.status === 'proven' ? '#5a8a5e' : el.status === 'partial' ? '#c47a4a' : '#b84233',
    });
    links.push({
      source: claim.id,
      target: elId,
      strength: el.strength || 0.5,
      label: el.status,
      type: 'claim-element',
    });

    // Evidence nodes connected to this element
    [...el.supporting_evidence, ...el.contradicting_evidence].forEach(evId => {
      const evNodeId = 'ev/' + evId;
      if (!nodes.find(n => n.id === evNodeId)) {
        const ev = allData['evidence/' + evId] as EvidenceItem | undefined;
        nodes.push({
          id: evNodeId,
          label: ev?.title || evId,
          type: 'evidence',
          radius: 7,
          color: '#5a8a8a',
        });
      }
      links.push({
        source: elId,
        target: evNodeId,
        strength: 0.6,
        label: el.supporting_evidence.includes(evId) ? 'supports' : 'contradicts',
        type: el.supporting_evidence.includes(evId) ? 'supports' : 'contradicts',
      });
    });
  });

  // Connected claims
  Object.entries(claim.connected_claims || {}).forEach(([connId, strength]) => {
    const conn = allData['claims/' + connId] as Claim | undefined;
    if (conn) {
      const connNodeId = 'conn/' + connId;
      nodes.push({
        id: connNodeId,
        label: conn.title,
        type: 'claim',
        strength: conn.strength,
        radius: 12,
        color: '#9a9087',
      });
      links.push({
        source: claim.id,
        target: connNodeId,
        strength: strength as number,
        type: 'claim-claim',
      });
    }
  });

  // Evidence in the chain not yet connected to elements
  claim.evidence_chain.forEach(evId => {
    const evNodeId = 'ev/' + evId;
    if (!nodes.find(n => n.id === evNodeId)) {
      const ev = allData['evidence/' + evId] as EvidenceItem | undefined;
      nodes.push({
        id: evNodeId,
        label: ev?.title || evId,
        type: 'evidence',
        radius: 7,
        color: '#5a8a8a',
      });
      links.push({
        source: claim.id,
        target: evNodeId,
        strength: 0.4,
        type: 'evidence-chain',
      });
    }
  });

  // Key entities
  claim.key_entities.slice(0, 6).forEach(entity => {
    const entId = 'ent/' + entity.replace(/[^a-zA-Z0-9]/g, '-');
    nodes.push({
      id: entId,
      label: entity,
      type: 'entity',
      radius: 6,
      color: '#7a6398',
    });
    links.push({
      source: claim.id,
      target: entId,
      strength: 0.3,
      type: 'entity',
    });
  });

  res.json({ nodes, links, claim });
}
