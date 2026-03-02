'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import * as d3 from 'd3';
import Sidebar from '@/components/Sidebar';
import BackButton from '@/components/ui/BackButton';
import LiveTime from '@/components/ui/LiveTime';
import { Clock, GitBranch, ZoomIn, ZoomOut, Maximize2, Loader2 } from 'lucide-react';
import { fetchGraphData, type GraphData } from '@/lib/api';
import { FRAUD_CLUSTER_IDS, type GraphNode, type GraphEdge } from '@/lib/mockData';

// ── Colors matching existing GraphView ──
const NODE_COLOR: Record<string, string> = { high: '#dc2626', medium: '#d97706', low: '#3b82f6' };
const EDGE_COLOR: Record<string, string> = { high: '#dc262660', medium: '#d9770660', low: '#3b82f660' };

type D3Node = GraphNode & d3.SimulationNodeDatum;
type D3Link = { id: string; source: D3Node; target: D3Node; amount: number; risk: string };

export default function NetworkPage() {
    const containerRef = useRef<HTMLDivElement>(null);
    const svgRef = useRef<SVGSVGElement>(null);
    const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
    const [dims, setDims] = useState({ w: 800, h: 600 });
    const [nodes, setNodes] = useState<GraphNode[]>([]);
    const [edges, setEdges] = useState<GraphEdge[]>([]);
    const [stats, setStats] = useState({ nodes: 0, edges: 0, fraud: 0 });
    const [loading, setLoading] = useState(true);

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

    // Fetch graph data from backend
    useEffect(() => {
        const load = async () => {
            try {
                const data = await fetchGraphData();
                setNodes(data.nodes as GraphNode[]);
                setEdges(data.edges as GraphEdge[]);
                setStats(data.stats);
            } catch (e) {
                console.error('[Quantora] Failed to fetch graph data:', e);
            }
            setLoading(false);
        };
        load();
        const interval = setInterval(load, 5000);
        return () => clearInterval(interval);
    }, []);

    // D3 render
    useEffect(() => {
        if (!svgRef.current || nodes.length === 0) return;
        const { w, h } = dims;

        const d3Nodes: D3Node[] = nodes.map(n => ({ ...n }));
        const idMap: Record<string, D3Node> = {};
        d3Nodes.forEach(n => (idMap[n.id] = n));

        const d3Links: D3Link[] = edges
            .map(e => {
                const s = idMap[e.source]; const t = idMap[e.target];
                if (!s || !t) return null;
                return { id: e.id, source: s, target: t, amount: e.amount, risk: e.risk };
            }).filter(Boolean) as D3Link[];

        const svg = d3.select(svgRef.current);
        svg.selectAll('*').remove();
        svg.attr('width', w).attr('height', h);

        // Defs
        const defs = svg.append('defs');
        ['high', 'medium', 'low'].forEach(r => {
            defs.append('marker')
                .attr('id', `net-arrow-${r}`)
                .attr('viewBox', '0 -5 10 10')
                .attr('refX', 20).attr('refY', 0)
                .attr('markerWidth', 4).attr('markerHeight', 4)
                .attr('orient', 'auto')
                .append('path').attr('d', 'M0,-5L10,0L0,5').attr('fill', EDGE_COLOR[r]);
        });

        const g = svg.append('g');

        const zoom = d3.zoom<SVGSVGElement, unknown>()
            .scaleExtent([0.2, 5])
            .on('zoom', e => g.attr('transform', e.transform));
        svg.call(zoom);
        zoomRef.current = zoom;

        const sim = d3.forceSimulation<D3Node>(d3Nodes)
            .force('link', d3.forceLink<D3Node, D3Link>(d3Links).id(d => d.id).distance(d => d.risk === 'high' ? 70 : 130))
            .force('charge', d3.forceManyBody().strength(-250))
            .force('center', d3.forceCenter(w / 2, h / 2))
            .force('collision', d3.forceCollide().radius(30));

        // Edges
        const link = g.append('g').selectAll<SVGLineElement, D3Link>('line')
            .data(d3Links).join('line')
            .attr('stroke', d => EDGE_COLOR[d.risk])
            .attr('stroke-width', d => d.risk === 'high' ? 1.5 : 0.8)
            .attr('stroke-dasharray', d => d.risk === 'low' ? '4 3' : 'none')
            .attr('marker-end', d => `url(#net-arrow-${d.risk})`);

        // Nodes
        const node = g.append('g').selectAll<SVGGElement, D3Node>('g')
            .data(d3Nodes).join('g')
            .attr('cursor', 'pointer')
            .call(
                d3.drag<SVGGElement, D3Node>()
                    .on('start', (ev, d) => { if (!ev.active) sim.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
                    .on('drag', (ev, d) => { d.fx = ev.x; d.fy = ev.y; })
                    .on('end', (ev, d) => { if (!ev.active) sim.alphaTarget(0); d.fx = null; d.fy = null; })
            );

        // Glow for fraud nodes
        node.filter(d => d.risk === 'high')
            .append('circle').attr('r', 18)
            .attr('fill', 'none').attr('stroke', '#dc2626').attr('stroke-width', 1).attr('opacity', 0.3);

        // Main circle
        node.append('circle')
            .attr('r', d => FRAUD_CLUSTER_IDS.includes(d.id) ? 13 : 9)
            .attr('fill', d => NODE_COLOR[d.risk])
            .attr('stroke', d => d.risk === 'high' ? '#ef4444' : '#3f3f46')
            .attr('stroke-width', d => d.risk === 'high' ? 2 : 0.5)
            .attr('opacity', 0.95);

        // Labels
        node.append('text')
            .text(d => d.id)
            .attr('text-anchor', 'middle').attr('dy', '2.2em')
            .attr('font-size', '8px').attr('font-family', 'JetBrains Mono, monospace')
            .attr('fill', '#71717a').attr('pointer-events', 'none');

        sim.on('tick', () => {
            link.attr('x1', d => d.source.x!).attr('y1', d => d.source.y!)
                .attr('x2', d => d.target.x!).attr('y2', d => d.target.y!);
            node.attr('transform', d => `translate(${d.x},${d.y})`);
        });

        return () => { sim.stop(); };
    }, [nodes, edges, dims]);

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
                    <div className="flex items-center gap-1.5">
                        <Clock size={11} strokeWidth={1.5} className="text-[var(--text-muted)]" />
                        <span className="text-[10px] font-mono text-[var(--text-muted)]">
                            <LiveTime format={{ hour: '2-digit', minute: '2-digit', hour12: false }} />
                        </span>
                    </div>
                </header>

                {/* Graph */}
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
                    <div className="absolute bottom-4 right-4 flex flex-col gap-1">
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

                    {/* Legend */}
                    <div className="absolute top-4 left-4 rounded-lg border border-[var(--border)] bg-[var(--surface)]/90 backdrop-blur-sm p-3 space-y-1.5">
                        <p className="text-[8px] font-mono uppercase tracking-widest text-[var(--text-muted)] mb-2">Legend</p>
                        <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                            <span className="text-[9px] font-mono text-[var(--text-secondary)]">Fraud Node</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                            <span className="text-[9px] font-mono text-[var(--text-secondary)]">Medium Risk</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                            <span className="text-[9px] font-mono text-[var(--text-secondary)]">Safe Node</span>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
