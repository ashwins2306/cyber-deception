# Adaptive Cyber Deception System (ACDS)
### GNN-PPO Autonomous Defense Framework with Dual-Perspective React Visualization

[![Cyber Range](https://img.shields.io/badge/Cyber%20Range-CybORG--Inspired%20Simulation%20Range-blue)](https://github.com/tucson-cyborg/CybORG)
[![PyTorch GNN](https://img.shields.io/badge/GNN-Native%20PyTorch%20GCN%20%2B%20GAT-ee4c2c?logo=pytorch)](https://pytorch.org/)
[![RL](https://img.shields.io/badge/RL-Custom%20Trained%20PPO%20Actor--Critic-2ba347)](https://pytorch.org/)
[![React](https://img.shields.io/badge/Frontend-React%20%2B%20Tailwind%20%2B%20Recharts-cyan)](https://react.dev/)

---

## 1. Project Overview

Traditional cyber defense relies on static rules and passive honeypots that attackers quickly identify and bypass. **ACDS** reframes cyber deception into an autonomous, closed-loop Markov Decision Process (MDP):

1. **Observe**: Captures network logs, host telemetry, and connection attempts inside a **CybORG-inspired custom cyber range simulation environment**.
2. **Represent**: Constructs a dynamic communication graph $G = (V, E)$ and extracts topology-aware embeddings using a **Native PyTorch Hybrid GCN + GAT (Graph Convolutional & Graph Attention)** network with dual pooling.
3. **Decide**: An autonomous, trained **PPO (Proximal Policy Optimization)** Actor-Critic agent evaluates topological risk vectors and selects proactive deception actions (deploying honeypots, spoofing banners, injecting HoneyTokens, dynamic traffic rerouting).
4. **Deceive**: Executes responsive deception primitives with genuine causality. Deceptive traps dynamically divert adversaries into quarantined containers. If defense fails or is absent, authentic host and crown-jewel breaches occur.
5. **Learn**: Trained via Generalized Advantage Estimation (GAE) and clipped surrogate PPO policy gradients (`train_ppo.py`) with checkpoints saved to `backend/weights/ppo_gnn_weights.pt`. Measures dwell time wasted on honeypots, computes RL rewards, and minimizes enterprise compromise.

---

## 2. Separate Webpages Architecture

The system provides **two dedicated, isolated webpages** that communicate and synchronize in real-time using HTML5 `BroadcastChannel` (`acds_simulation_sync`):

| Webpage | URL | Role |
| :--- | :--- | :--- |
| **Portal / Launcher** | `http://localhost:3000/` | Master launchpad with one-click dual-window popup launcher. |
| **Attacker Operations** | `http://localhost:3000/#/attacker` | Full-screen offensive console: Fog-of-War map, Kali exploit terminal, target objective, dwell time tracker. |
| **Deception Defense SOC** | `http://localhost:3000/#/deception` | Full-screen Blue Team SOC: Ground-truth topology, GNN risk heatmap, PPO decision stream, CybORG action repertoire, Recharts analytics. |

### Real-Time Cross-Window Synchronization
When you click **Play**, **Pause**, or **Step** on *either* webpage:
- The simulation tick updates in lockstep across both browser tabs or monitor screens.
- When an attacker targets a honeypot on the Attacker page, the Deception page immediately registers the intrusion and PPO activates counter-measures.


---

## 3. Running the Project on macOS (Recommended)

### One-Command Startup
In your Terminal, run:
```bash
./run_mac.sh
```
This automatically starts both the FastAPI backend (port 8001) and Vite frontend (port 3000), opens the browser, and synchronizes real-time WebSockets.

---

## 4. Running the Project on Windows

### Option A: One-Click Startup (Recommended)
Simply double-click the **`run_windows.bat`** file in the project folder. It will:
1. Automatically create a Python virtual environment (`venv`).
2. Install Python & Node.js packages.
3. Launch both the backend (port 8001) and frontend (port 3000) in separate terminals.
4. Open the dashboard in your default browser.

---

### Option B: Manual Startup via PowerShell or Command Prompt

#### Step 1: Install Prerequisites (One-time)
* **Python 3.10+**: Download from [python.org](https://www.python.org/downloads/) *(check "Add Python to PATH" during install)*.
* **Node.js (LTS)**: Download from [nodejs.org](https://nodejs.org/).

#### Step 2: Start the Python AI Backend
Open **PowerShell** (or CMD) in the project folder:
```powershell
# 1. Create and activate a virtual environment
python -m venv venv
.\venv\Scripts\Activate.ps1

# (In Command Prompt, use: venv\Scripts\activate.bat)

# 2. Install dependencies
pip install -r backend/requirements.txt

# 3. Start the backend server
$env:KMP_DUPLICATE_LIB_OK="TRUE"
python backend/main.py
```
*Backend runs on: [http://localhost:8001](http://localhost:8001) (Swagger docs: [http://localhost:8001/docs](http://localhost:8001/docs))*

#### Step 3: Start the React Frontend
Open a **second PowerShell** window in the project folder:
```powershell
cd frontend
npm install
npm run dev
```
*Frontend runs on: [http://localhost:3000](http://localhost:3000)*

---

## 4. Webpage URLs

