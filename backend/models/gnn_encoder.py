"""
Graph Neural Network (GNN) Encoder for Topology-Aware Cyber Range Representation.
Implements Graph Convolutional Network (GCN) and Graph Attention Network (GAT) layers natively in PyTorch.
Includes mean+max readout pooling to prevent washing out single-node threats (ML-3).
"""

import os
os.environ["KMP_DUPLICATE_LIB_OK"] = "TRUE"

import torch
import torch.nn as nn
import torch.nn.functional as F

class GraphConvolutionLayer(nn.Module):
    """
    Standard Spectral GCN layer: H^(l+1) = sigma( D^(-1/2) * A_hat * D^(-1/2) * H^(l) * W )
    """
    def __init__(self, in_features: int, out_features: int):
        super(GraphConvolutionLayer, self).__init__()
        self.linear = nn.Linear(in_features, out_features, bias=False)
        self.bias = nn.Parameter(torch.zeros(out_features))
        self.reset_parameters()

    def reset_parameters(self):
        nn.init.xavier_uniform_(self.linear.weight)
        nn.init.zeros_(self.bias)

    def forward(self, x: torch.Tensor, norm_adj: torch.Tensor) -> torch.Tensor:
        # x: [num_nodes, in_features]
        # norm_adj: [num_nodes, num_nodes] (symmetric normalized adjacency)
        support = self.linear(x)
        out = torch.matmul(norm_adj, support) + self.bias
        return out


class GraphAttentionLayer(nn.Module):
    """
    Graph Attention Network (GAT) layer computing dynamic self-attention coefficients:
    alpha_ij = softmax_j( LeakyReLU( a^T [W h_i || W h_j] ) )
    """
    def __init__(self, in_features: int, out_features: int, alpha: float = 0.2):
        super(GraphAttentionLayer, self).__init__()
        self.in_features = in_features
        self.out_features = out_features
        self.alpha = alpha

        self.W = nn.Linear(in_features, out_features, bias=False)
        self.a = nn.Parameter(torch.zeros(size=(2 * out_features, 1)))
        self.leakyrelu = nn.LeakyReLU(self.alpha)
        self.reset_parameters()

    def reset_parameters(self):
        nn.init.xavier_uniform_(self.W.weight)
        nn.init.xavier_uniform_(self.a)

    def forward(self, h: torch.Tensor, adj: torch.Tensor) -> torch.Tensor:
        # h: [num_nodes, in_features]
        # adj: [num_nodes, num_nodes]
        N = h.size(0)
        Wh = self.W(h) # [N, out_features]

        # Construct pairwise concatenated features [N, N, 2*out_features]
        Wh1 = Wh.repeat(1, N).view(N * N, -1)
        Wh2 = Wh.repeat(N, 1)
        all_combinations = torch.cat([Wh1, Wh2], dim=1).view(N, N, 2 * self.out_features)

        # Raw attention scores
        e = self.leakyrelu(torch.matmul(all_combinations, self.a).squeeze(2)) # [N, N]

        # Mask non-adjacent nodes (except self-loops)
        zero_vec = -1e9 * torch.ones_like(e)
        adj_with_loops = adj + torch.eye(N, device=adj.device)
        attention = torch.where(adj_with_loops > 0, e, zero_vec)
        attention = F.softmax(attention, dim=1) # [N, N]

        h_prime = torch.matmul(attention, Wh) # [N, out_features]
        return h_prime


class GNNTopologyEncoder(nn.Module):
    """
    Hybrid GCN-GAT Network that embeds network topology 
    and outputs node-level risk scores + a global graph embedding vector.
    Features dual mean+max pooling (ML-3) so individual host threats are preserved.
    """
    def __init__(self, in_features: int = 8, hidden_dim: int = 32, embedding_dim: int = 16):
        super(GNNTopologyEncoder, self).__init__()
        self.embedding_dim = embedding_dim
        self.gc1 = GraphConvolutionLayer(in_features, hidden_dim)
        self.gat1 = GraphAttentionLayer(hidden_dim, embedding_dim)
        
        # Dual Pooling Projection: [mean_pool || max_pool] (32 -> 16)
        self.readout = nn.Sequential(
            nn.Linear(embedding_dim * 2, embedding_dim),
            nn.ReLU()
        )

        # Risk assessment head for each node
        self.risk_head = nn.Sequential(
            nn.Linear(embedding_dim, 16),
            nn.ReLU(),
            nn.Linear(16, 8),
            nn.ReLU(),
            nn.Linear(8, 1),
            nn.Sigmoid()
        )

    def normalize_adj(self, adj: torch.Tensor) -> torch.Tensor:
        """Add self-loops and degree normalize: D^(-1/2) * (A + I) * D^(-1/2)"""
        num_nodes = adj.size(0)
        adj_loop = adj + torch.eye(num_nodes, device=adj.device)
        degree = torch.sum(adj_loop, dim=1)
        deg_inv_sqrt = torch.pow(degree, -0.5)
        deg_inv_sqrt[torch.isinf(deg_inv_sqrt)] = 0.0
        deg_mat = torch.diag(deg_inv_sqrt)
        return torch.matmul(torch.matmul(deg_mat, adj_loop), deg_mat)

    def forward(self, x: torch.Tensor, adj: torch.Tensor):
        norm_adj = self.normalize_adj(adj)
        
        # Layer 1: GCN Spectral Neighborhood Convolution
        h1 = F.relu(self.gc1(x, norm_adj))
        h1 = F.dropout(h1, p=0.05, training=self.training)
        
        # Layer 2: GAT Attention-Weighted Lateral Propagation
        node_embeddings = self.gat1(h1, adj) # [num_nodes, embedding_dim]
        
        # Global graph embedding: combined mean + max pooling projected to embedding_dim
        mean_pool = torch.mean(node_embeddings, dim=0, keepdim=True) # [1, embedding_dim]
        max_pool = torch.max(node_embeddings, dim=0, keepdim=True)[0] # [1, embedding_dim]
        graph_embedding = self.readout(torch.cat([mean_pool, max_pool], dim=-1)) # [1, embedding_dim]
        
        # Node risk scores
        node_risks = self.risk_head(node_embeddings).squeeze(-1) # [num_nodes]
        
        return {
            "node_embeddings": node_embeddings,
            "graph_embedding": graph_embedding,
            "node_risks": node_risks
        }
