'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import * as d3 from 'd3';
import type { GraphNode, GraphEdge } from '@/lib/mockData';
import { FRAUD_CLUSTER_IDS } from '@/lib/mockData';

interface GraphViewProps {
    nodes: GraphNode[];
    edges: GraphEdge[];
    selectedNodeId: string | null;
    onNodeSelect: (nodeId: string) => void;
}

type D3Node = GraphNode & d3.SimulationNodeDatum;
type D3Link = {
    id: string;
    source: D3Node;
    target: D3Node;
    amount: number;
    risk: string;
};

const NODE_COLORS: Record<string, string> = {
    high: '#dc2626',
    medium: '#d97706',
    low: '#e2e8f0',
};

const EDGE_COLORS: Record<string, string> = {
    high: '#dc262680',
    medium: '#d9770680',
    low: '#3f3f4680',
};

export default function GraphView({ nodes, edges, selectedNodeId, onNodeSelect }: GraphViewProps) {
    const svgRef = useRef<SVGSVGElement>(null);
    const simRef = useRef<d3.Simulation<D3Node, D3Link> | null>(null);
    const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
    const containerRef = useRef<HTMLDivElement>(null);

    // Track container size
    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        const obs = new ResizeObserver(entries => {
            const { width, height } = entries[0].contentRect;
            setDimensions({ width, height });
        });
        obs.observe(el);
        return () => obs.disconnect();
    }, []);

    useEffect(() => {
        if (!svgRef.current) return;
        const { width, height } = dimensions;

        // Clone data to avoid mutating props
        const d3Nodes: D3Node[] = nodes.map(n => ({ ...n }));
        const idMap: Record<string, D3Node> = {};
        d3Nodes.forEach(n => (idMap[n.id] = n));

        const d3Links: D3Link[] = edges
            .map(e => {
                const s = idMap[e.source];
                const t = idMap[e.target];
                if (!s || !t) return null;
                return { id: e.id, source: s, target: t, amount: e.amount, risk: e.risk };
            })
            .filter(Boolean) as D3Link[];

        const svg = d3.select(svgRef.current);
        svg.selectAll('*').remove();

        svg
            .attr('width', width)
            .attr('height', height)
            .attr('viewBox', `0 0 ${width} ${height}`);

        // Defs for arrowhead
        const defs = svg.append('defs');
        ['high', 'medium', 'low'].forEach(risk => {
            defs
                .append('marker')
                .attr('id', `arrow-${risk}`)
                .attr('viewBox', '0 -5 10 10')
                .attr('refX', 18)
                .attr('refY', 0)
                .attr('markerWidth', 4)
                .attr('markerHeight', 4)
                .attr('orient', 'auto')
                .append('path')
                .attr('d', 'M0,-5L10,0L0,5')
                .attr('fill', EDGE_COLORS[risk]);
        });

        const g = svg.append('g');

        // Zoom
        const zoom = d3.zoom<SVGSVGElement, unknown>()
            .scaleExtent([0.3, 3])
            .on('zoom', e => g.attr('transform', e.transform));
        svg.call(zoom);
        svg.call(zoom.translateBy, 0, 0);

        // Simulation
        const sim = d3.forceSimulation<D3Node>(d3Nodes)
            .force('link', d3.forceLink<D3Node, D3Link>(d3Links).id(d => d.id).distance(d => {
                const risk = (d as D3Link).risk;
                return risk === 'high' ? 80 : risk === 'medium' ? 120 : 160;
            }))
            .force('charge', d3.forceManyBody().strength(-300))
            .force('center', d3.forceCenter(width / 2, height / 2))
            .force('collision', d3.forceCollide().radius(28));

        simRef.current = sim;

        // Edges
        const link = g
            .append('g')
            .selectAll<SVGLineElement, D3Link>('line')
            .data(d3Links)
            .join('line')
            .attr('stroke', d => EDGE_COLORS[d.risk])
            .attr('stroke-width', d => (d.risk === 'high' ? 1.5 : 1))
            .attr('stroke-dasharray', d => (d.risk === 'low' ? '4 3' : 'none'))
            .attr('marker-end', d => `url(#arrow-${d.risk})`);

        // Node groups
        const node = g
            .append('g')
            .selectAll<SVGGElement, D3Node>('g')
            .data(d3Nodes)
            .join('g')
            .attr('cursor', 'pointer')
            .call(
                d3.drag<SVGGElement, D3Node>()
                    .on('start', (event, d) => {
                        if (!event.active) sim.alphaTarget(0.3).restart();
                        d.fx = d.x;
                        d.fy = d.y;
                    })
                    .on('drag', (event, d) => {
                        d.fx = event.x;
                        d.fy = event.y;
                    })
                    .on('end', (event, d) => {
                        if (!event.active) sim.alphaTarget(0);
                        d.fx = null;
                        d.fy = null;
                    })
            )
            .on('click', (event, d) => {
                event.stopPropagation();
                onNodeSelect(d.id);
            });

        // Pulse ring for high-risk
        node
            .filter(d => d.risk === 'high')
            .append('circle')
            .attr('r', 16)
            .attr('fill', 'none')
            .attr('stroke', '#dc2626')
            .attr('stroke-width', 1)
            .attr('opacity', 0.4)
            .attr('class', 'pulse-ring');

        // Node circle
        node
            .append('circle')
            .attr('r', d => (FRAUD_CLUSTER_IDS.includes(d.id) ? 12 : 9))
            .attr('fill', d => NODE_COLORS[d.risk])
            .attr('stroke', d => (d.risk === 'high' ? '#ef4444' : '#52525b'))
            .attr('stroke-width', d => (d.risk === 'high' ? 2 : 0.5))
            .attr('opacity', 0.95);

        // Node label
        node
            .append('text')
            .text(d => d.id)
            .attr('text-anchor', 'middle')
            .attr('dy', '2em')
            .attr('font-size', '9px')
            .attr('font-family', 'JetBrains Mono, monospace')
            .attr('fill', '#71717a')
            .attr('pointer-events', 'none');

        // Highlight selected node
        const updateSelection = (selectedId: string | null) => {
            node.selectAll<SVGCircleElement, D3Node>('circle:nth-child(n+2)')
                .attr('stroke', d =>
                    d.id === selectedId ? '#ffffff' : d.risk === 'high' ? '#ef4444' : '#52525b'
                )
                .attr('stroke-width', d => (d.id === selectedId ? 2.5 : d.risk === 'high' ? 2 : 0.5));
        };
        updateSelection(selectedNodeId);

        sim.on('tick', () => {
            link
                .attr('x1', d => (d.source as D3Node).x!)
                .attr('y1', d => (d.source as D3Node).y!)
                .attr('x2', d => (d.target as D3Node).x!)
                .attr('y2', d => (d.target as D3Node).y!);

            node.attr('transform', d => `translate(${d.x},${d.y})`);
        });

        // Click away to deselect
        svg.on('click', () => onNodeSelect(''));

        return () => {
            sim.stop();
        };
    }, [nodes, edges, dimensions, onNodeSelect]);

    // Update selection highlight without re-running simulation
    useEffect(() => {
        if (!svgRef.current) return;
        d3.select(svgRef.current)
            .selectAll<SVGCircleElement, D3Node>('g > g > circle:nth-child(n+2)')
            .attr('stroke', function (d) {
                return d.id === selectedNodeId ? '#ffffff' : d.risk === 'high' ? '#ef4444' : '#52525b';
            })
            .attr('stroke-width', function (d) {
                return d.id === selectedNodeId ? 2.5 : d.risk === 'high' ? 2 : 0.5;
            });
    }, [selectedNodeId]);

    return (
        <div className="flex flex-col h-full overflow-hidden">
            {/* Header */}
            <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between flex-shrink-0">
                <div>
                    <h2 className="text-xs font-semibold text-[var(--text-primary)] uppercase tracking-widest">
                        Transaction Network
                    </h2>
                    <p className="text-[10px] text-[var(--text-muted)] font-mono mt-0.5">
                        Click node to analyze · Drag to explore · Scroll to zoom
                    </p>
                </div>
                <div className="flex items-center gap-3 text-[10px] font-mono text-[var(--text-muted)]">
                    <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> Suspicious
                    </span>
                    <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" /> Medium
                    </span>
                    <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-zinc-200 inline-block" /> Normal
                    </span>
                </div>
            </div>

            {/* Graph canvas */}
            <div ref={containerRef} className="flex-1 relative overflow-hidden">
                <svg
                    ref={svgRef}
                    className="w-full h-full"
                    style={{ background: 'transparent' }}
                />
                {/* Pulse animation */}
                <style>{`
          @keyframes pulseRing {
            0% { r: 14; opacity: 0.6; }
            100% { r: 24; opacity: 0; }
          }
          .pulse-ring {
            animation: pulseRing 2s ease-out infinite;
          }
        `}</style>
            </div>
        </div>
    );
}
