import os
os.environ["KMP_DUPLICATE_LIB_OK"] = "TRUE"

import torch
import json
import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT_DIR))

from fastapi.testclient import TestClient
from backend.server.app import app, env

client = TestClient(app)

def test_full_automation():
    print("==================================================================")
    print("      ACDS AUTOMATION & DYNAMIC REACTIVITY FULL SUITE TEST        ")
    print("==================================================================")

    # 1. Check Server Status
    print("\n[1/5] Verifying Backend Server Health...")
    r = client.get("/api/status")
    assert r.status_code == 200, f"Backend error: {r.status_code}"
    status_data = r.json()
    print(f"✔ Backend Online | PyTorch: {status_data['pytorch_version']} | Service: {status_data['service']}")

    # 2. Test Clean Baseline Automation Loop (Steps 1 to 6)
    print("\n[2/5] Testing Baseline Autonomous Kill-Chain Playback (Steps 1 to 6)...")
    client.post("/api/reset")
    
    expected_phases = [
        ("Step 1 (Recon)", "recon_syn_scan", "web-public"),
        ("Step 2 (Ingress Access)", "sql_injection_exfil", "web-public"),
        ("Step 3 (Lateral Probe)", "path_traversal_file_read", "decoy-hr-backup"),
        ("Step 4 (Honeypot Trap)", "credential_stuffing_ssh", "decoy-hr-backup"),
        ("Step 5 (Core Defense)", "remote_code_execution", "decoy-db-replica"),
        ("Step 6 (Loop/Wrap)", "completed", "isolated"),
    ]

    for idx, (label, vec, expected_target) in enumerate(expected_phases):
        step_res = client.post("/api/step").json()
        summary = step_res["summary"]
        state = step_res["state"]
        
        target = summary["target"]
        reward = summary["reward"]
        ppo_action = summary["ppo_decision"]["action_name"]
        dwell = state["metrics"]["dwellTimeDecoySec"]
        trapped = state["metrics"]["trappedAttacks"]

        # TEST-3: Assert actual expected vector and target, including step 6 wrap
        assert summary["vector_id"] == vec, f"Expected {vec}, got {summary['vector_id']}"
        assert target == expected_target, f"Expected target {expected_target}, got {target}"
        if vec == "completed":
            assert summary["completed"] is True, "Step 6 should have completed: True"

        # Verify Crown Jewels never compromised
        dc = next(n for n in state["nodes"] if n["id"] == "active-directory")
        db = next(n for n in state["nodes"] if n["id"] == "prod-database")
        assert not dc["compromised"], f"CRITICAL: Domain Controller breached at {label}!"
        assert not db["compromised"], f"CRITICAL: Production DB breached at {label}!"
        
        print(f"✔ {label}: Vector={summary['vector_id']} -> Target={target} | PPO={ppo_action} | Reward=+{reward:.1f} | Dwell={dwell}s | Trapped={trapped}")

    # 3. Test Dynamic Honeypot Deployment & Reactive Automation
    print("\n[3/5] Testing Dynamic Reactive Automation with Custom Honeypot Deployment...")
    # Reset first
    client.post("/api/reset")
    
    # Deploy custom honeypot connected to workstation-1 in Zone 2
    custom_decoy_payload = {
        "label": "Dynamic-HR-Decoy",
        "target_subnet": "Internal",
        "custom_node": {
            "id": "decoy-dyn-eng-01",
            "label": "Dynamic-HR-Decoy [DECOY]",
            "ip": "10.0.2.235",
            "subnet": "Internal",
            "type": "honeypot",
            "services": ["OpenSSH 8.9", "Cowrie Decoy Banner"],
            "os": "CybORG Responsive Decoy Container",
            "isHoneypot": True,
            "compromised": False,
            "underAttack": False,
            "gnnRisk": 0.50,
            "x": 420,
            "y": 140,
            "discovered": False,
            "neighborOf": "workstation-1"
        }
    }
    deploy_res = client.post("/api/deception/deploy", json=custom_decoy_payload).json()
    assert deploy_res["status"] == "deployed"
    print(f"✔ Successfully deployed custom honeypot: {deploy_res['decoy']['label']} ({deploy_res['decoy']['ip']})")

    # Step through automation and verify the adversary hits the newly added honeypot!
    print("   Running automation playback across updated topology...")
    for step_num in range(1, 5):
        step_res = client.post("/api/step").json()
        summary = step_res["summary"]
        state = step_res["state"]
        
        if summary["vector_id"] == "credential_stuffing_ssh":
            assert summary["target"] == "decoy-dyn-eng-01", f"Adversary failed to target custom honeypot! Got {summary['target']}"
            assert summary["custom_decoy_triggered"], "custom_decoy_triggered was not set!"
            print(f"✔ STEP 4 DYNAMIC INTERCEPTION: Adversary lured into custom honeypot '{summary['target']}'!")
            print(f"   Reward=+{summary['reward']} | Dwell Decoy={state['metrics']['dwellTimeDecoySec']}s")

    # 4. Negative Input Probes (API-1 through API-5, TEST-3)
    print("\n[4/5] Testing Negative Input Probes & Security Validation...")
    
    # Invalid vector_id -> 422
    resp_bad_vec = client.post("/api/attack/launch", json={"vector_id": "not_a_real_attack"})
    assert resp_bad_vec.status_code == 422, f"Expected 422 for bad vector, got {resp_bad_vec.status_code}"
    print("✔ Negative Probe 1 Passed: Invalid vector_id correctly rejected with HTTP 422")

    # Non-existent target_override -> 422
    resp_bad_target = client.post("/api/attack/launch", json={"vector_id": "recon_syn_scan", "target_override": "ghost-host"})
    assert resp_bad_target.status_code == 422, f"Expected 422 for bad target, got {resp_bad_target.status_code}"
    print("✔ Negative Probe 2 Passed: Non-existent target_override correctly rejected with HTTP 422")

    # Partial/malformed custom_node -> 422
    resp_bad_node = client.post("/api/deception/deploy", json={"label": "Malformed", "custom_node": {"label": "no id"}})
    assert resp_bad_node.status_code == 422, f"Expected 422 for missing fields, got {resp_bad_node.status_code}"
    print("✔ Negative Probe 3 Passed: Incomplete custom_node payload correctly rejected with HTTP 422")

    # Overwrite real enterprise asset -> 409
    resp_overwrite = client.post("/api/deception/deploy", json={
        "label": "Fake DB",
        "custom_node": {
            "id": "prod-database",
            "label": "Fake DB",
            "subnet": "Core",
            "ip": "10.0.3.50",
            "type": "honeypot"
        }
    })
    assert resp_overwrite.status_code == 409, f"Expected 409 for overwriting real asset, got {resp_overwrite.status_code}"
    print("✔ Negative Probe 4 Passed: Overwriting real asset (prod-database) correctly rejected with HTTP 409")

    # 5. Final Security Audit
    print("\n[5/5] Final Security & Integrity Audit...")
    state = client.get("/api/state").json()
    assert not next(n for n in state["nodes"] if n["id"] == "prod-database")["compromised"]
    assert len(state["history"]) <= 200, "History exceeded maxlen"
    print("==================================================================")
    print("🎉 AUTOMATION & NEGATIVE PROBE FULL SUITE PASSED WITH 100% SUCCESS!")
    print("==================================================================")

if __name__ == "__main__":
    test_full_automation()
