"""
graph_engine.py — Quantora AI Transaction Graph Engine
=======================================================

Maintains an in-memory transaction network graph using NetworkX.
Provides real-time graph feature extraction for the SAGRA algorithm.

Architecture Notes (Prototype vs. Production):
    ┌─────────────────────────────────────────────────────────────┐
    │  CURRENT (Prototype / Demo)                                 │
    │  • In-memory NetworkX graph                                 │
    │  • Single-process, no persistence                           │
    │  • Centrality recalculated on each request                  │
    │  • Suitable for demos, presentations, and local testing     │
    └─────────────────────────────────────────────────────────────┘

    ┌─────────────────────────────────────────────────────────────┐
    │  PRODUCTION (Enterprise Deployment)                         │
    │  • Neo4j or Amazon Neptune for persistent graph storage     │
    │  • Apache Kafka / Pulsar for streaming transaction ingestion│
    │  • Incremental centrality updates (not full recomputation)  │
    │  • Graph partitioning for horizontal scaling                │
    │  • Cached centrality scores with TTL-based invalidation     │
    │  • Target: <200ms end-to-end inference latency              │
    └─────────────────────────────────────────────────────────────┘

Centrality Recalculation Trade-offs:
    - Full recalculation (current): O(V + E) per request. Acceptable for
      graphs with <10K nodes. Provides exact centrality values.
    - Incremental update: Only recompute affected neighborhoods. Much faster
      for large graphs but introduces approximation error.
    - Cached with TTL: Pre-compute centrality periodically (e.g., every 60s).
      Near-zero latency at read time but stale by up to TTL duration.
    - For production with millions of nodes, incremental + caching is
      the recommended hybrid approach.
"""

import networkx as nx
from typing import Dict, Optional, Union

NodeId = Union[int, str]


class TransactionGraph:
    """
    In-memory directed graph representing the transaction network.

    Each node is an account (identified by integer ID).
    Each edge represents a transaction from sender → receiver,
    weighted by transaction amount.

    This prototype uses NetworkX for simplicity and rapid iteration.
    In production, this would be backed by a graph database (Neo4j,
    Amazon Neptune, or TigerGraph) with streaming ingestion.
    """

    def __init__(self):
        """
        Initialize an empty directed graph.

        Using a DiGraph (directed graph) because transaction flow
        direction matters for fraud detection — money flows from
        sender to receiver, and fan-out patterns are directional.
        """
        self._graph: nx.DiGraph = nx.DiGraph()
        self._degree_cache: Optional[Dict[int, float]] = None

    @property
    def graph(self) -> nx.DiGraph:
        """Access the underlying NetworkX graph."""
        return self._graph

    @property
    def node_count(self) -> int:
        """Return the number of nodes in the graph."""
        return self._graph.number_of_nodes()

    @property
    def edge_count(self) -> int:
        """Return the number of edges in the graph."""
        return self._graph.number_of_edges()

    def add_transaction(self, sender: NodeId, receiver: NodeId, amount: float) -> None:
        """
        Add a transaction edge to the graph.

        If nodes don't exist, they are automatically created.
        If an edge already exists between sender and receiver,
        it is updated with the new amount (latest transaction wins).

        In production, edges would accumulate (multi-edge graph) or
        aggregate (sum of amounts), depending on the analysis needs.

        Args:
            sender: Sender account ID.
            receiver: Receiver account ID.
            amount: Transaction amount in USD.
        """
        # Invalidate cached centrality since graph topology changed
        self._degree_cache = None

        # Add or update edge with amount as weight
        self._graph.add_edge(sender, receiver, amount=amount)

    def get_sender_degree(self, sender: NodeId) -> float:
        """
        Compute the degree centrality of a sender node.

        Degree centrality is defined as:
            C_d(v) = deg(v) / (N - 1)

        where deg(v) is the number of edges connected to node v,
        and N is the total number of nodes in the graph.

        This uses the undirected degree (in + out) because for fraud
        detection, both incoming and outgoing connections indicate
        network involvement.

        Note on caching:
            Centrality is cached after the first computation and
            invalidated when the graph changes (add_transaction).
            For production, consider TTL-based caching or incremental
            updates instead of full recomputation.

        Args:
            sender: The sender account ID to query.

        Returns:
            Degree centrality as a float in [0, 1].
            Returns 0.0 if the node does not exist in the graph.
        """
        if sender not in self._graph:
            return 0.0

        # Use cached centrality if available
        if self._degree_cache is None:
            # Full recomputation — acceptable for prototype scale
            # Production: use incremental centrality algorithms
            self._degree_cache = nx.degree_centrality(self._graph)

        return self._degree_cache.get(sender, 0.0)

    def get_graph_stats(self) -> Dict:
        """
        Return summary statistics about the current graph state.

        Useful for monitoring, debugging, and dashboard display.

        Returns:
            Dictionary with node_count, edge_count, and density.
        """
        return {
            "node_count": self.node_count,
            "edge_count": self.edge_count,
            "density": round(nx.density(self._graph), 6) if self.node_count > 1 else 0.0,
        }

    def get_all_centralities(self) -> Dict[NodeId, float]:
        """
        Return degree centrality for all nodes.

        Used for bulk analysis and visualization.

        Returns:
            Dictionary mapping node ID → degree centrality.
        """
        if self._degree_cache is None:
            self._degree_cache = nx.degree_centrality(self._graph)
        return dict(self._degree_cache)

    def reset(self) -> None:
        """
        Clear the entire graph. Used for testing and demos.
        """
        self._graph.clear()
        self._degree_cache = None


# ── Module-level singleton ──────────────────────────────────────
# Single shared graph instance for the application.
# In production, this would be replaced by a connection pool
# to a distributed graph database.
transaction_graph = TransactionGraph()
