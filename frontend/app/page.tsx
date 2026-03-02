'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Navbar from '@/components/Navbar';
import TransactionFeed from '@/components/TransactionFeed';
import GraphView from '@/components/GraphView';
import RiskPanel from '@/components/RiskPanel';
import MetricsFooter from '@/components/MetricsFooter';

import type { Transaction, GraphNode, GraphEdge } from '@/lib/mockData';
import { FRAUD_CLUSTER_IDS } from '@/lib/mockData';
import { calculateRisk, getDefaultRiskScore, type RiskScore } from '@/lib/riskEngine';
import {
    submitTransaction,
    fetchTransactions,
    fetchGraphData,
    mapApiTransaction,
    type StoredTransaction,
} from '@/lib/api';

// ── Helpers for simulation ──
const ALL_ACCOUNTS = [
    'A001', 'A002', 'A003', 'A004', 'A005',
    'B001', 'B002', 'B003', 'B004', 'B005', 'B006', 'B007', 'B008',
    'C001', 'C002', 'C003',
];
const FRAUD_ACCOUNTS = ['A001', 'A002', 'A003', 'A004', 'A005'];

function randomAccount(): string {
    return ALL_ACCOUNTS[Math.floor(Math.random() * ALL_ACCOUNTS.length)];
}

const MAX_TRANSACTIONS = 50;

export default function DashboardPage() {
    const [theme, setTheme] = useState<'dark' | 'light'>('dark');
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [nodes, setNodes] = useState<GraphNode[]>([]);
    const [edges, setEdges] = useState<GraphEdge[]>([]);
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

    // ── Simulation: POST new transactions every 3 seconds ──
    useEffect(() => {
        const interval = setInterval(async () => {
            try {
                let sender = randomAccount();
                let receiver = randomAccount();
                while (receiver === sender) receiver = randomAccount();

                const isFraudSender = FRAUD_ACCOUNTS.includes(sender);
                const amount =
                    isFraudSender && Math.random() > 0.5
                        ? Math.floor(Math.random() * 45000) + 8000
                        : Math.floor(Math.random() * 3000) + 100;

                const result = await submitTransaction({ sender, receiver, amount });

                const newTx = mapApiTransaction(result);
                setTransactions(prev => [newTx, ...prev].slice(0, MAX_TRANSACTIONS));
            } catch (e) {
                console.error('[Quantora] Failed to submit transaction:', e);
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
