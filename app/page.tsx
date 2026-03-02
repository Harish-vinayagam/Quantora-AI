'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Navbar from '@/components/Navbar';
import TransactionFeed from '@/components/TransactionFeed';
import GraphView from '@/components/GraphView';
import RiskPanel from '@/components/RiskPanel';
import MetricsFooter from '@/components/MetricsFooter';

import {
    initialTransactions,
    initialNodes,
    initialEdges,
    generateNewTransaction,
    generateNewEdge,
    type Transaction,
    type GraphNode,
    type GraphEdge,
} from '@/lib/mockData';

import { calculateRisk, getDefaultRiskScore, type RiskScore } from '@/lib/riskEngine';

const MAX_TRANSACTIONS = 50;

export default function DashboardPage() {
    const [theme, setTheme] = useState<'dark' | 'light'>('dark');
    const [transactions, setTransactions] = useState<Transaction[]>(initialTransactions);
    const [nodes, setNodes] = useState<GraphNode[]>(initialNodes);
    const [edges, setEdges] = useState<GraphEdge[]>(initialEdges);
    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
    const [riskScore, setRiskScore] = useState<RiskScore>(getDefaultRiskScore());

    // Theme toggle
    const toggleTheme = useCallback(() => {
        setTheme(t => {
            const next = t === 'dark' ? 'light' : 'dark';
            document.documentElement.classList.toggle('dark', next === 'dark');
            return next;
        });
    }, []);

    // Set initial dark class
    useEffect(() => {
        document.documentElement.classList.add('dark');
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

    // 3-second interval: add transaction + edge + update risk panel
    useEffect(() => {
        const interval = setInterval(() => {
            const newTx = generateNewTransaction();
            const newEdge = generateNewEdge(newTx);

            setTransactions(prev => [newTx, ...prev].slice(0, MAX_TRANSACTIONS));

            // Add edge (deduplicate by source+target pair to keep graph clean)
            setEdges(prev => {
                const exists = prev.some(
                    e =>
                        (e.source === newEdge.source && e.target === newEdge.target) ||
                        (e.source === newEdge.target && e.target === newEdge.source)
                );
                if (exists) return prev;
                return [...prev.slice(-40), newEdge]; // keep max 40 edges
            });

            // Update risk score if selected node is involved
            setSelectedNodeId(prev => {
                if (prev && (newTx.senderId === prev || newTx.receiverId === prev)) {
                    // Trigger risk recalculation via side effect
                    setNodes(current => {
                        const node = current.find(n => n.id === prev);
                        if (node) {
                            setEdges(currentEdges => {
                                const connectedEdges = currentEdges.filter(
                                    e => e.source === prev || e.target === prev
                                );
                                const score = calculateRisk({ node, connectedEdges, allNodes: current });
                                setRiskScore(score);
                                return currentEdges;
                            });
                        }
                        return current;
                    });
                }
                return prev;
            });
        }, 3000);

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
        <div className="flex flex-col h-screen overflow-hidden bg-[var(--bg)]">
            {/* Top nav */}
            <Navbar theme={theme} onToggleTheme={toggleTheme} />

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
    );
}
