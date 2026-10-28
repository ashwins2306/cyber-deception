"""
CybORG-Inspired Adaptive Cyber Range Simulation Engine.
Models multi-stage adversary campaigns and autonomous deception defense.
Implements genuine defensive causality: defender actions modify network state,
and attacks breach real assets if defenses are absent (SIM-1, SIM-2, SIM-3).
"""

import os
os.environ["KMP_DUPLICATE_LIB_OK"] = "TRUE"

import uuid
from collections import deque
from pathlib import Path
from typing import Dict, Any, List, Optional
import numpy as np
import torch

from ..models.gnn_encoder import GNNTopologyEncoder
from ..models.ppo_agent import PPOActorCritic, DECEPTION_ACTIONS_LIST
from ..models.feature_extractor import build_graph_features

INITIAL_NODES = [
    {
        "id": "gateway", "label": "Perimeter Gateway", "ip": "10.0.1.1", "subnet": "DMZ",
        "type": "gateway", "services": ["Firewall", "NAT", "BGP"], "os": "VyOS 1.4",
        "isHoneypot": False, "compromised": False, "underAttack": False, "gnnRisk": 0.18,
        "x": 60, "y": 200, "discovered": True
    },
    {
        "id": "web-public", "label": "Public Web Portal", "ip": "10.0.1.10", "subnet": "DMZ",
        "type": "server", "services": ["Apache/2.4.52", "PHP 8.1", "HTTPS"], "os": "Ubuntu 22.04",
        "isHoneypot": False, "compromised": False, "underAttack": False, "gnnRisk": 0.45,
        "x": 180, "y": 120, "discovered": True
    },
    {
        "id": "vpn-gw", "label": "Corporate VPN", "ip": "10.0.1.20", "subnet": "DMZ",
        "type": "gateway", "services": ["OpenVPN", "WireGuard"], "os": "Debian 11",
        "isHoneypot": False, "compromised": False, "underAttack": False, "gnnRisk": 0.28,
        "x": 180, "y": 280, "discovered": True
    },
    {
        "id": "corp-router", "label": "Internal Router", "ip": "10.0.2.1", "subnet": "Internal",
        "type": "router", "services": ["OSPF", "NAT"], "os": "Cisco IOS-XE",
        "isHoneypot": False, "compromised": False, "underAttack": False, "gnnRisk": 0.35,
        "x": 320, "y": 200, "discovered": False
    },
    {
        "id": "workstation-1", "label": "HR Workstation", "ip": "10.0.2.101", "subnet": "Internal",
        "type": "workstation", "services": ["RDP", "SMBv3", "SSH"], "os": "Windows 11 Enterprise",
        "isHoneypot": False, "compromised": False, "underAttack": False, "gnnRisk": 0.42,
        "x": 420, "y": 90, "discovered": False
    },
    {
        "id": "workstation-2", "label": "Eng Workstation", "ip": "10.0.2.102", "subnet": "Internal",
        "type": "workstation", "services": ["Docker", "SSH", "VSCode-Server"], "os": "Ubuntu 22.04",
        "isHoneypot": False, "compromised": False, "underAttack": False, "gnnRisk": 0.52,
        "x": 420, "y": 170, "discovered": False
    },
    {
        "id": "decoy-hr-backup", "label": "HR-Payroll-Backup [DECOY]", "ip": "10.0.2.199", "subnet": "Internal",
        "type": "honeypot", "services": ["SMBv1 (Emulated)", "Apache Decoy", "Fake Kerberos"], "os": "Cowrie / Honeyd Emulated",
        "isHoneypot": True, "honeypotType": "Low-Interaction SMB & Decoy Apache",
        "compromised": False, "underAttack": False, "gnnRisk": 0.55,
        "x": 420, "y": 250, "discovered": False, "disguiseAs": "Payroll Database Backup"
    },
    {
        "id": "active-directory", "label": "Domain Controller", "ip": "10.0.2.5", "subnet": "Internal",
        "type": "server", "services": ["LDAP", "Kerberos", "DNS", "SMB"], "os": "Windows Server 2022",
        "isHoneypot": False, "compromised": False, "underAttack": False, "gnnRisk": 0.65,
        "x": 420, "y": 330, "discovered": False
    },
    {
        "id": "core-switch", "label": "Core Backbone Switch", "ip": "10.0.3.1", "subnet": "Core",
        "type": "router", "services": ["VLAN Trunk", "ACL Filter"], "os": "Arista EOS",
        "isHoneypot": False, "compromised": False, "underAttack": False, "gnnRisk": 0.40,
        "x": 560, "y": 200, "discovered": False
    },
    {
        "id": "prod-database", "label": "Enterprise Crown-Jewel DB", "ip": "10.0.3.50", "subnet": "Core",
        "type": "database", "services": ["PostgreSQL 15 (Encrypted)", "SSH Key Only"], "os": "RedHat Enterprise Linux 9",
        "isHoneypot": False, "compromised": False, "underAttack": False, "gnnRisk": 0.70,
        "x": 680, "y": 120, "discovered": False, "isCrownJewel": True
    },
    {
        "id": "decoy-db-replica", "label": "DB-Primary-Replica [DECOY]", "ip": "10.0.3.55", "subnet": "Core",
        "type": "honeypot", "services": ["PostgreSQL 12 (Vulnerable Mock)", "Decoy SSH"], "os": "Kippo / Dynamic Decoy",
        "isHoneypot": True, "honeypotType": "High-Interaction Decoy Database",
        "compromised": False, "underAttack": False, "gnnRisk": 0.58,
        "x": 680, "y": 280, "discovered": False, "disguiseAs": "Production Database Replica"
    }
]

