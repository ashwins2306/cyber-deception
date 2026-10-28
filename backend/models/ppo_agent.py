"""
Proximal Policy Optimization (PPO) Actor-Critic Agent.
Makes autonomous responsive deception decisions given GNN topology embeddings.
"""

import os
os.environ["KMP_DUPLICATE_LIB_OK"] = "TRUE"

import torch
import torch.nn as nn
import torch.nn.functional as F

DECEPTION_ACTIONS_LIST = [
    "MONITOR_SUBNET",
    "DEPLOY_DECOY_APACHE",
    "DEPLOY_HONEYTOKEN",
    "ACTIVATE_HIGH_INTERACTION_DECOY",
    "DEPLOY_DECOY_KERBEROS",
    "DYNAMIC_TRAFFIC_REROUTE",
    "RESTORE_HOST",
    "ISOLATE_LATERAL_PATH"
]

class PPOActorCritic(nn.Module):
    def __init__(self, state_dim: int = 16, action_dim: int = len(DECEPTION_ACTIONS_LIST)):
        super(PPOActorCritic, self).__init__()
        
        # Policy Actor Head: pi(a | s)
        self.actor = nn.Sequential(
            nn.Linear(state_dim, 64),
            nn.Tanh(),
            nn.Linear(64, 32),
            nn.Tanh(),
            nn.Linear(32, action_dim)
        )
        
        # Value Critic Head: V(s)
        self.critic = nn.Sequential(
            nn.Linear(state_dim, 64),
            nn.Tanh(),
            nn.Linear(64, 32),
            nn.Tanh(),
            nn.Linear(32, 1)
        )

    def forward(self, state: torch.Tensor):
        # state: [batch_size, state_dim]
        logits = self.actor(state)
        probs = F.softmax(logits, dim=-1)
        value = self.critic(state)
        return probs, value

    def evaluate_action(self, state: torch.Tensor, action: torch.Tensor):
        probs, value = self.forward(state)
        dist = torch.distributions.Categorical(probs)
        action_log_probs = dist.log_prob(action)
        dist_entropy = dist.entropy()
        return action_log_probs, value, dist_entropy

    def select_action(self, state: torch.Tensor, deterministic: bool = True):
        probs, value = self.forward(state)
        if deterministic:
            action_idx = torch.argmax(probs, dim=-1).item()
        else:
            dist = torch.distributions.Categorical(probs)
            action_idx = dist.sample().item()
            
        confidence = probs[0, action_idx].item()
        action_name = DECEPTION_ACTIONS_LIST[action_idx]
        
        return {
            "action_index": action_idx,
            "action_name": action_name,
            "confidence": confidence,
            "critic_value": value.item(),
            "probabilities": {name: probs[0, i].item() for i, name in enumerate(DECEPTION_ACTIONS_LIST)}
        }

    def load_weights(self, weights_path: str) -> bool:
        if os.path.exists(weights_path):
            checkpoint = torch.load(weights_path, map_location="cpu")
            if "ppo" in checkpoint:
                self.load_state_dict(checkpoint["ppo"])
            else:
                self.load_state_dict(checkpoint)
            self.eval()
            return True
        return False
