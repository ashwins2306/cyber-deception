"""
Reinforcement Learning Training Pipeline for CybORG Responsive Cyber Deception.
Trains the Hybrid GCN-GAT Topology Encoder and PPO Actor-Critic Deception Agent
using Generalized Advantage Estimation (GAE) and Clipped Surrogate PPO Policy Updates.
Fixes ML-1 through ML-8.
"""

import os
import sys
import random
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(ROOT_DIR))

os.environ["KMP_DUPLICATE_LIB_OK"] = "TRUE"

import torch
import torch.nn as nn
import torch.nn.functional as F
import torch.optim as optim
import numpy as np

# ML-7: Set reproducible random seeds
SEED = 42
random.seed(SEED)
np.random.seed(SEED)
torch.manual_seed(SEED)

from backend.models.gnn_encoder import GNNTopologyEncoder
from backend.models.ppo_agent import PPOActorCritic, DECEPTION_ACTIONS_LIST
from backend.models.feature_extractor import build_graph_features
from backend.env.cyborg_emulator import CybORGEnvironment, ATTACK_SEQUENCE

def compute_topological_risk_targets(nodes, edges):
    """
    Computes authentic topological risk targets based on proximity to compromised/attacked nodes (ML-6).
    Replaces static handcoded constants with dynamic threat reachability.
    """
    node_id_map = {n["id"]: i for i, n in enumerate(nodes)}
    num_nodes = len(nodes)
    
    # Distance / adjacency
    adj = {n["id"]: [] for n in nodes}
    for e in edges:
        src = e["source"] if isinstance(e, dict) else e[0]
        tgt = e["target"] if isinstance(e, dict) else e[1]
        if src in adj and tgt in adj:
            adj[src].append(tgt)
            adj[tgt].append(src)

    compromised_or_attacked = [
        n["id"] for n in nodes if n.get("compromised", False) or n.get("underAttack", False)
    ]

    target_risks = []
    for n in nodes:
        nid = n["id"]
        base = 0.20
        if n.get("isCrownJewel", False):
            base = 0.65
        elif n.get("type") in ["server", "database"]:
            base = 0.45
        elif n.get("type") == "router":
            base = 0.30

        # If directly compromised or attacked
        if n.get("compromised", False):
            risk = min(1.0, base + 0.35)
        elif n.get("underAttack", False):
            risk = min(0.95, base + 0.25)
        elif any(neighbor in compromised_or_attacked for neighbor in adj.get(nid, [])):
            risk = min(0.90, base + 0.20)
        else:
            risk = base

        target_risks.append(risk)

    return torch.tensor(target_risks, dtype=torch.float32)


