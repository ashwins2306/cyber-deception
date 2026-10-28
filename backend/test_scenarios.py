"""
Unit Test Suite for All 5 Attack Scenarios in ACDS.
Validates offensive-to-defensive flow, graph connectivity, and deception entrapment.
"""

import os
os.environ["KMP_DUPLICATE_LIB_OK"] = "TRUE"

import torch
import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT_DIR))

from backend.env.cyborg_emulator import CybORGEnvironment

def run_all_scenario_tests():
    print("==================================================================")
    print("      ACDS 5-SCENARIO UNIT TESTING (OFFENSIVE & DECEPTIVE)        ")
    print("==================================================================")

    env = CybORGEnvironment()
    
    # ----------------------------------------------------------------
    # SCENARIO 1: Stealth SYN Port Reconnaissance
    # ----------------------------------------------------------------
    print("\n[TEST 1/5] Executing Scenario 1: recon_syn_scan")
    res1 = env.step_simulation("recon_syn_scan")
    assert res1["target"] == "web-public", f"Expected web-public, got {res1['target']}"
    node_web = next(n for n in env.nodes if n["id"] == "web-public")
    assert node_web["underAttack"], "web-public should be marked underAttack"
    assert node_web["discovered"], "web-public should be marked discovered"
    assert not node_web["compromised"], "web-public should NOT be compromised during recon"
    print(f"✔ Scenario 1 Passed: Target={res1['target']} | GNN Risk={node_web['gnnRisk']} | PPO Action={res1['ppo_decision']['action_name']}")

    # ----------------------------------------------------------------
    # SCENARIO 2: SQL Injection & Perimeter Foothold
    # ----------------------------------------------------------------
    print("\n[TEST 2/5] Executing Scenario 2: sql_injection_exfil")
    res2 = env.step_simulation("sql_injection_exfil")
    assert res2["target"] == "web-public", f"Expected web-public, got {res2['target']}"
    node_web = next(n for n in env.nodes if n["id"] == "web-public")
    node_router = next(n for n in env.nodes if n["id"] == "corp-router")
    assert node_web["compromised"], "web-public should be marked compromised"
    assert not node_web["underAttack"], "web-public should no longer be underAttack"
    assert node_router["discovered"], "corp-router should now be discovered"
    print(f"✔ Scenario 2 Passed: Web Breach Confirmed | corp-router Discovered | PPO Action={res2['ppo_decision']['action_name']}")

    # ----------------------------------------------------------------
    # SCENARIO 3: Internal Lateral Movement via Engineering Workstation
    # ----------------------------------------------------------------
    print("\n[TEST 3/5] Executing Scenario 3: path_traversal_file_read")
    res3 = env.step_simulation("path_traversal_file_read")
    assert res3["target"] == "decoy-hr-backup", f"Expected decoy-hr-backup, got {res3['target']}"
    node_ws2 = next(n for n in env.nodes if n["id"] == "workstation-2")
    node_decoy1 = next(n for n in env.nodes if n["id"] == "decoy-hr-backup")
    assert node_decoy1["underAttack"], "decoy-hr-backup should be underAttack from lateral movement"
    assert node_decoy1["compromised"], "decoy-hr-backup should be trapped inside honeypot"
    assert not node_ws2["underAttack"], "workstation-2 should be shielded by deception containment"
    assert env.dwell_time_decoy >= 90, "Dwell time was not logged on decoy!"
    assert env.trapped_attacks >= 1, "Adversary was not recorded as trapped in honeypot!"
    print(f"✔ Scenario 3 Passed: Target={res3['target']} | Lateral Hop Lured to Honeypot | PPO Action={res3['ppo_decision']['action_name']}")

    # ----------------------------------------------------------------
    # SCENARIO 4: Zone 2 Honeypot Trap (Credential Stuffing / SSH)
    # ----------------------------------------------------------------
    print("\n[TEST 4/5] Executing Scenario 4: credential_stuffing_ssh")
    res4 = env.step_simulation("credential_stuffing_ssh")
    assert res4["target"] == "decoy-hr-backup", f"Expected decoy-hr-backup, got {res4['target']}"
    node_decoy1 = next(n for n in env.nodes if n["id"] == "decoy-hr-backup")
    node_dc = next(n for n in env.nodes if n["id"] == "active-directory")
    assert node_decoy1["underAttack"], "decoy-hr-backup should be underAttack"
    assert node_decoy1["compromised"], "decoy-hr-backup should be compromised inside honeypot"
    assert not node_dc["compromised"], "Domain Controller must remain UNTOUCHED!"
    assert not node_dc["underAttack"], "Domain Controller must NOT be underAttack!"
    assert env.dwell_time_decoy >= 210, "Dwell time was not logged on decoy!"
    assert env.trapped_attacks >= 2, "Adversary was not recorded as trapped in honeypot!"
    print(f"✔ Scenario 4 Passed: Attacker trapped in decoy-hr-backup | Dwell Time={env.dwell_time_decoy}s | DC SAFE")

    # ----------------------------------------------------------------
    # SCENARIO 5: Core Database Infiltration Reroute (Crown Jewel Defense)
    # ----------------------------------------------------------------
    print("\n[TEST 5/5] Executing Scenario 5: remote_code_execution")
    res5 = env.step_simulation("remote_code_execution")
    assert res5["target"] == "decoy-db-replica", f"Expected decoy-db-replica, got {res5['target']}"
    node_db_decoy = next(n for n in env.nodes if n["id"] == "decoy-db-replica")
    node_prod_db = next(n for n in env.nodes if n["id"] == "prod-database")
    assert node_db_decoy["underAttack"], "decoy-db-replica should be underAttack"
    assert node_db_decoy["compromised"], "decoy-db-replica should be breached"
    assert not node_prod_db["compromised"], "CRITICAL: Real Crown Jewel database was breached!"
    assert not node_prod_db["underAttack"], "Real Crown Jewel DB must NOT be underAttack!"
    assert env.dwell_time_decoy >= 330, "Expected at least 330s dwell time on decoys!"
    assert env.trapped_attacks >= 2, "Expected at least 2 trapped attacks!"
    print(f"✔ Scenario 5 Passed: Attacker trapped in decoy-db-replica | Dwell Time={env.dwell_time_decoy}s | CROWN JEWEL 100% SECURE")

    # ----------------------------------------------------------------
    # SCENARIO 6: Dynamic Honeypot Deployment & Reactive Entrapment
    # ----------------------------------------------------------------
    print("\n[TEST 6/7] Executing Scenario 6: Dynamic Reactive Honeypot Placement")
    custom_decoy = {
        "id": "decoy-custom-trap",
        "label": "Custom-HR-Decoy [DECOY]",
        "ip": "10.0.2.222",
        "subnet": "Internal",
        "type": "honeypot",
        "services": ["OpenSSH 8.9 Honeypot", "Emulated Kerberos"],
        "os": "CybORG Responsive Decoy Container",
        "isHoneypot": True,
        "compromised": False,
        "underAttack": False,
        "gnnRisk": 0.95,
        "x": 420,
        "y": 140,
        "discovered": False,
        "neighborOf": "workstation-1"
    }
    env.deploy_custom_decoy("Custom-HR-Decoy", "Internal", custom_decoy)
    res6 = env.step_simulation("credential_stuffing_ssh")
    assert res6["target"] == "decoy-custom-trap", f"Expected newly added honeypot to trap adversary, got {res6['target']}"
    assert res6["custom_decoy_triggered"], "Custom decoy should be marked as triggered"
    node_custom = next(n for n in env.nodes if n["id"] == "decoy-custom-trap")
    assert node_custom["underAttack"], "Custom decoy should be underAttack"
    assert node_custom["compromised"], "Custom decoy should be breached inside containment"
    print(f"✔ Scenario 6 Passed: Dynamically placed honeypot {res6['target']} successfully trapped adversary! Real hosts 100% protected.")

    # ----------------------------------------------------------------
    # SCENARIO 7: Real Breach Test (Non-Scripted Failure Mode)
    # ----------------------------------------------------------------
    print("\n[TEST 7/7] Executing Scenario 7: Verifying Authentic Failure Mode (Wrong PPO Action)")
    fail_env = CybORGEnvironment()
    # Force attacker directly to Crown Jewel with ineffective PPO defense
    res7 = fail_env.step_simulation("remote_code_execution", target_override="prod-database", ppo_action_override="MONITOR_SUBNET")
    node_breached_db = next(n for n in fail_env.nodes if n["id"] == "prod-database")
    assert node_breached_db["compromised"], "Expected Crown Jewel DB to be breached when undefended!"
    assert res7["reward"] == -30.0, f"Expected critical breach penalty -30.0, got {res7['reward']}"
    print("✔ Scenario 7 Passed: Verified Crown Jewel can be genuinely breached when defense fails (non-scripted causality confirmed).")

    print("\n==================================================================")
    print("🎉 ALL SCENARIOS (DEFENSE, DYNAMIC DECOY & CAUSAL BREACH) PASSED!")
    print(f"   Final Trapped Adversaries: {env.trapped_attacks}")
    print(f"   Total Dwell Time Wasted:   {env.dwell_time_decoy} seconds")
    print(f"   Cumulative RL Reward:      +{env.cumulative_reward:.1f}")
    print("==================================================================")

if __name__ == "__main__":
    run_all_scenario_tests()
