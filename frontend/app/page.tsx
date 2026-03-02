'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Sidebar from '@/components/Sidebar';
import TransactionFeed from '@/components/TransactionFeed';
import GraphView from '@/components/GraphView';
import RiskPanel from '@/components/RiskPanel';
import MetricsFooter from '@/components/MetricsFooter';
import PipelineStatusBar from '@/components/PipelineStatusBar';

import type { Transaction, GraphNode, GraphEdge } from '@/lib/mockData';
import { FRAUD_CLUSTER_IDS } from '@/lib/mockData';
import { calculateRisk, getDefaultRiskScore, type RiskScore } from '@/lib/riskEngine';
import {
    fetchTransactions,
    fetchGraphData,
    mapApiTransaction,
    type StoredTransaction,
} from '@/lib/api';

const MAX_TRANSACTIONS = 50;

export default function DashboardPage() {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [nodes, setNodes] = useState<GraphNode[]>([]);
    const [edges, setEdges] = useState<GraphEdge[]>([]);
    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
    const [riskScore, setRiskScore] = useState<RiskScore>(getDefaultRiskScore());

    // Set initial dark class
    useEffect(() => {
        document.documentElement.classList.add('dark');
    }, []);

    // ── Fetch initial data from backend ──
    useEffect(() => {
        (async () => {
            try {
                const [txRes, graphRes] = await Promise.all([
                    fetchTransactions(MAX_TRANSACTIONS),
                    fetchGraphData(),
                ]);
                setTransactions(txRes.transactions.map(mapApiTransaction));
                setNodes(graphRes.nodes as GraphNode[]);
                setEdges(graphRes.edges as GraphEdge[]);
            } catch (e) {
                console.error('[Quantora] Failed to fetch initial data:', e);
            }
        })();
    }, []);

    // Node selection handler
    const handleNodeSelect = useCallback(
        (nodeId: string) => {
            const id = nodeId || null;
            setSelectedNodeId(id);

            if (!id) {
                setRiskScore(getDefaultRiskScore());
                return;
            }

            const node = nodes.find(n => n.id === id);
            if (!node) return;

            const connectedEdges = edges.filter(e => e.source === id || e.target === id);
            const score = calculateRisk({ node, connectedEdges, allNodes: nodes });
            setRiskScore(score);
        },
        [nodes, edges]
    );

    // ── Poll backend for new transactions (ingested from Bank CBS feed) ──
    useEffect(() => {
        const interval = setInterval(async () => {
            try {
                const txRes = await fetchTransactions(MAX_TRANSACTIONS);
                setTransactions(txRes.transactions.map(mapApiTransaction));
            } catch (e) {
                console.error('[Quantora] Failed to fetch transactions:', e);
            }
        }, 3000);

        return () => clearInterval(interval);
    }, []);

    // ── Refresh graph data every 5 seconds ──
    useEffect(() => {
        const interval = setInterval(async () => {
            try {
                const graphRes = await fetchGraphData();
                setNodes(graphRes.nodes as GraphNode[]);
                setEdges(graphRes.edges as GraphEdge[]);
            } catch { /* silent */ }
        }, 5000);

        return () => clearInterval(interval);
    }, []);

    // Derived metrics
    const activeAlerts = useMemo(
        () => transactions.filter(t => t.risk === 'high').length,
        [transactions]
    );

    const selectedNode = useMemo(
        () => (selectedNodeId ? nodes.find(n => n.id === selectedNodeId) ?? null : null),
        [selectedNodeId, nodes]
    );

    return (
        <div className="flex h-screen overflow-hidden bg-[var(--bg)]">
            <Sidebar />

            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Pipeline status bar — Bank CBS → SAGRA → Dashboard */}
                <PipelineStatusBar />

                {/* 3-column dashboard */}
                <main className="flex flex-1 overflow-hidden">
                    {/* Left: Transaction Feed — 25% */}
                    <section className="w-1/4 border-r border-[var(--border)] flex flex-col overflow-hidden">
                        <TransactionFeed transactions={transactions} />
                    </section>

                    {/* Center: Network Graph — 50% */}
                    <section className="w-1/2 flex flex-col overflow-hidden">
                        <GraphView
                            nodes={nodes}
                            edges={edges}
                            selectedNodeId={selectedNodeId}
                            onNodeSelect={handleNodeSelect}
                        />
                    </section>

                    {/* Right: Risk Panel — 25% */}
                    <section className="w-1/4 border-l border-[var(--border)] flex flex-col overflow-hidden">
                        <RiskPanel selectedNode={selectedNode} riskScore={riskScore} />
                    </section>
                </main>

                {/* Footer metrics strip */}
                <MetricsFooter
                    totalTransactions={transactions.length + 94832}
                    activeAlerts={activeAlerts}
                    suspiciousClusters={1}
                />
            </div>
        </div>
    );
}
