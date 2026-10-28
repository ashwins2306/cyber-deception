"""
Main entry point for starting the CybORG + GNN + PPO Backend Server.
"""

import os
import sys
from pathlib import Path

# Add project root to python path
ROOT_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT_DIR))

os.environ["KMP_DUPLICATE_LIB_OK"] = "TRUE"

import uvicorn
from backend.server.app import app

if __name__ == "__main__":
    print("==========================================================")
    print("⚡ Starting ACDS Backend (CybORG + PyTorch GNN + PPO) ⚡")
    print("   REST API:   http://localhost:8001")
    print("   Docs:       http://localhost:8001/docs")
    print("   WebSocket:  ws://localhost:8001/ws/stream")
    print("==========================================================")
    uvicorn.run(app, host="0.0.0.0", port=8001, reload=False)