def train():
    print("==================================================================")
    print("🧠 INITIATING TRUE PPO ACTOR-CRITIC REINFORCEMENT LEARNING 🧠")
    print("==================================================================")

    device = torch.device("cpu")
    gnn = GNNTopologyEncoder(in_features=8, hidden_dim=32, embedding_dim=16).to(device)
    ppo = PPOActorCritic(state_dim=16, action_dim=len(DECEPTION_ACTIONS_LIST)).to(device)

    optimizer_gnn = optim.Adam(gnn.parameters(), lr=0.003, weight_decay=1e-4)
    optimizer_ppo = optim.Adam(ppo.parameters(), lr=0.002, weight_decay=1e-4)
    criterion_gnn = nn.MSELoss()

    env = CybORGEnvironment()

    GAMMA = 0.95
    GAE_LAMBDA = 0.90
    CLIP_EPS = 0.20
    ENTROPY_COEF = 0.005
    VALUE_COEF = 0.50
    NUM_EPISODES = 400
    PPO_EPOCHS = 6
    LR_PPO = 0.003

    print(f"✔ Environment initialized: 11 nodes, {len(env.edges)} edges")
    print(f"✔ Action space: {len(DECEPTION_ACTIONS_LIST)} deception primitives")
    print(f"✔ Training over {NUM_EPISODES} adversarial multi-stage rollout episodes...\n")

    for episode in range(1, NUM_EPISODES + 1):
        env.reset()
        episode_states = []
        episode_actions = []
        episode_log_probs = []
        episode_rewards = []
        episode_values = []
        episode_dones = []
        episode_risks_loss = []

        # Adversary executes multi-stage attack campaign with stochastic exploratory variations
        attack_plan = list(ATTACK_SEQUENCE)
        # Randomize adversary attack target occasionally to train broad policy robustness (ML-4)
        if random.random() < 0.30:
            random.shuffle(attack_plan)

        for step_idx, vector_id in enumerate(attack_plan):
            # 1. GNN forward pass on active topology
            x, adj, _ = build_graph_features(env.nodes, env.edges)
            target_risks = compute_topological_risk_targets(env.nodes, env.edges)

            gnn_res = gnn(x, adj)
            loss_risk = criterion_gnn(gnn_res["node_risks"], target_risks)
            episode_risks_loss.append(loss_risk)

            state_emb = gnn_res["graph_embedding"]

            # 2. PPO Actor selects action with exploration
            probs, value = ppo(state_emb)
            dist = torch.distributions.Categorical(probs)
            action = dist.sample()
            log_prob = dist.log_prob(action)

            action_idx = action.item()
            action_name = DECEPTION_ACTIONS_LIST[action_idx]

            # 3. Environment steps with authentic causal defense (SIM-1, SIM-2)
            step_res = env.step_simulation(
                vector_id=vector_id,
                ppo_action_override=action_name
            )

            # Calculate RL reward signal with context sensitivity
            reward = step_res["reward"]
            if vector_id == "recon_syn_scan":
                if action_name in ["DEPLOY_DECOY_APACHE", "MONITOR_SUBNET"]:
                    reward += 2.0
            elif vector_id == "sql_injection_exfil":
                if action_name in ["DEPLOY_HONEYTOKEN", "DEPLOY_DECOY_APACHE"]:
                    reward += 2.5
            elif vector_id == "path_traversal_file_read":
                if action_name in ["ISOLATE_LATERAL_PATH", "DEPLOY_HONEYTOKEN"]:
                    reward += 3.0
            elif vector_id == "credential_stuffing_ssh":
                if action_name in ["ACTIVATE_HIGH_INTERACTION_DECOY", "DEPLOY_DECOY_KERBEROS", "ISOLATE_LATERAL_PATH"]:
                    reward += 3.5
            elif vector_id == "remote_code_execution":
                if action_name in ["DYNAMIC_TRAFFIC_REROUTE", "ACTIVATE_HIGH_INTERACTION_DECOY", "ISOLATE_LATERAL_PATH"]:
                    reward += 4.0

            # Severe penalty if crown jewel was breached
            cj = next((n for n in env.nodes if n.get("isCrownJewel")), None)
            if cj and cj.get("compromised"):
                reward -= 15.0

            done = (step_idx == len(attack_plan) - 1)

            episode_states.append(state_emb.detach())
            episode_actions.append(action)
            episode_log_probs.append(log_prob.detach())
            episode_rewards.append(reward)
            episode_values.append(value.detach())
            episode_dones.append(done)

            if done:
                break

        # Compute GAE (Generalized Advantage Estimation)
        with torch.no_grad():
            T = len(episode_rewards)
            advantages = torch.zeros(T, dtype=torch.float32)
            returns = torch.zeros(T, dtype=torch.float32)
            last_gae_lam = 0.0

            for t in reversed(range(T)):
                if t == T - 1:
                    next_val = 0.0
                else:
                    next_val = episode_values[t + 1].item()
                delta = episode_rewards[t] + GAMMA * next_val * (1.0 - float(episode_dones[t])) - episode_values[t].item()
                last_gae_lam = delta + GAMMA * GAE_LAMBDA * (1.0 - float(episode_dones[t])) * last_gae_lam
                advantages[t] = last_gae_lam
                returns[t] = advantages[t] + episode_values[t].item()

        # Stack trajectory tensors
        states_tensor = torch.cat(episode_states, dim=0) # [T, 16]
        actions_tensor = torch.stack(episode_actions)     # [T]
        old_log_probs = torch.stack(episode_log_probs)   # [T]
        adv_tensor = (advantages - advantages.mean()) / (advantages.std() + 1e-8)
        returns_tensor = returns.unsqueeze(-1)           # [T, 1]

        # PPO Optimization Epochs
        for _ in range(PPO_EPOCHS):
            new_log_probs, new_values, entropy = ppo.evaluate_action(states_tensor, actions_tensor)
            
            # Policy ratio: r_t(theta) = pi_theta(a|s) / pi_old(a|s)
            ratios = torch.exp(new_log_probs - old_log_probs)

            # Clipped surrogate objective
            surr1 = ratios * adv_tensor
            surr2 = torch.clamp(ratios, 1.0 - CLIP_EPS, 1.0 + CLIP_EPS) * adv_tensor
            actor_loss = -torch.min(surr1, surr2).mean()

            # Critic value loss
            critic_loss = F.mse_loss(new_values, returns_tensor)

            # Combined PPO loss with entropy bonus for exploration (ML-4)
            total_ppo_loss = actor_loss + VALUE_COEF * critic_loss - ENTROPY_COEF * entropy.mean()

            optimizer_ppo.zero_grad()
            total_ppo_loss.backward()
            nn.utils.clip_grad_norm_(ppo.parameters(), max_norm=0.5)
            optimizer_ppo.step()

        # Update GNN encoder
        if episode_risks_loss:
            avg_gnn_loss = torch.stack(episode_risks_loss).mean()
            optimizer_gnn.zero_grad()
            avg_gnn_loss.backward()
            nn.utils.clip_grad_norm_(gnn.parameters(), max_norm=0.5)
            optimizer_gnn.step()

        # Logging (ML-8)
        if episode % 25 == 0 or episode == NUM_EPISODES:
            ep_return = sum(episode_rewards)
            avg_val = torch.cat(episode_values).mean().item()
            gnn.eval()
            ppo.eval()
            with torch.no_grad():
                test_x, test_adj, _ = build_graph_features(env.nodes, env.edges)
                test_emb = gnn(test_x, test_adj)["graph_embedding"]
                action_info = ppo.select_action(test_emb, deterministic=True)
            gnn.train()
            ppo.train()

            print(f"Episode [{episode:03d}/{NUM_EPISODES}] | Ep Return: {ep_return:+5.1f} | Value V(s): {avg_val:5.2f} | PPO Action: {action_info['action_name']:<30} (Conf: {action_info['confidence']*100:.1f}%)")

    # Save trained checkpoint weights
    weights_dir = ROOT_DIR / "backend" / "weights"
    weights_dir.mkdir(parents=True, exist_ok=True)
    weights_path = weights_dir / "ppo_gnn_weights.pt"

    checkpoint = {
        "gnn": gnn.state_dict(),
        "ppo": ppo.state_dict(),
        "actions": DECEPTION_ACTIONS_LIST,
        "episodes": NUM_EPISODES,
        "seed": SEED,
    }
    torch.save(checkpoint, str(weights_path))
    print(f"\n✔ PPO training completed! Saved weights to: {weights_path}")
    print(f"   Size: {os.path.getsize(weights_path) / 1024:.1f} KB")

if __name__ == "__main__":
    train()
