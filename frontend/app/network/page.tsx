'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import * as d3 from 'd3';
import Sidebar from '@/components/Sidebar';
import BackButton from '@/components/ui/BackButton';
import LiveTime from '@/components/ui/LiveTime';
import {
    Clock, GitBranch, ZoomIn, ZoomOut, Maximize2, Loader2,
    X, AlertTriangle, ArrowUpRight, ArrowDownLeft, Activity,
    Shield, Users, Eye, Zap, Circle, Target,
} from 'lucide-react';
import { fetchGraphData, fetchNodeDetail, type GraphData, type NodeDetail, type StoredTransaction } from '@/lib/api';
import { FRAUD_CLUSTER_IDS, type GraphNode, type GraphEdge } from '@/lib/mockData';

// ── Colors ──
const NODE_COLOR: Record<string, string> = { high: '#dc2626', medium: '#d97706', low: '#3b82f6' };
const EDGE_COLOR: Record<string, string> = { high: '#dc262660', medium: '#d9770660', low: '#3b82f660' };
const GLOW_COLOR: Record<string, string> = { high: '#dc262640', medium: '#d9770630', low: '#3b82f620' };

type D3Node = GraphNode & d3.SimulationNodeDatum;
type D3Link = { id: string; source: D3Node; target: D3Node; amount: number; risk: string };
type RiskFilter = { high: boolean; medium: boolean; low: boolean };


// ── Risk Gauge (reusable) ──────────────────────────────────────────

function RiskGauge({ score, size = 80 }: { score: number; size?: number }) {
    const pct = Math.round(score * 100);
    const color = score > 0.7 ? '#dc2626' : score > 0.4 ? '#d97706' : '#22c55e';
    const r = size * 0.45;
    const circumference = 2 * Math.PI * r;
    const offset = circumference * (1 - score);

    return (
        <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
            <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full -rotate-90">
                <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border)" strokeWidth="5" />
                <circle
                    cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="5"
                    strokeDasharray={circumference} strokeDashoffset={offset}
                    strokeLinecap="round" className="transition-all duration-700 ease-out"
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-sm font-mono font-bold" style={{ color }}>{pct}%</span>
                <span className="text-[7px] font-mono text-[var(--text-muted)] uppercase tracking-widest">Risk</span>
            </div>
        </div>
    );
}


// ── Node Detail Sidebar ────────────────────────────────────────────