INITIAL_EDGES = [
    {"source": "gateway", "target": "web-public"},
    {"source": "gateway", "target": "vpn-gw"},
    {"source": "web-public", "target": "corp-router"},
    {"source": "vpn-gw", "target": "corp-router"},
    {"source": "corp-router", "target": "workstation-1"},
    {"source": "corp-router", "target": "workstation-2"},
    {"source": "corp-router", "target": "decoy-hr-backup"},
    {"source": "corp-router", "target": "active-directory"},
    {"source": "workstation-2", "target": "decoy-hr-backup"},
    {"source": "workstation-2", "target": "core-switch"},
    {"source": "active-directory", "target": "core-switch"},
    {"source": "core-switch", "target": "prod-database"},
    {"source": "core-switch", "target": "decoy-db-replica"}
]

ATTACK_SEQUENCE = [
    "recon_syn_scan",
    "sql_injection_exfil",
    "path_traversal_file_read",
    "credential_stuffing_ssh",
    "remote_code_execution"
]

class CybORGEnvironment:
    def __init__(self):
        self.nodes = [dict(n) for n in INITIAL_NODES]
        self.edges = [dict(e) for e in INITIAL_EDGES]
        
        # Explicit counter separation (SIM-4)
        self.campaign_index = 0   # Index into the 5-step automated campaign (0 to 5)
        self.total_actions = 0    # Total count of all executed actions
        self.campaign_done = False # Explicit completion state
        
        self.cumulative_reward = 0.0
        self.dwell_time_decoy = 0
        self.dwell_time_real = 0
        self.trapped_attacks = 0
        self.history = deque(maxlen=200) # Bounded history (API-6)

        # Persistent defender state for causal interaction (SIM-1, SIM-2)
        self.active_defense = {
            "decoy_apache": False,
            "honeytokens": set(),
            "isolated_paths": set(),
            "high_interaction_decoys": set(),
            "rerouted_subnets": set(),
            "restored_hosts": set(),
        }

        # Instantiate AI Models
        self.gnn = GNNTopologyEncoder(in_features=8, hidden_dim=32, embedding_dim=16)
        self.ppo = PPOActorCritic(state_dim=16, action_dim=len(DECEPTION_ACTIONS_LIST))

        weights_path = Path(__file__).resolve().parent.parent / "weights" / "ppo_gnn_weights.pt"
        if weights_path.exists():
            try:
                checkpoint = torch.load(str(weights_path), map_location="cpu")
                if "gnn" in checkpoint:
                    self.gnn.load_state_dict(checkpoint["gnn"], strict=False)
                if "ppo" in checkpoint:
                    self.ppo.load_state_dict(checkpoint["ppo"], strict=False)
                print(f"✔ Successfully loaded trained PPO & GNN weights from {weights_path}")
            except Exception as e:
                print(f"⚠ Notice: Could not load older weights ({e}). Running with fresh weights.")
        else:
            print("⚠ Notice: Running with uncalibrated network weights.")

        self.gnn.eval()
        self.ppo.eval()
        self.run_gnn_inference()

    @property
    def step_count(self) -> int:
        """Backwards compatibility for step_count property"""
        return self.campaign_index

    def run_gnn_inference(self):
        """Runs PyTorch GNN on active topology using shared feature extractor (ML-5)"""
        x, adj, _ = build_graph_features(self.nodes, self.edges)
        with torch.no_grad():
            res = self.gnn(x, adj)
            risks = res["node_risks"].tolist()
            for i, n in enumerate(self.nodes):
                n["gnnRisk"] = round(float(risks[i]), 2)
            graph_emb = res["graph_embedding"]
        return graph_emb

    def apply_defense_action(self, action_name: str):
        """Applies persistent defensive state changes based on chosen action (SIM-1, SIM-2)"""
        if action_name == "DEPLOY_DECOY_APACHE":
            self.active_defense["decoy_apache"] = True
            for n in self.nodes:
                if n["id"] == "decoy-web-apache":
                    n["discovered"] = True

        elif action_name == "DEPLOY_HONEYTOKEN":
            self.active_defense["honeytokens"].add("workstation-2")
            self.active_defense["honeytokens"].add("decoy-hr-backup")

        elif action_name == "ISOLATE_LATERAL_PATH":
            self.active_defense["isolated_paths"].add("workstation-2:core-switch")
            self.active_defense["isolated_paths"].add("corp-router:prod-database")
            # Ensure edge to honeypot exists
            if not any(e["source"] == "workstation-2" and e["target"] == "decoy-hr-backup" for e in self.edges):
                self.edges.append({"source": "workstation-2", "target": "decoy-hr-backup"})

        elif action_name == "ACTIVATE_HIGH_INTERACTION_DECOY":
            self.active_defense["high_interaction_decoys"].add("decoy-hr-backup")
            self.active_defense["high_interaction_decoys"].add("decoy-db-replica")

        elif action_name == "DYNAMIC_TRAFFIC_REROUTE":
            self.active_defense["rerouted_subnets"].add("Core")
            self.active_defense["rerouted_subnets"].add("Internal")

        elif action_name == "RESTORE_HOST":
            # Revert compromised workstations to clean state
            for n in self.nodes:
                if n["id"] in ["workstation-1", "workstation-2"] and n.get("compromised"):
                    n["compromised"] = False
                    n["underAttack"] = False
                    self.active_defense["restored_hosts"].add(n["id"])

    def step_simulation(
        self,
        vector_id: Optional[str] = None,
        target_override: Optional[str] = None,
        ppo_action_override: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Advances simulation with authentic defensive causality (SIM-1, SIM-2).
        If vector_id is omitted, advances the automated campaign index.
        """
        is_auto_step = (vector_id is None)

        if is_auto_step:
            if self.campaign_done or self.campaign_index >= len(ATTACK_SEQUENCE):
                self.campaign_done = True
                return {
                    "step": self.campaign_index,
                    "vector_id": "completed",
                    "target": "isolated",
                    "custom_decoy_triggered": False,
                    "target_label": "Campaign Neutralized",
                    "reward": 0.0,
                    "cumulative_reward": self.cumulative_reward,
                    "ppo_decision": {"action_id": 0, "action_name": "RESTORE_HOST", "confidence": 1.0},
                    "dwell_decoy": self.dwell_time_decoy,
                    "dwell_real": self.dwell_time_real,
                    "trapped_attacks": self.trapped_attacks,
                    "total_attacks": self.total_actions,
                    "completed": True,
                }
            vector_id = ATTACK_SEQUENCE[self.campaign_index]
            self.campaign_index += 1
            if self.campaign_index >= len(ATTACK_SEQUENCE):
                self.campaign_done = True

        self.total_actions += 1
        graph_emb = self.run_gnn_inference()

        # PPO selects autonomous deception action
        with torch.no_grad():
            ppo_decision = self.ppo.select_action(graph_emb, deterministic=True)

        if ppo_action_override:
            if ppo_action_override in DECEPTION_ACTIONS_LIST:
                ppo_decision["action_name"] = ppo_action_override
                ppo_decision["action_index"] = DECEPTION_ACTIONS_LIST.index(ppo_action_override)
            else:
                ppo_decision["action_name"] = ppo_action_override

        # Apply defense action to persistent state
        self.apply_defense_action(ppo_decision["action_name"])
        action = ppo_decision["action_name"]

        custom_decoys = [
            n for n in self.nodes 
            if n.get("isHoneypot", False) and n["id"] not in ["decoy-hr-backup", "decoy-db-replica", "decoy-web-apache"]
        ]

        target_node = None
        reward = 1.0
        custom_decoy_triggered = False

        # ---------------------------------------------------------
        # VECTOR 1: Stealth Reconnaissance
        # ---------------------------------------------------------
        if vector_id == "recon_syn_scan":
            target_id = target_override or "web-public"
            for n in self.nodes:
                if n["id"] == target_id:
                    n["underAttack"] = True
                    n["discovered"] = True
                    target_node = n
                if n["subnet"] == "DMZ":
                    n["discovered"] = True
            reward = 0.5
            self.dwell_time_real += 15

        # ---------------------------------------------------------
        # VECTOR 2: Public Web Application Ingress
        # ---------------------------------------------------------
        elif vector_id == "sql_injection_exfil":
            target_id = target_override or "web-public"
            for n in self.nodes:
                if n["id"] == target_id:
                    n["compromised"] = True
                    n["underAttack"] = False
                    target_node = n
                if n["id"] == "corp-router":
                    n["discovered"] = True
            reward = 2.0
            self.dwell_time_real += 25

        # ---------------------------------------------------------
        # VECTOR 3: Lateral Movement & Engineering Pivot
        # ---------------------------------------------------------
        elif vector_id == "path_traversal_file_read":
            internal_custom_decoy = next(
                (c for c in custom_decoys if c.get("subnet") == "Internal" or c.get("neighborOf") in ["workstation-1", "workstation-2", "corp-router"]),
                None
            )
            # Causal determination: Honeytoken or path isolation lures attacker to decoy
            is_defended = (
                "workstation-2" in self.active_defense["honeytokens"] or
                "workstation-2:core-switch" in self.active_defense["isolated_paths"] or
                action in ["ISOLATE_LATERAL_PATH", "DEPLOY_HONEYTOKEN", "DEPLOY_DECOY_KERBEROS", "ACTIVATE_HIGH_INTERACTION_DECOY"] or
                internal_custom_decoy is not None
            )

            if target_override and target_override == "workstation-2" and not is_defended:
                # Undefended path traversal compromises workstation-2
                for n in self.nodes:
                    if n["id"] == "workstation-2":
                        n["underAttack"] = True
                        n["compromised"] = True
                        n["discovered"] = True
                        target_node = n
                reward = -5.0
                self.dwell_time_real += 60
            else:
                # Successfully lured to honeypot
                honeypot_target_id = internal_custom_decoy["id"] if internal_custom_decoy else "decoy-hr-backup"
                if target_override and target_override.startswith("decoy"):
                    honeypot_target_id = target_override
                    custom_decoy_triggered = True
                elif internal_custom_decoy:
                    custom_decoy_triggered = True

                for n in self.nodes:
                    if n["id"] == honeypot_target_id:
                        n["underAttack"] = True
                        n["compromised"] = True
                        n["discovered"] = True
                        target_node = n
                    elif n["id"] == "workstation-2":
                        n["underAttack"] = False
                        n["discovered"] = True
                    if n["id"] in ["workstation-1", "corp-router", "decoy-hr-backup"]:
                        n["discovered"] = True

                if not any(e["source"] == "workstation-2" and e["target"] == honeypot_target_id for e in self.edges):
                    self.edges.append({"source": "workstation-2", "target": honeypot_target_id})

                reward = 5.5 if custom_decoy_triggered else 4.0
                self.dwell_time_decoy += 120 if custom_decoy_triggered else 90
                self.trapped_attacks += 1

        # ---------------------------------------------------------
        # VECTOR 4: Credential Stuffing & SSH Spray (CAUSAL DEFENSE)
        # ---------------------------------------------------------
        elif vector_id == "credential_stuffing_ssh":
            internal_custom_decoy = next(
                (c for c in custom_decoys if c.get("subnet") == "Internal"),
                None
            )
            # Causal check: is defense active against credential stuffing?
            has_defense = (
                "decoy-hr-backup" in self.active_defense["high_interaction_decoys"] or
                "workstation-2:core-switch" in self.active_defense["isolated_paths"] or
                action in ["ACTIVATE_HIGH_INTERACTION_DECOY", "DEPLOY_HONEYTOKEN", "DEPLOY_DECOY_KERBEROS", "ISOLATE_LATERAL_PATH"] or
                internal_custom_decoy is not None
            )

            # If user targeted DC or defense is inactive (e.g. MONITOR_SUBNET or no defense), DC breaches!
            is_failure = (target_override == "active-directory" and not has_defense) or (not has_defense and not internal_custom_decoy and action == "MONITOR_SUBNET")

            if is_failure:
                for n in self.nodes:
                    if n["id"] == "active-directory":
                        n["underAttack"] = True
                        n["compromised"] = True
                        n["discovered"] = True
                        target_node = n
                reward = -15.0
                self.dwell_time_real += 120
            else:
                # Decoy captures the brute-force attack
                target_id = target_override if (target_override and target_override.startswith("decoy")) else (internal_custom_decoy["id"] if internal_custom_decoy else "decoy-hr-backup")
                if internal_custom_decoy or (target_override and target_override.startswith("decoy")):
                    custom_decoy_triggered = True

                for n in self.nodes:
                    if n["id"] == target_id:
                        n["underAttack"] = True
                        n["compromised"] = True
                        n["discovered"] = True
                        target_node = n
                    if n["id"] in ["workstation-1", "workstation-2", "active-directory"]:
                        n["underAttack"] = False

                reward = 7.5 if custom_decoy_triggered else 5.0
                self.dwell_time_decoy += 180 if custom_decoy_triggered else 120
                self.trapped_attacks += 1

        # ---------------------------------------------------------
        # VECTOR 5: Database Penetration & RCE (CAUSAL DEFENSE)
        # ---------------------------------------------------------
        elif vector_id == "remote_code_execution":
            core_custom_decoy = next(
                (c for c in custom_decoys if c.get("subnet") == "Core"),
                None
            )
            # Causal check: is Core defense active?
            has_core_defense = (
                "Core" in self.active_defense["rerouted_subnets"] or
                "decoy-db-replica" in self.active_defense["high_interaction_decoys"] or
                "corp-router:prod-database" in self.active_defense["isolated_paths"] or
                action in ["DYNAMIC_TRAFFIC_REROUTE", "ACTIVATE_HIGH_INTERACTION_DECOY", "DEPLOY_DECOY_APACHE", "ISOLATE_LATERAL_PATH"] or
                core_custom_decoy is not None
            )

            # Failure: direct database attack with no defense, or MONITOR_SUBNET with no active countermeasures
            is_db_breach = (target_override == "prod-database" and not has_core_defense) or (not has_core_defense and action == "MONITOR_SUBNET")

            if is_db_breach:
                # AUTHENTIC FAILURE STATE: Crown Jewel Database is compromised!
                for n in self.nodes:
                    if n["id"] == "prod-database":
                        n["underAttack"] = True
                        n["compromised"] = True
                        n["discovered"] = True
                        target_node = n
                reward = -30.0
                self.dwell_time_real += 240
            else:
                # Decoy captures database exploit
                target_id = target_override if (target_override and target_override.startswith("decoy")) else (core_custom_decoy["id"] if core_custom_decoy else "decoy-db-replica")
                if core_custom_decoy or (target_override and target_override.startswith("decoy")):
                    custom_decoy_triggered = True

                for n in self.nodes:
                    if n["id"] == target_id:
                        n["underAttack"] = True
                        n["compromised"] = True
                        n["discovered"] = True
                        target_node = n
                    if n["id"] in ["core-switch", "prod-database"]:
                        n["discovered"] = True
                    if n["id"] == "prod-database" and not n.get("compromised", False):
                        n["underAttack"] = False

                reward = 9.0 if custom_decoy_triggered else 6.0
                self.dwell_time_decoy += 270 if custom_decoy_triggered else 210
                self.trapped_attacks += 1

        else:
            reward = 1.0

        self.cumulative_reward += reward
        self.run_gnn_inference()

        step_summary = {
            "step": self.campaign_index,
            "vector_id": vector_id,
            "target": target_node["id"] if target_node else (target_override or "dmz"),
            "custom_decoy_triggered": custom_decoy_triggered,
            "target_label": target_node.get("label", "") if target_node else "",
            "reward": reward,
            "cumulative_reward": self.cumulative_reward,
            "ppo_decision": ppo_decision,
            "dwell_decoy": self.dwell_time_decoy,
            "dwell_real": self.dwell_time_real,
            "trapped_attacks": self.trapped_attacks,
            "total_attacks": self.total_actions,
            "completed": self.campaign_done
        }
        self.history.append(step_summary)
        return step_summary

    def reset(self):
        """Resets the environment back to initial clean state"""
        self.nodes = [dict(n) for n in INITIAL_NODES]
        self.edges = [dict(e) for e in INITIAL_EDGES]
        self.campaign_index = 0
        self.total_actions = 0
        self.campaign_done = False
        self.cumulative_reward = 0.0
        self.dwell_time_decoy = 0
        self.dwell_time_real = 0
        self.trapped_attacks = 0
        self.history.clear()
        self.active_defense = {
            "decoy_apache": False,
            "honeytokens": set(),
            "isolated_paths": set(),
            "high_interaction_decoys": set(),
            "rerouted_subnets": set(),
            "restored_hosts": set(),
        }
        self.run_gnn_inference()
        return self.get_full_state()

    def deploy_custom_decoy(self, label: str, target_subnet: str = "Internal", custom_node: Optional[dict] = None) -> dict:
        """
        Deploys a new honeypot dynamically.
        Enforces unique IDs, prevents overwriting real assets, and handles malformed payloads (API-3, API-4, API-5).
        """
        existing_ids = {n["id"] for n in self.nodes}

        if custom_node:
            if not isinstance(custom_node, dict) or "id" not in custom_node:
                raise ValueError("custom_node must be a dict containing an 'id' field")

            node_id = str(custom_node["id"]).strip()
            if not node_id:
                raise ValueError("custom_node 'id' cannot be empty")

            # API-5: Prevent overwriting real assets
            existing_real = next((n for n in self.nodes if n["id"] == node_id and not n.get("isHoneypot", False)), None)
            if existing_real:
                raise ValueError(f"Cannot overwrite real enterprise asset '{node_id}' with a decoy")

            if custom_node.get("isCrownJewel", False):
                raise ValueError("Decoy node cannot be designated as Crown Jewel")

            new_decoy = {
                "id": node_id,
                "label": custom_node.get("label", f"{label} [DECOY]"),
                "ip": custom_node.get("ip", f"10.0.2.{np.random.randint(180, 240)}"),
                "subnet": custom_node.get("subnet", target_subnet),
                "type": "honeypot",
                "services": custom_node.get("services", ["Decoy Apache", "Emulated Kerberos"]),
                "os": custom_node.get("os", "CybORG Responsive Decoy Container"),
                "isHoneypot": True,
                "compromised": False,
                "underAttack": False,
                "gnnRisk": 0.50,
                "x": custom_node.get("x", 420),
                "y": custom_node.get("y", 200),
                "discovered": False,
                "disguiseAs": custom_node.get("disguiseAs", "Confidential Internal Asset")
            }

            # Update if already a decoy, else append
            self.nodes = [n for n in self.nodes if n["id"] != node_id]
            self.nodes.append(new_decoy)

            neighbor = custom_node.get("neighborOf", "corp-router")
            if not any(e["source"] == neighbor and e["target"] == node_id for e in self.edges):
                self.edges.append({"source": neighbor, "target": node_id})

            self.run_gnn_inference()
            return new_decoy

        # API-4: Generate unique collision-free ID using UUID
        decoy_id = f"decoy-dyn-{uuid.uuid4().hex[:8]}"
        while decoy_id in existing_ids:
            decoy_id = f"decoy-dyn-{uuid.uuid4().hex[:8]}"

        new_decoy = {
            "id": decoy_id,
            "label": f"{label} [DECOY]",
            "ip": f"10.0.2.{np.random.randint(180, 240)}",
            "subnet": target_subnet,
            "type": "honeypot",
            "services": ["Decoy Apache", "Emulated Kerberos"],
            "os": "CybORG Responsive Decoy Container",
            "isHoneypot": True,
            "compromised": False,
            "underAttack": False,
            "gnnRisk": 0.50,
            "x": 420 + int(np.random.randint(-30, 30)),
            "y": 200 + int(np.random.randint(-40, 40)),
            "discovered": False,
            "disguiseAs": "Confidential Internal Asset"
        }
        self.nodes.append(new_decoy)
        self.edges.append({"source": "corp-router", "target": decoy_id})
        self.run_gnn_inference()
        return new_decoy

    def get_full_state(self) -> Dict[str, Any]:
        return {
            "step": self.campaign_index,
            "nodes": self.nodes,
            "edges": self.edges,
            "metrics": {
                "cumulativeReward": round(self.cumulative_reward, 2),
                "dwellTimeDecoySec": self.dwell_time_decoy,
                "dwellTimeRealSec": self.dwell_time_real,
                "trappedAttacks": self.trapped_attacks,
                "totalAttacks": self.total_actions,
            },
            "history": list(self.history)
        }
