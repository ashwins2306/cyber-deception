"""
FastAPI Server & WebSocket Streaming Engine.
Bridges the CybORG cyber range, PyTorch GNN, and PPO agent with the React Frontend.
Includes strict Pydantic input validation, concurrency locking, and secure error handling
addressing API-1 through API-9.
"""

import os
os.environ["KMP_DUPLICATE_LIB_OK"] = "TRUE"

import asyncio
import json
import logging
from typing import List, Optional, Literal
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from ..env.cyborg_emulator import CybORGEnvironment

logger = logging.getLogger("acds.api")

app = FastAPI(
    title="ACDS Cyber Deception Engine",
    description="CybORG + PyTorch GNN + PPO Responsive Cyber Deception Backend",
    version="2.0.0"
)

# API-9: Restrict CORS to authorized frontend hosts
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

# Global CybORG Simulation Environment instance and concurrency lock (API-8)
env = CybORGEnvironment()
env_lock = asyncio.Lock()

# Active WebSocket connections pool
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        payload = json.dumps(message)
        for connection in list(self.active_connections):
            try:
                await connection.send_text(payload)
            except Exception:
                self.disconnect(connection)

manager = ConnectionManager()

# Allowed MITRE ATT&CK vectors (API-1)
VectorId = Literal[
    "recon_syn_scan",
    "sql_injection_exfil",
    "path_traversal_file_read",
    "credential_stuffing_ssh",
    "remote_code_execution"
]

class AttackPayload(BaseModel):
    vector_id: VectorId
    target_override: Optional[str] = None
    ppo_action_override: Optional[str] = None
    params: Optional[dict] = None

class CustomNodeModel(BaseModel):
    id: str = Field(..., pattern=r"^[a-zA-Z0-9_-]{3,50}$")
    label: str
    subnet: Literal["DMZ", "Internal", "Core"] = "Internal"
    ip: str
    type: Literal["honeypot"] = "honeypot"
    neighborOf: Optional[str] = None

class DecoyPayload(BaseModel):
    label: str
    target_subnet: Literal["DMZ", "Internal", "Core"] = "Internal"
    custom_node: Optional[CustomNodeModel] = None


@app.get("/api/status")
def get_status():
    import torch
    return {
        "status": "online",
        "service": "ACDS Cyber Deception Backend",
        "engine": "CybORG + PyTorch GNN + PPO",
        "pytorch_version": torch.__version__,
        "step_count": env.campaign_index,
        "total_actions": env.total_actions,
        "cumulative_reward": env.cumulative_reward,
        "active_ws_clients": len(manager.active_connections)
    }


@app.get("/api/state")
def get_simulation_state():
    return env.get_full_state()


@app.post("/api/attack/launch")
async def launch_attack(payload: AttackPayload):
    async with env_lock:
        # API-2: Validate target_override exists in topology
        if payload.target_override:
            known_ids = {n["id"] for n in env.nodes}
            if payload.target_override not in known_ids:
                raise HTTPException(
                    status_code=422,
                    detail=f"Unknown target_override '{payload.target_override}'. Known hosts: {list(known_ids)}"
                )

        summary = env.step_simulation(
            vector_id=payload.vector_id,
            target_override=payload.target_override,
            ppo_action_override=payload.ppo_action_override
        )
        full_state = env.get_full_state()

    await manager.broadcast({
        "type": "ATTACK_EXECUTED",
        "summary": summary,
        "state": full_state
    })
    return {"status": "dispatched", "summary": summary, "state": full_state}


@app.post("/api/deception/deploy")
async def deploy_decoy(payload: DecoyPayload):
    async with env_lock:
        try:
            custom_dict = payload.custom_node.model_dump() if payload.custom_node else None
            new_decoy = env.deploy_custom_decoy(
                label=payload.label,
                target_subnet=payload.target_subnet,
                custom_node=custom_dict
            )
            full_state = env.get_full_state()
        except ValueError as ve:
            # API-4, API-5: Conflict or invalid node modification
            raise HTTPException(status_code=409, detail=str(ve))

    await manager.broadcast({
        "type": "DECOY_DEPLOYED",
        "new_decoy": new_decoy,
        "state": full_state
    })
    return {"status": "deployed", "decoy": new_decoy, "state": full_state}


@app.post("/api/step")
async def step_environment():
    async with env_lock:
        summary = env.step_simulation()
        full_state = env.get_full_state()

    await manager.broadcast({
        "type": "STEP_UPDATE",
        "summary": summary,
        "state": full_state
    })
    return {"status": "stepped", "summary": summary, "state": full_state}


@app.post("/api/reset")
async def reset_environment():
    async with env_lock:
        state = env.reset()

    await manager.broadcast({
        "type": "SIMULATION_RESET",
        "state": state
    })
    return {"status": "reset", "state": state}


@app.websocket("/ws/stream")
async def websocket_stream(websocket: WebSocket):
    await manager.connect(websocket)
    # Send initial state upon connection
    await websocket.send_text(json.dumps({
        "type": "INITIAL_STATE",
        "state": env.get_full_state()
    }))

    ALLOWED_VECTORS = {
        "recon_syn_scan",
        "sql_injection_exfil",
        "path_traversal_file_read",
        "credential_stuffing_ssh",
        "remote_code_execution"
    }

    try:
        while True:
            data = await websocket.receive_text()
            try:
                # API-7: Validate JSON structure and handle non-dict objects
                msg = json.loads(data)
                if not isinstance(msg, dict):
                    await websocket.send_text(json.dumps({
                        "error": "Invalid message format: expected JSON object"
                    }))
                    continue

                cmd = msg.get("command")
                if not cmd or cmd not in ["LAUNCH_ATTACK", "STEP", "RESET"]:
                    await websocket.send_text(json.dumps({
                        "error": f"Unknown command '{cmd}'. Allowed: ['LAUNCH_ATTACK', 'STEP', 'RESET']"
                    }))
                    continue

                if cmd == "LAUNCH_ATTACK":
                    vector_id = msg.get("vector_id")
                    if vector_id not in ALLOWED_VECTORS:
                        await websocket.send_text(json.dumps({
                            "error": f"Invalid vector_id '{vector_id}'. Allowed: {sorted(list(ALLOWED_VECTORS))}"
                        }))
                        continue

                    target = msg.get("target")
                    async with env_lock:
                        summary = env.step_simulation(vector_id=vector_id, target_override=target)
                        full_state = env.get_full_state()

                    await manager.broadcast({
                        "type": "ATTACK_EXECUTED",
                        "summary": summary,
                        "state": full_state
                    })

                elif cmd == "STEP":
                    async with env_lock:
                        summary = env.step_simulation()
                        full_state = env.get_full_state()

                    await manager.broadcast({
                        "type": "STEP_UPDATE",
                        "summary": summary,
                        "state": full_state
                    })

                elif cmd == "RESET":
                    async with env_lock:
                        state = env.reset()

                    await manager.broadcast({
                        "type": "SIMULATION_RESET",
                        "state": state
                    })

            except json.JSONDecodeError:
                await websocket.send_text(json.dumps({
                    "error": "Malformed JSON payload"
                }))
            except Exception as e:
                # API-7: Generic safe error message without leaking internal tracebacks
                logger.error(f"WebSocket execution error: {e}", exc_info=True)
                await websocket.send_text(json.dumps({
                    "error": "Command processing failed"
                }))
    except WebSocketDisconnect:
        manager.disconnect(websocket)