function NodeDetailPanel({
    nodeId,
    onClose,
    onSelectNode,
}: {
    nodeId: string;
    onClose: () => void;
    onSelectNode: (id: string) => void;
}) {
    const [detail, setDetail] = useState<NodeDetail | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        fetchNodeDetail(nodeId)
            .then(d => setDetail(d))
            .catch(() => setDetail(null))
            .finally(() => setLoading(false));
    }, [nodeId]);

    const riskColor = (level: string) =>
        level === 'high' ? 'text-red-400' : level === 'medium' ? 'text-amber-400' : 'text-emerald-400';
    const riskBg = (level: string) =>
        level === 'high' ? 'bg-red-500/10 border-red-500/20' : level === 'medium' ? 'bg-amber-500/10 border-amber-500/20' : 'bg-emerald-500/10 border-emerald-500/20';

    if (loading) {
        return (
            <div className="w-[340px] flex-shrink-0 border-l border-[var(--border)] bg-[var(--surface)] flex items-center justify-center">
                <Loader2 size={16} className="animate-spin text-[var(--text-muted)]" />
            </div>
        );
    }

    if (!detail) return null;

    return (
        <div className="w-[340px] flex-shrink-0 border-l border-[var(--border)] bg-[var(--surface)] flex flex-col overflow-hidden animate-fade-in">
            {/* Header */}
            <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between bg-[var(--bg)]">
                <div className="flex items-center gap-2.5">
                    <div className={`w-3 h-3 rounded-full ${detail.risk_level === 'high' ? 'bg-red-500' : detail.risk_level === 'medium' ? 'bg-amber-500' : 'bg-blue-500'}`} />
                    <span className="text-[12px] font-mono font-bold text-[var(--text-primary)]">{detail.id}</span>
                    {detail.is_fraud_account && (
                        <span className="text-[8px] font-mono px-1.5 py-0.5 rounded-sm border text-red-400 bg-red-500/10 border-red-500/20">
                            FRAUD CLUSTER
                        </span>
                    )}
                </div>
                <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
                    <X size={14} />
                </button>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {/* Risk Gauge + Score */}
                <div className="px-4 py-4 flex items-center gap-4 border-b border-[var(--border)]">
                    <RiskGauge score={detail.risk_score} size={72} />
                    <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                            <span className={`text-[11px] font-mono font-bold ${riskColor(detail.risk_level)}`}>
                                {detail.risk_level.toUpperCase()} RISK
                            </span>
                        </div>
                        <div className="text-[10px] font-mono text-[var(--text-muted)]">
                            Score: {(detail.risk_score * 100).toFixed(2)}%
                        </div>
                        <div className="text-[9px] font-mono text-[var(--text-muted)]">
                            Group: {detail.group === 'fraud-cluster' ? 'Fraud Cluster' : 'Normal'}
                        </div>
                    </div>
                </div>

                {/* SAGRA Components */}
                <div className="px-4 py-3 border-b border-[var(--border)]">
                    <p className="text-[8px] font-mono uppercase tracking-widest text-[var(--text-muted)] mb-2.5">SAGRA Averages</p>
                    <div className="grid grid-cols-3 gap-2">
                        {[
                            { label: 'TRS', value: detail.sagra.avg_trs, desc: 'Transaction' },
                            { label: 'GRS', value: detail.sagra.avg_grs, desc: 'Graph' },
                            { label: 'NDB', value: detail.sagra.avg_ndb, desc: 'Deviation' },
                        ].map(s => (
                            <div key={s.label} className="px-2.5 py-2 rounded-md border border-[var(--border)] bg-[var(--bg)]">
                                <p className="text-[8px] font-mono text-[var(--text-muted)] uppercase tracking-widest">{s.label}</p>
                                <p className="text-[13px] font-mono font-bold text-[var(--text-primary)] mt-0.5">{s.value.toFixed(4)}</p>
                                <p className="text-[7px] font-mono text-[var(--text-muted)]">{s.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Degree & Flow */}
                <div className="px-4 py-3 border-b border-[var(--border)]">
                    <p className="text-[8px] font-mono uppercase tracking-widest text-[var(--text-muted)] mb-2.5">Network Position</p>
                    <div className="grid grid-cols-3 gap-2 mb-3">
                        <div className="text-center">
                            <p className="text-[14px] font-mono font-bold text-[var(--text-primary)]">{detail.degree.total}</p>
                            <p className="text-[8px] font-mono text-[var(--text-muted)]">Degree</p>
                        </div>
                        <div className="text-center">
                            <p className="text-[14px] font-mono font-bold text-emerald-400">{detail.degree.in}</p>
                            <p className="text-[8px] font-mono text-[var(--text-muted)]">In</p>
                        </div>
                        <div className="text-center">
                            <p className="text-[14px] font-mono font-bold text-amber-400">{detail.degree.out}</p>
                            <p className="text-[8px] font-mono text-[var(--text-muted)]">Out</p>
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-[10px] font-mono">
                            <span className="flex items-center gap-1.5 text-[var(--text-muted)]">
                                <ArrowUpRight size={10} className="text-red-400" /> Sent
                            </span>
                            <span className="text-[var(--text-primary)]">₹{detail.flow.total_sent.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center justify-between text-[10px] font-mono">
                            <span className="flex items-center gap-1.5 text-[var(--text-muted)]">
                                <ArrowDownLeft size={10} className="text-emerald-400" /> Received
                            </span>
                            <span className="text-[var(--text-primary)]">₹{detail.flow.total_received.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center justify-between text-[10px] font-mono border-t border-[var(--border)] pt-1.5">
                            <span className="text-[var(--text-muted)]">Net Flow</span>
                            <span className={detail.flow.net_flow >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                                {detail.flow.net_flow >= 0 ? '+' : ''}₹{detail.flow.net_flow.toLocaleString()}
                            </span>
                        </div>
                        <div className="flex items-center justify-between text-[10px] font-mono">
                            <span className="text-[var(--text-muted)]">Transactions</span>
                            <span className="text-[var(--text-primary)]">{detail.flow.transaction_count}</span>
                        </div>
                        <div className="flex items-center justify-between text-[10px] font-mono">
                            <span className="text-[var(--text-muted)]">Fraud Flagged</span>
                            <span className="text-red-400">{detail.flow.fraud_count}</span>
                        </div>
                    </div>
                </div>

                {/* Neighbors */}
                <div className="px-4 py-3 border-b border-[var(--border)]">
                    <p className="text-[8px] font-mono uppercase tracking-widest text-[var(--text-muted)] mb-2.5">
                        Connected Nodes ({detail.neighbors.length})
                    </p>
                    <div className="space-y-1 max-h-[140px] overflow-y-auto custom-scrollbar">
                        {detail.neighbors.map(nb => (
                            <button
                                key={nb.id}
                                onClick={() => onSelectNode(nb.id)}
                                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md hover:bg-[var(--bg)] transition-colors group"
                            >
                                <div className="flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full ${nb.risk_level === 'high' ? 'bg-red-500' : nb.risk_level === 'medium' ? 'bg-amber-500' : 'bg-blue-500'}`} />
                                    <span className="text-[10px] font-mono text-[var(--text-primary)] group-hover:text-white">{nb.id}</span>
                                </div>
                                <span className={`text-[9px] font-mono ${riskColor(nb.risk_level)}`}>
                                    {(nb.risk_score * 100).toFixed(1)}%
                                </span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Recent Transactions */}
                <div className="px-4 py-3">
                    <p className="text-[8px] font-mono uppercase tracking-widest text-[var(--text-muted)] mb-2.5">
                        Recent Transactions ({detail.recent_transactions.length})
                    </p>
                    <div className="space-y-1.5">
                        {detail.recent_transactions.map((tx: StoredTransaction) => (
                            <div key={tx.id} className="flex items-center justify-between px-2.5 py-2 rounded-md border border-[var(--border)] bg-[var(--bg)]">
                                <div className="min-w-0">
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-[9px] font-mono text-[var(--text-primary)]">{tx.id}</span>
                                        {tx.is_fraud && <AlertTriangle size={8} className="text-red-400" />}
                                    </div>
                                    <div className="text-[8px] font-mono text-[var(--text-muted)] mt-0.5">
                                        {tx.sender} → {tx.receiver}
                                    </div>
                                </div>
                                <div className="text-right flex-shrink-0">
                                    <div className="text-[9px] font-mono text-[var(--text-primary)]">₹{tx.amount.toLocaleString()}</div>
                                    <div className={`text-[8px] font-mono ${riskColor(tx.risk_level)}`}>
                                        {(tx.risk_score * 100).toFixed(1)}%
                                    </div>
                                </div>
                            </div>
                        ))}
                        {detail.recent_transactions.length === 0 && (
                            <p className="text-[9px] font-mono text-[var(--text-muted)] text-center py-3">No transactions yet</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}


// ── Graph Stats Bar ────────────────────────────────────────────────

function GraphStatsBar({ stats, density }: {
    stats: { nodes: number; edges: number; fraud: number };
    density: number;
}) {
    const fraudPct = stats.nodes > 0 ? ((stats.fraud / stats.nodes) * 100).toFixed(1) : '0.0';

    return (
        <div className="absolute top-4 right-4 flex flex-col gap-2 z-10">
            <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur-sm p-3 space-y-2 min-w-[160px]">
                <p className="text-[8px] font-mono uppercase tracking-widest text-[var(--text-muted)]">Graph Analytics</p>
                <div className="space-y-1.5">
                    {[
                        { icon: <Circle size={9} className="text-blue-400" />, label: 'Nodes', value: stats.nodes },
                        { icon: <Activity size={9} className="text-zinc-400" />, label: 'Edges', value: stats.edges },
                        { icon: <AlertTriangle size={9} className="text-red-400" />, label: 'Fraud Nodes', value: stats.fraud },
                        { icon: <Target size={9} className="text-amber-400" />, label: 'Fraud Rate', value: `${fraudPct}%` },
                        { icon: <Users size={9} className="text-violet-400" />, label: 'Density', value: `${(density * 100).toFixed(1)}%` },
                    ].map(s => (
                        <div key={s.label} className="flex items-center justify-between text-[9px] font-mono">
                            <span className="flex items-center gap-1.5 text-[var(--text-muted)]">
                                {s.icon} {s.label}
                            </span>
                            <span className="text-[var(--text-primary)] font-semibold">{s.value}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}


// ── Main Page ──────────────────────────────────────────────────────

export default function NetworkPage() {
    const containerRef = useRef<HTMLDivElement>(null);
    const svgRef = useRef<SVGSVGElement>(null);
    const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
    const simRef = useRef<d3.Simulation<D3Node, D3Link> | null>(null);
    const positionCache = useRef<Record<string, { x: number; y: number; vx: number; vy: number }>>({});
    const prevGraphKey = useRef<string>('');
    const [dims, setDims] = useState({ w: 800, h: 600 });
    const [nodes, setNodes] = useState<GraphNode[]>([]);
    const [edges, setEdges] = useState<GraphEdge[]>([]);
    const [stats, setStats] = useState({ nodes: 0, edges: 0, fraud: 0 });
    const [loading, setLoading] = useState(true);
    const [selectedNode, setSelectedNode] = useState<string | null>(null);
    const [hoveredNode, setHoveredNode] = useState<string | null>(null);
    const [riskFilter, setRiskFilter] = useState<RiskFilter>({ high: true, medium: true, low: true });
    const [density, setDensity] = useState(0);

    // Track container size
    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        const obs = new ResizeObserver(entries => {
            const { width, height } = entries[0].contentRect;
            setDims({ w: width, h: height });
        });
        obs.observe(el);
        return () => obs.disconnect();
    }, []);

    // Fetch graph data — only update stats if structure unchanged
    useEffect(() => {
        const load = async () => {
            try {
                const data = await fetchGraphData();
                setNodes(data.nodes as GraphNode[]);
                setEdges(data.edges as GraphEdge[]);
                setStats(data.stats);
                const n = data.stats.nodes;
                const e = data.stats.edges;
                setDensity(n > 1 ? e / (n * (n - 1)) : 0);
            } catch (e) {
                console.error('[Quantora] Failed to fetch graph data:', e);
            }
            setLoading(false);
        };
        load();
        const interval = setInterval(load, 8000);
        return () => clearInterval(interval);
    }, []);

    // Filter nodes/edges based on risk level toggles
    const filteredNodes = nodes.filter(n => riskFilter[n.risk as keyof RiskFilter]);
    const filteredNodeIds = new Set(filteredNodes.map(n => n.id));
    const filteredEdges = edges.filter(e => filteredNodeIds.has(e.source) && filteredNodeIds.has(e.target));

    // Build a fingerprint of the graph structure so we only re-render when it actually changes
    const graphKey = filteredNodes.map(n => n.id).sort().join(',') + '|' + filteredEdges.map(e => e.id).sort().join(',');

    // D3 render — only rebuilds when graph structure or filter changes, NOT on every data poll
    useEffect(() => {
        if (!svgRef.current || filteredNodes.length === 0) return;

        // If the structure hasn't changed, skip the full rebuild
        if (graphKey === prevGraphKey.current) return;
        prevGraphKey.current = graphKey;

        // Save positions from the old simulation before tearing down
        if (simRef.current) {
            simRef.current.nodes().forEach(n => {
                if (n.x != null && n.y != null) {
                    positionCache.current[n.id] = { x: n.x, y: n.y, vx: n.vx || 0, vy: n.vy || 0 };
                }
            });
            simRef.current.stop();
            simRef.current = null;
        }

        const { w, h } = dims;

        // Seed node positions from cache
        const d3Nodes: D3Node[] = filteredNodes.map(n => {
            const cached = positionCache.current[n.id];
            if (cached) {
                return { ...n, x: cached.x, y: cached.y, vx: cached.vx, vy: cached.vy };
            }
            // New node — place near center with slight randomness
            return { ...n, x: w / 2 + (Math.random() - 0.5) * 100, y: h / 2 + (Math.random() - 0.5) * 100 };
        });
        const idMap: Record<string, D3Node> = {};
        d3Nodes.forEach(n => (idMap[n.id] = n));

        const d3Links: D3Link[] = filteredEdges
            .map(e => {
                const s = idMap[e.source]; const t = idMap[e.target];
                if (!s || !t) return null;
                return { id: e.id, source: s, target: t, amount: e.amount, risk: e.risk };
            }).filter(Boolean) as D3Link[];

        const svg = d3.select(svgRef.current);
        svg.selectAll('*').remove();
        svg.attr('width', w).attr('height', h);

        // Defs — arrows + gradients
        const defs = svg.append('defs');
        ['high', 'medium', 'low'].forEach(r => {
            defs.append('marker')
                .attr('id', `net-arrow-${r}`)
                .attr('viewBox', '0 -5 10 10')
                .attr('refX', 22).attr('refY', 0)
                .attr('markerWidth', 4).attr('markerHeight', 4)
                .attr('orient', 'auto')
                .append('path').attr('d', 'M0,-5L10,0L0,5').attr('fill', EDGE_COLOR[r]);
        });

        // Radial glow filter
        const filter = defs.append('filter').attr('id', 'glow');
        filter.append('feGaussianBlur').attr('stdDeviation', '3').attr('result', 'blur');
        filter.append('feMerge')
            .selectAll('feMergeNode')
            .data(['blur', 'SourceGraphic'])
            .join('feMergeNode')
            .attr('in', d => d);

        const g = svg.append('g');

        const zoom = d3.zoom<SVGSVGElement, unknown>()
            .scaleExtent([0.15, 6])
            .on('zoom', e => g.attr('transform', e.transform));
        svg.call(zoom);
        zoomRef.current = zoom;

        // Determine if we have cached positions (gentle reheat) or fresh start
        const hasCachedPositions = d3Nodes.some(n => positionCache.current[n.id]);
        const initialAlpha = hasCachedPositions ? 0.15 : 0.8;

        const sim = d3.forceSimulation<D3Node>(d3Nodes)
            .alpha(initialAlpha)
            .alphaDecay(0.04)
            .alphaMin(0.005)
            .velocityDecay(0.45)
            .force('link', d3.forceLink<D3Node, D3Link>(d3Links).id(d => d.id).distance(d => d.risk === 'high' ? 80 : 140))
            .force('charge', d3.forceManyBody().strength(-300))
            .force('center', d3.forceCenter(w / 2, h / 2).strength(0.03))
            .force('collision', d3.forceCollide().radius(35))
            .force('x', d3.forceX(w / 2).strength(0.02))
            .force('y', d3.forceY(h / 2).strength(0.02));

        simRef.current = sim;

        // Edges with variable width
        const link = g.append('g').selectAll<SVGLineElement, D3Link>('line')
            .data(d3Links).join('line')
            .attr('stroke', d => EDGE_COLOR[d.risk])
            .attr('stroke-width', d => {
                if (d.risk === 'high') return Math.min(d.amount / 8000, 3.5);
                if (d.risk === 'medium') return 1;
                return 0.6;
            })
            .attr('stroke-dasharray', d => d.risk === 'low' ? '4 3' : 'none')
            .attr('marker-end', d => `url(#net-arrow-${d.risk})`)
            .attr('opacity', 0.7);

        // Nodes
        const node = g.append('g').selectAll<SVGGElement, D3Node>('g')
            .data(d3Nodes).join('g')
            .attr('cursor', 'pointer')
            .call(
                d3.drag<SVGGElement, D3Node>()
                    .on('start', (ev, d) => { if (!ev.active) sim.alphaTarget(0.15).restart(); d.fx = d.x; d.fy = d.y; })
                    .on('drag', (ev, d) => { d.fx = ev.x; d.fy = ev.y; })
                    .on('end', (ev, d) => { if (!ev.active) sim.alphaTarget(0); d.fx = null; d.fy = null; })
            );

        // Outer glow ring for fraud nodes
        node.filter(d => d.risk === 'high')
            .append('circle').attr('r', 22)
            .attr('fill', 'none').attr('stroke', '#dc2626').attr('stroke-width', 1.5)
            .attr('opacity', 0.25)
            .attr('filter', 'url(#glow)');

        // Pulsing ring for fraud cluster nodes
        node.filter(d => FRAUD_CLUSTER_IDS.includes(d.id))
            .append('circle').attr('r', 18)
            .attr('fill', 'none').attr('stroke', '#dc2626').attr('stroke-width', 0.8)
            .attr('opacity', 0.5)
            .style('animation', 'pulse 2s ease-in-out infinite');

        // Main circle with size based on degree (edges connected)
        node.append('circle')
            .attr('r', d => {
                const edgeCount = d3Links.filter(l => l.source.id === d.id || l.target.id === d.id).length;
                return Math.max(8, Math.min(18, 6 + edgeCount * 0.7));
            })
            .attr('fill', d => NODE_COLOR[d.risk])
            .attr('stroke', d => d.risk === 'high' ? '#ef4444' : d.risk === 'medium' ? '#d97706' : '#3f3f46')
            .attr('stroke-width', d => d.risk === 'high' ? 2 : 1)
            .attr('opacity', 0.92);

        // Inner icon for fraud cluster nodes
        node.filter(d => FRAUD_CLUSTER_IDS.includes(d.id))
            .append('text')
            .text('!')
            .attr('text-anchor', 'middle').attr('dy', '0.35em')
            .attr('font-size', '9px').attr('font-family', 'JetBrains Mono, monospace')
            .attr('fill', '#fff').attr('font-weight', 'bold').attr('pointer-events', 'none');

        // Labels
        node.append('text')
            .text(d => d.id)
            .attr('text-anchor', 'middle').attr('dy', '2.4em')
            .attr('font-size', '8px').attr('font-family', 'JetBrains Mono, monospace')
            .attr('fill', '#71717a').attr('pointer-events', 'none');

        // Hover + click interactions
        node.on('mouseenter', function (ev, d) {
            setHoveredNode(d.id);
            link.attr('opacity', l =>
                (l.source.id === d.id || l.target.id === d.id) ? 1 : 0.15
            ).attr('stroke-width', l =>
                (l.source.id === d.id || l.target.id === d.id)
                    ? (l.risk === 'high' ? 3 : 2)
                    : (l.risk === 'high' ? 1.5 : 0.6)
            );
            node.select('circle:nth-child(2), circle:nth-child(3), circle:last-of-type')
                .transition().duration(200)
                .attr('opacity', (n: D3Node) => {
                    if (n.id === d.id) return 1;
                    const isNeighbor = d3Links.some(l =>
                        (l.source.id === d.id && l.target.id === n.id) ||
                        (l.target.id === d.id && l.source.id === n.id)
                    );
                    return isNeighbor ? 0.9 : 0.2;
                });
        });

        node.on('mouseleave', function () {
            setHoveredNode(null);
            link.attr('opacity', 0.7)
                .attr('stroke-width', (d: D3Link) => {
                    if (d.risk === 'high') return Math.min(d.amount / 8000, 3.5);
                    if (d.risk === 'medium') return 1;
                    return 0.6;
                });
            node.selectAll('circle').transition().duration(200).attr('opacity', 0.92);
        });

        node.on('click', (ev, d) => {
            ev.stopPropagation();
            setSelectedNode(d.id);
        });

        // Background click to deselect
        svg.on('click', () => {
            setSelectedNode(null);
        });

        sim.on('tick', () => {
            link.attr('x1', d => d.source.x!).attr('y1', d => d.source.y!)
                .attr('x2', d => d.target.x!).attr('y2', d => d.target.y!);
            node.attr('transform', d => `translate(${d.x},${d.y})`);
        });

        // When simulation finishes, save final positions to cache
        sim.on('end', () => {
            d3Nodes.forEach(n => {
                if (n.x != null && n.y != null) {
                    positionCache.current[n.id] = { x: n.x, y: n.y, vx: n.vx || 0, vy: n.vy || 0 };
                }
            });
        });

        return () => {
            // Save positions before unmounting
            d3Nodes.forEach(n => {
                if (n.x != null && n.y != null) {
                    positionCache.current[n.id] = { x: n.x, y: n.y, vx: n.vx || 0, vy: n.vy || 0 };
                }
            });
            sim.stop();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [graphKey, dims]);

    // Zoom controls
    const handleZoom = useCallback((dir: 'in' | 'out' | 'reset') => {
        const svg = svgRef.current;
        const zoom = zoomRef.current;
        if (!svg || !zoom) return;
        const sel = d3.select(svg);
        if (dir === 'in') sel.transition().duration(300).call(zoom.scaleBy, 1.4);
        else if (dir === 'out') sel.transition().duration(300).call(zoom.scaleBy, 0.7);
        else sel.transition().duration(300).call(zoom.transform, d3.zoomIdentity);
    }, []);

    const toggleFilter = (level: keyof RiskFilter) => {
        setRiskFilter(prev => ({ ...prev, [level]: !prev[level] }));
    };

    return (
        <div className="flex h-screen overflow-hidden bg-[var(--bg)]">
            <Sidebar />
            <div className="flex-1 flex flex-col overflow-hidden">

                {/* Header */}
                <header className="h-14 flex-shrink-0 border-b border-[var(--border)] px-6 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <BackButton />
                        <div className="w-px h-4 bg-[var(--border)]" />
                        <GitBranch size={14} strokeWidth={1.5} className="text-[var(--text-secondary)]" />
                        <span className="text-xs font-semibold text-[var(--text-primary)]">Transaction Network</span>
                        <div className="flex items-center gap-2">
                            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-sm bg-blue-500/10 border border-blue-500/25 text-blue-400">
                                {stats.nodes} Nodes
                            </span>
                            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-sm bg-zinc-700/40 border border-zinc-600/25 text-zinc-400">
                                {stats.edges} Edges
                            </span>
                            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-sm bg-red-500/10 border border-red-500/25 text-red-400">
                                {stats.fraud} Fraud
                            </span>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        {/* Hovered node indicator */}
                        {hoveredNode && (
                            <div className="flex items-center gap-1.5 text-[9px] font-mono text-[var(--text-muted)] animate-fade-in">
                                <Eye size={10} />
                                <span>{hoveredNode}</span>
                            </div>
                        )}
                        <div className="flex items-center gap-1.5">
                            <Clock size={11} strokeWidth={1.5} className="text-[var(--text-muted)]" />
                            <span className="text-[10px] font-mono text-[var(--text-muted)]">
                                <LiveTime format={{ hour: '2-digit', minute: '2-digit', hour12: false }} />
                            </span>
                        </div>
                    </div>
                </header>

                {/* Main content */}
                <div className="flex-1 flex overflow-hidden">
                    {/* Graph canvas */}
                    <main ref={containerRef} className="flex-1 relative overflow-hidden">
                        {loading ? (
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="flex items-center gap-3">
                                    <Loader2 size={16} className="animate-spin text-[var(--text-muted)]" />
                                    <span className="text-xs font-mono text-[var(--text-muted)]">Loading network graph...</span>
                                </div>
                            </div>
                        ) : (
                            <svg ref={svgRef} className="w-full h-full" />
                        )}

                        {/* Zoom controls */}
                        <div className="absolute bottom-4 right-4 flex flex-col gap-1 z-10">
                            <button onClick={() => handleZoom('in')}
                                className="w-8 h-8 rounded-md border border-[var(--border)] bg-[var(--surface)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg)] transition-all">
                                <ZoomIn size={14} />
                            </button>
                            <button onClick={() => handleZoom('out')}
                                className="w-8 h-8 rounded-md border border-[var(--border)] bg-[var(--surface)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg)] transition-all">
                                <ZoomOut size={14} />
                            </button>
                            <button onClick={() => handleZoom('reset')}
                                className="w-8 h-8 rounded-md border border-[var(--border)] bg-[var(--surface)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg)] transition-all">
                                <Maximize2 size={14} />
                            </button>
                        </div>

                        {/* Legend + Risk Filters */}
                        <div className="absolute top-4 left-4 rounded-lg border border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur-sm p-3 space-y-2.5 z-10">
                            <p className="text-[8px] font-mono uppercase tracking-widest text-[var(--text-muted)]">Risk Filter</p>
                            {[
                                { level: 'high' as const, label: 'High Risk / Fraud', color: 'bg-red-500', textColor: 'text-red-400' },
                                { level: 'medium' as const, label: 'Medium Risk', color: 'bg-amber-500', textColor: 'text-amber-400' },
                                { level: 'low' as const, label: 'Low / Safe', color: 'bg-blue-500', textColor: 'text-blue-400' },
                            ].map(f => (
                                <button
                                    key={f.level}
                                    onClick={() => toggleFilter(f.level)}
                                    className={`flex items-center gap-2 w-full text-left transition-opacity ${riskFilter[f.level] ? 'opacity-100' : 'opacity-35'}`}
                                >
                                    <span className={`w-2.5 h-2.5 rounded-full ${f.color} ${!riskFilter[f.level] ? 'opacity-30' : ''}`} />
                                    <span className={`text-[9px] font-mono ${riskFilter[f.level] ? f.textColor : 'text-[var(--text-muted)]'}`}>
                                        {f.label}
                                    </span>
                                </button>
                            ))}
                            <div className="border-t border-[var(--border)] pt-2 mt-1">
                                <div className="flex items-center gap-2">
                                    <span className="w-2.5 h-2.5 rounded-full border-2 border-red-500 bg-transparent relative">
                                        <span className="absolute inset-0 flex items-center justify-center text-[5px] font-bold text-white">!</span>
                                    </span>
                                    <span className="text-[9px] font-mono text-[var(--text-muted)]">Fraud Cluster</span>
                                </div>
                            </div>
                            <p className="text-[7px] font-mono text-[var(--text-muted)] opacity-60 pt-1">Click node for details</p>
                        </div>

                        {/* Tooltip for hovered node */}
                        {hoveredNode && !selectedNode && (
                            <div className="absolute bottom-4 left-4 rounded-lg border border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur-sm px-3 py-2 z-10 animate-fade-in">
                                <div className="flex items-center gap-2">
                                    <Shield size={10} className="text-[var(--text-muted)]" />
                                    <span className="text-[10px] font-mono text-[var(--text-primary)] font-semibold">{hoveredNode}</span>
                                    <span className="text-[8px] font-mono text-[var(--text-muted)]">← Click to inspect</span>
                                </div>
                            </div>
                        )}

                        {/* Graph Stats */}
                        {!loading && <GraphStatsBar stats={stats} density={density} />}
                    </main>

                    {/* Node Detail Sidebar */}
                    {selectedNode && (
                        <NodeDetailPanel
                            nodeId={selectedNode}
                            onClose={() => setSelectedNode(null)}
                            onSelectNode={(id) => setSelectedNode(id)}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}
