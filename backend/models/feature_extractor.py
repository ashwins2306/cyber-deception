"""
Canonical Feature Extractor for Network Topology Graphs.
Single source of truth used by both the CybORG emulator and the training pipeline (prevents ML-5 train/serve mismatch).
"""

import torch

def build_graph_features(nodes, edges):
    """
    Constructs normalized adjacency matrix and 8-dimensional node feature tensor.
    
    Features per node:
    0: is_honeypot (1.0 if honeypot, 0.0 otherwise)
    1: compromised (1.0 if compromised, 0.0 otherwise)
    2: under_attack (1.0 if under active attack, 0.0 otherwise)
    3: discovered (1.0 if discovered by adversary, 0.0 otherwise)
    4: normalized_degree (degree / 10.0)
    5: is_router_or_gateway (1.0 if router/gateway, 0.0 otherwise)
    6: is_server_or_db (1.0 if server/database/workstation, 0.0 otherwise)
    7: is_crown_jewel (1.0 if critical crown jewel database/DC, 0.0 otherwise)
    """
    num_nodes = len(nodes)
    node_id_map = {n["id"]: i for i, n in enumerate(nodes)}
    
    adj = torch.zeros((num_nodes, num_nodes), dtype=torch.float32)
    for e in edges:
        src = e["source"] if isinstance(e, dict) else e[0]
        tgt = e["target"] if isinstance(e, dict) else e[1]
        if src in node_id_map and tgt in node_id_map:
            u = node_id_map[src]
            v = node_id_map[tgt]
            adj[u, v] = 1.0
            adj[v, u] = 1.0

    features = []
    for i, n in enumerate(nodes):
        deg = torch.sum(adj[i]).item()
        is_hp = 1.0 if n.get("isHoneypot", False) else 0.0
        comp = 1.0 if n.get("compromised", False) else 0.0
        atk = 1.0 if n.get("underAttack", False) else 0.0
        disc = 1.0 if n.get("discovered", False) else 0.0
        deg_norm = float(deg) / 10.0
        is_rtr = 1.0 if n.get("type") in ["router", "gateway"] else 0.0
        is_srv = 1.0 if n.get("type") in ["server", "database", "workstation"] else 0.0
        is_cj = 1.0 if n.get("isCrownJewel", False) else 0.0

        feat = [is_hp, comp, atk, disc, deg_norm, is_rtr, is_srv, is_cj]
        features.append(feat)

    x = torch.tensor(features, dtype=torch.float32)
    return x, adj, node_id_map
