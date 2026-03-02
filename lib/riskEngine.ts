// lib/riskEngine.ts
// Mock risk scoring logic — swap calculateRisk() with real API call later

import type { GraphNode, GraphEdge, RiskLevel } from './mockData';
import { FRAUD_CLUSTER_IDS } from './mockData';

export interface RiskScore {
    value: number;         // 0.0 - 1.0
    percentage: number;   // 0 - 100
    label: RiskLevel;
    explanations: string[];
}

export interface NodeRiskContext {
    node: GraphNode;
    connectedEdges: GraphEdge[];
    allNodes: GraphNode[];
}

const EXPLANATIONS_HIGH = [
    'Connected to suspicious fraud cluster',
    'Unusual transaction velocity detected',
    'Shared device fingerprint identified',
    'Multi-hop connection to flagged entity',
    'Rapid fund movement across accounts',
    'Circular transaction pattern detected',
];

const EXPLANATIONS_MEDIUM = [
    'Indirect link to suspicious cluster',
    'Elevated transaction frequency',
    'Transaction amount exceeds baseline',
    'Connected to medium-risk entity',
];

const EXPLANATIONS_LOW = [
    'No direct connections to flagged nodes',
    'Transaction patterns within normal range',
    'No shared device identifiers found',
];

function scoreFraudCluster(node: GraphNode, edges: GraphEdge[], allNodes: GraphNode[]): number {
    if (FRAUD_CLUSTER_IDS.includes(node.id)) return 0.82 + Math.random() * 0.15;

    // Check if connected to fraud
    const connectedIds = edges
        .filter(e => e.source === node.id || e.target === node.id)
        .flatMap(e => [e.source, e.target])
        .filter(id => id !== node.id);

    const hasFraudNeighbor = connectedIds.some(id => FRAUD_CLUSTER_IDS.includes(id));
    if (hasFraudNeighbor) return 0.45 + Math.random() * 0.25;

    return 0.05 + Math.random() * 0.2;
}

function getLabelFromScore(score: number): RiskLevel {
    if (score >= 0.65) return 'high';
    if (score >= 0.35) return 'medium';
    return 'low';
}

function pickExplanations(label: RiskLevel): string[] {
    const pool =
        label === 'high'
            ? EXPLANATIONS_HIGH
            : label === 'medium'
                ? EXPLANATIONS_MEDIUM
                : EXPLANATIONS_LOW;

    const count = label === 'high' ? 4 : label === 'medium' ? 3 : 2;
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
}

/**
 * Calculates a mock risk score for a given node.
 * Replace this function body with a real API call in production.
 */
export function calculateRisk(ctx: NodeRiskContext): RiskScore {
    const { node, connectedEdges, allNodes } = ctx;
    const rawScore = scoreFraudCluster(node, connectedEdges, allNodes);
    const value = Math.min(1, Math.max(0, rawScore));
    const label = getLabelFromScore(value);

    return {
        value,
        percentage: Math.round(value * 100),
        label,
        explanations: pickExplanations(label),
    };
}

export function getDefaultRiskScore(): RiskScore {
    return {
        value: 0,
        percentage: 0,
        label: 'low',
        explanations: ['Select a node on the graph to analyze its risk profile.'],
    };
}
