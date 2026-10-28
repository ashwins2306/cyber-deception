import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { INITIAL_NODES, INITIAL_EDGES } from '../mock/simulationData';
import { SIMULATION_STEPS } from '../mock/simulationEngine';
import { PREDEFINED_ATTACK_VECTORS } from '../mock/attackVectorsData';

const SimulationContext = createContext(null);

// LocalStorage helpers so user-deployed honeypots persist across tabs, attacks, and refreshes
const STORAGE_DECOYS_KEY = 'acds_custom_honeypots';
const STORAGE_EDGES_KEY = 'acds_custom_edges';

const getStoredCustomDecoys = () => {
  try {
    const raw = localStorage.getItem(STORAGE_DECOYS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
};

const getStoredCustomEdges = () => {
  try {
    const raw = localStorage.getItem(STORAGE_EDGES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
};

const saveCustomDecoy = (decoyNode, edge) => {
  try {
    const existing = getStoredCustomDecoys().filter(n => n.id !== decoyNode.id);
    localStorage.setItem(STORAGE_DECOYS_KEY, JSON.stringify([...existing, decoyNode]));

    if (edge) {
      const existingEdges = getStoredCustomEdges().filter(
        e => !(e.source === edge.source && e.target === edge.target)
      );
      localStorage.setItem(STORAGE_EDGES_KEY, JSON.stringify([...existingEdges, edge]));
    }
  } catch (e) {}
};

const clearStoredCustomDecoys = () => {
  try {
    localStorage.removeItem(STORAGE_DECOYS_KEY);
    localStorage.removeItem(STORAGE_EDGES_KEY);
  } catch (e) {}
};

const mergeWithCustomDecoys = (baseNodes = [], baseEdges = null) => {
  const customNodes = getStoredCustomDecoys();
  const mergedNodes = [...baseNodes];
  for (const c of customNodes) {
    const idx = mergedNodes.findIndex(m => m.id === c.id);
    if (idx >= 0) {
      mergedNodes[idx] = { ...c, ...mergedNodes[idx] };
    } else {
      mergedNodes.push(c);
    }
  }

  let mergedEdges = baseEdges ? [...baseEdges] : null;
  if (mergedEdges) {
    const customEdges = getStoredCustomEdges();
    for (const ce of customEdges) {
      if (!mergedEdges.some(me => me.source === ce.source && me.target === ce.target)) {
        mergedEdges.push(ce);
      }
    }
  }

  return { nodes: mergedNodes, edges: mergedEdges };
};

export function SimulationProvider({ children }) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);

  // Initialize with any persistent custom honeypots
  const [nodes, setNodes] = useState(() => mergeWithCustomDecoys(INITIAL_NODES).nodes);
  const [edges, setEdges] = useState(() => mergeWithCustomDecoys(INITIAL_NODES, INITIAL_EDGES).edges);
  
  const [redLogs, setRedLogs] = useState([]);
  const [blueLogs, setBlueLogs] = useState([]);
  const [stepHistory, setStepHistory] = useState(SIMULATION_STEPS);
  const [selectedNode, setSelectedNode] = useState(null);

  // Active Attack Vector selection and state
  const [activeVectorId, setActiveVectorId] = useState('recon_syn_scan');
  const [vectorParams, setVectorParams] = useState({});
  const [isAttackExecuting, setIsAttackExecuting] = useState(false);
  const [attackProgress, setAttackProgress] = useState(0);
  const [isBackendConnected, setIsBackendConnected] = useState(false);

  // Cross-Tab / Cross-Window Synchronization via BroadcastChannel
  const broadcastRef = useRef(null);
  const socketRef = useRef(null);

  // Controller and state refs to prevent broadcast echo loops and interval staleness
  const isControllerRef = useRef(true);
  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;
  const speedRef = useRef(speed);
  speedRef.current = speed;
  const nodesRef = useRef(nodes);
  nodesRef.current = nodes;
  const edgesRef = useRef(edges);
  edgesRef.current = edges;
  const redLogsRef = useRef(redLogs);
  redLogsRef.current = redLogs;
  const blueLogsRef = useRef(blueLogs);
  blueLogsRef.current = blueLogs;
  const stepHistoryRef = useRef(stepHistory);
  stepHistoryRef.current = stepHistory;

  // Connect to live FastAPI backend WebSocket
  useEffect(() => {
    let ws = null;
    const connectWS = () => {
      try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws/stream`;
        const wsFallback = `${protocol}//${window.location.hostname || 'localhost'}:8001/ws/stream`;
        
        try {
          ws = new WebSocket(wsUrl);
        } catch (e) {
          ws = new WebSocket(wsFallback);
        }
        socketRef.current = ws;

        ws.onopen = () => {
          setIsBackendConnected(true);
          console.log('✔ Connected to ACDS Backend (CybORG + PyTorch GNN + PPO)');
        };

        ws.onerror = () => {
          // Fallback to direct port 8001 if proxy is inactive
          if (socketRef.current === ws) {
            try {
              const fallback = new WebSocket(wsFallback);
              socketRef.current = fallback;
              fallback.onopen = () => setIsBackendConnected(true);
              fallback.onmessage = ws.onmessage;
            } catch (err) {}
          }
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'INITIAL_STATE' || data.type === 'SIMULATION_RESET') {
              const state = data.state || {};
              if (state.nodes) {
                const { nodes: mergedN } = mergeWithCustomDecoys(state.nodes);
                setNodes(mergedN);
              }
              if (state.edges) {
                const { edges: mergedE } = mergeWithCustomDecoys([], state.edges);
                setEdges(mergedE);
              }
              setStepHistory(SIMULATION_STEPS);
              setCurrentStepIndex(0);
            } else if (data.type === 'ATTACK_EXECUTED' || data.type === 'STEP_UPDATE' || data.type === 'DECOY_DEPLOYED') {
              const state = data.state || {};
              if (state.nodes) {
                const { nodes: mergedN } = mergeWithCustomDecoys(state.nodes);
                setNodes(mergedN);
              }
              if (state.edges) {
                const { edges: mergedE } = mergeWithCustomDecoys([], state.edges);
                setEdges(mergedE);
              }
              if (state.metrics) {
                const VECTOR_STEP_INDEX = {
                  'recon_syn_scan': 0,
                  'sql_injection_exfil': 1,
                  'path_traversal_file_read': 2,
                  'credential_stuffing_ssh': 3,
                  'remote_code_execution': 4,
                };
                const vId = data.summary?.vector_id;
                const targetIdx = VECTOR_STEP_INDEX[vId] !== undefined ? VECTOR_STEP_INDEX[vId] : null;

                if (data.summary?.completed) {
                  setIsPlaying(false);
                }

                if (targetIdx !== null) {
                  setStepHistory(prev => {
                    const base = (prev && prev.length === 6) ? prev : SIMULATION_STEPS;
                    return base.map((s, idx) => {
                      if (idx === targetIdx) {
                        const targetDisplay = data.summary?.target_label || data.summary?.target || s.attackerAction?.target;
                        return {
                          ...s,
                          phase: (vId || s.phase).toUpperCase(),
                          attackerAction: {
                            cmd: data.summary?.cmd || s.attackerAction?.cmd,
                            description: `Adversary executed attack targeting ${targetDisplay}.`,
                            target: targetDisplay,
                          },
                          ppoAction: data.summary?.ppo_decision ? {
                            type: data.summary.ppo_decision.action_name,
                            target: targetDisplay,
                            confidence: typeof data.summary.ppo_decision.confidence === 'number' ? data.summary.ppo_decision.confidence : 0.88,
                            reasoning: 'GNN computed topology risk embedding and PPO selected optimal responsive deception.',
                            reward: data.summary.reward || 1.0,
                          } : s.ppoAction,
                          metrics: state.metrics,
                          redLog: `Attack executed on ${targetDisplay}.`,
                          blueLog: `[PPO DEFENDER] Triggered ${data.summary?.ppo_decision?.action_name || 'defense'}.`
                        };
                      }
                      return s;
                    });
                  });
                  if (!isPlayingRef.current) {
                    setCurrentStepIndex(targetIdx);
                  }
                }
              }
            }
          } catch (err) {
            console.error('Error parsing backend WS message:', err);
          }
        };

        ws.onclose = () => {
          setIsBackendConnected(false);
          setTimeout(connectWS, 3000);
        };

        ws.onerror = () => {
          setIsBackendConnected(false);
        };
      } catch (err) {
        setIsBackendConnected(false);
      }
    };

    connectWS();

    return () => {
      if (ws) ws.close();
    };
  }, []);

  useEffect(() => {
    try {
      const channel = new BroadcastChannel('acds_simulation_sync');
      broadcastRef.current = channel;

      channel.onmessage = (event) => {
        const { type, payload } = event.data || {};
        if (type === 'ATTACK_STARTED') {
          isControllerRef.current = false;
          if (payload.targetNodeId) {
            setNodes(prev => prev.map(n => ({
              ...n,
              underAttack: n.id === payload.targetNodeId,
              discovered: n.id === payload.targetNodeId ? true : n.discovered,
            })));
          }
          if (payload.activeVectorId) setActiveVectorId(payload.activeVectorId);
        } else if (type === 'SYNC_STATE' || type === 'ATTACK_EXECUTED') {
          isControllerRef.current = false;
          if (payload.nodes) {
            const { nodes: mergedN, edges: mergedE } = mergeWithCustomDecoys(payload.nodes, payload.edges);
            setNodes(mergedN);
            if (mergedE) setEdges(mergedE);
          }
          if (payload.currentStepIndex !== undefined) setCurrentStepIndex(payload.currentStepIndex);
          if (payload.isPlaying !== undefined) setIsPlaying(payload.isPlaying);
          if (payload.speed !== undefined) setSpeed(payload.speed);
          if (payload.redLogs) setRedLogs(payload.redLogs);
          if (payload.blueLogs) setBlueLogs(payload.blueLogs);
          if (payload.stepHistory) setStepHistory(payload.stepHistory);
          if (payload.activeVectorId) setActiveVectorId(payload.activeVectorId);
        }
        // NOTE: We intentionally DO NOT handle SELECT_NODE here so node modal never opens on attacker side!
      };

      return () => {
        channel.close();
      };
    } catch (e) {
      console.warn('BroadcastChannel not supported or blocked:', e);
    }
  }, []);

  const broadcastState = useCallback((updated) => {
    if (broadcastRef.current) {
      broadcastRef.current.postMessage({
        type: 'SYNC_STATE',
        payload: updated,
      });
    }
  }, []);

  const applyStepState = useCallback((targetIndex) => {
    const customDecoys = getStoredCustomDecoys();
    const { nodes: initNodes } = mergeWithCustomDecoys(INITIAL_NODES);
    let newNodes = JSON.parse(JSON.stringify(initNodes));
    let accumulatedRedLogs = [];
    let accumulatedBlueLogs = [];
    let accumulatedSteps = [];

    // Filter custom decoys by subnet/neighbor
    const dmzCustomDecoys = customDecoys.filter(c => c.subnet === 'DMZ' || c.neighborOf === 'web-public' || c.neighborOf === 'gateway');
    const internalCustomDecoys = customDecoys.filter(c => c.subnet === 'Internal' || ['workstation-1', 'workstation-2', 'corp-router', 'active-directory'].includes(c.neighborOf));
    const coreCustomDecoys = customDecoys.filter(c => c.subnet === 'Core' || ['core-switch', 'prod-database'].includes(c.neighborOf));

    for (let i = 0; i <= targetIndex; i++) {
      let stepData = { ...SIMULATION_STEPS[i] };
      if (!stepData) break;

      // Dynamic reactive behavior based on custom honeypots deployed:
      if (i === 0 && dmzCustomDecoys.length > 0) {
        const decoy = dmzCustomDecoys[0];
        stepData = {
          ...stepData,
          discoverNodes: [...(stepData.discoverNodes || []), decoy.id],
          nodeUpdates: {
            ...stepData.nodeUpdates,
            [decoy.id]: { discovered: true, underAttack: true, gnnRisk: 0.75 },
          },
          redLog: `[RECON] Discovered active host 10.0.1.10 & honeypot ${decoy.ip} (${decoy.label}). Identified open port 80/http, 22/ssh.`,
          blueLog: `[GNN ENCODER] Aggregated DMZ node features. Deployed responsive decoy ${decoy.label} monitored by PPO agent.`,
        };
      } else if (i === 2 && internalCustomDecoys.length > 0) {
        const decoy = internalCustomDecoys[0];
        stepData = {
          ...stepData,
          phase: `INTERNAL LATERAL TRAVERSAL (${decoy.label.toUpperCase()})`,
          attackerAction: {
            cmd: `curl -s "http://10.0.2.102/dev?file=../../credentials.env" && ssh -i fake_id_rsa root@${decoy.ip}`,
            description: `Adversary lured by HoneyTokens on workstation-2 to pivot laterally into custom honeypot ${decoy.label} (${decoy.ip}).`,
            target: decoy.id,
            success: true,
          },
          discoverNodes: [...(stepData.discoverNodes || []), decoy.id, 'workstation-2'],
          nodeUpdates: {
            ...stepData.nodeUpdates,
            'workstation-2': { underAttack: false, gnnRisk: 0.35, discovered: true },
            [decoy.id]: { underAttack: true, compromised: true, discovered: true, gnnRisk: 0.94 },
          },
          ppoAction: {
            type: 'ISOLATE_LATERAL_PATH',
            target: decoy.label,
            confidence: 0.96,
            criticValue: 2.5,
            reasoning: `Lateral traversal from workstation-2 successfully lured into Honeypot ${decoy.label}. Domain Controller safe.`,
            reward: 4.5,
          },
          metrics: {
            stepReward: 4.5,
            cumulativeReward: 7.0,
            dwellTimeDecoySec: 90,
            dwellTimeRealSec: 55,
            trappedAttacks: 1,
            totalAttacks: 3,
          },
          redLog: `[ACCESS GRANTED] Pivoted from 10.0.2.102 into ${decoy.ip} root shell. Session established.`,
          blueLog: `[PPO LATERAL INTERCEPTION] Adversary lateral pivot from workstation-2 trapped into Honeypot ${decoy.label} (${decoy.ip}). Domain Controller 100% safe.`,
        };
      } else if (i === 3 && internalCustomDecoys.length > 0) {
        const decoy = internalCustomDecoys[0];
        stepData = {
          ...stepData,
          phase: `ZONE 2 HONEYPOT TRAP (${decoy.label.toUpperCase()})`,
          attackerAction: {
            cmd: `hydra -l root -P stolen_keys.txt ssh://${decoy.ip}:22 -t 4`,
            description: `Adversary lured by HoneyTokens to attack dynamically deployed honeypot ${decoy.label} (${decoy.ip}).`,
            target: decoy.id,
            success: true,
          },
          discoverNodes: [...(stepData.discoverNodes || []), decoy.id],
          nodeUpdates: {
            'workstation-1': { underAttack: false },
            'workstation-2': { underAttack: false },
            'active-directory': { underAttack: false, compromised: false, gnnRisk: 0.28 },
            [decoy.id]: { underAttack: true, compromised: true, discovered: true, gnnRisk: 0.96 },
          },
          ppoAction: {
            type: 'ACTIVATE_HIGH_INTERACTION_DECOY',
            target: decoy.label,
            confidence: 0.98,
            criticValue: 5.6,
            reasoning: `Adversary completely trapped in dynamically deployed honeypot ${decoy.label}! Domain Controller 100% safe.`,
            reward: 7.5,
          },
          metrics: {
            stepReward: 7.5,
            cumulativeReward: 12.2,
            dwellTimeDecoySec: 180,
            dwellTimeRealSec: 48,
            trappedAttacks: 1,
            totalAttacks: 4,
          },
          redLog: `[ACCESS GRANTED] Authenticated to ${decoy.ip} (${decoy.label}) root shell. Session #1 established.`,
          blueLog: `[DECEPTION SUCCESS] Adversary trapped in newly deployed honeypot ${decoy.label} (${decoy.ip}). Real Domain Controller 100% UNTOUCHED.`,
        };
      } else if (i === 4 && coreCustomDecoys.length > 0) {
        const decoy = coreCustomDecoys[0];
        stepData = {
          ...stepData,
          phase: `CORE DATABASE DECEPTION (${decoy.label.toUpperCase()})`,
          attackerAction: {
            cmd: `psql -h ${decoy.ip} -U dbadmin -d enterprise_prod -c "SELECT * FROM secrets"`,
            description: `Attacker targeted dynamically deployed DB decoy ${decoy.label} (${decoy.ip}).`,
            target: decoy.id,
            success: true,
          },
          discoverNodes: [...(stepData.discoverNodes || []), decoy.id],
          nodeUpdates: {
            'prod-database': { underAttack: false, compromised: false, gnnRisk: 0.25 },
            [decoy.id]: { underAttack: true, compromised: true, discovered: true, gnnRisk: 0.98 },
          },
          ppoAction: {
            type: 'DYNAMIC_TRAFFIC_REROUTE',
            target: decoy.label,
            confidence: 0.99,
            criticValue: 7.4,
            reasoning: `Adversary targeted custom decoy ${decoy.label} (${decoy.ip}) instead of Crown Jewel Database.`,
            reward: 8.5,
          },
          metrics: {
            stepReward: 8.5,
            cumulativeReward: 20.7,
            dwellTimeDecoySec: 360,
            dwellTimeRealSec: 52,
            trappedAttacks: 2,
            totalAttacks: 5,
          },
          redLog: `[EXFILTRATION] Connected to Database ${decoy.ip} (${decoy.label}). Exfiltrating confidential database tables.`,
          blueLog: `[MISSION SUCCESS] Attacker completely fooled by custom decoy ${decoy.label} (${decoy.ip}). Crown Jewel DB 100% secure.`,
        };
      }

      accumulatedSteps.push(stepData);

      if (stepData.attackerAction) {
        accumulatedRedLogs.push({
          cmd: stepData.attackerAction.cmd,
          output: stepData.redLog,
        });
      }

      const targetStr = (stepData?.attackerAction?.target || '').toLowerCase();
      const isDecoy = targetStr.includes('decoy') || (stepData?.metrics?.dwellTimeDecoySec > 0);
      accumulatedBlueLogs.push({
        stepIndex: i,
        phase: stepData.phase,
        timestamp: new Date().toLocaleTimeString(),
        cmd: stepData.attackerAction?.cmd,
        target: stepData.attackerAction?.target || '10.0.1.10',
        ppoAction: stepData.ppoAction?.type || 'MONITOR_SUBNET',
        ppoTarget: stepData.ppoAction?.target || stepData.attackerAction?.target,
        confidence: stepData.ppoAction?.confidence || 0.88,
        reward: stepData.ppoAction?.reward || 1.0,
        reasoning: stepData.ppoAction?.reasoning,
        details: stepData.blueLog,
        isDecoyTrapped: isDecoy,
        dwellWasted: stepData.metrics?.dwellTimeDecoySec || 0,
        databaseStatus: 'Enterprise Crown Jewel Database (10.0.3.50) is 100% SAFE and UNTOUCHED.'
      });

      if (stepData.discoverNodes) {
        newNodes = newNodes.map((n) => {
          if (stepData.discoverNodes.includes(n.id)) {
            return { ...n, discovered: true };
          }
          return n;
        });
      }

      if (stepData.nodeUpdates) {
        newNodes = newNodes.map((n) => {
          if (stepData.nodeUpdates[n.id]) {
            return { ...n, ...stepData.nodeUpdates[n.id] };
          }
          return n;
        });
      }
    }

    const { nodes: finalNodes, edges: finalEdges } = mergeWithCustomDecoys(newNodes, edgesRef.current);
    setNodes(finalNodes);
    setRedLogs(accumulatedRedLogs);
    setBlueLogs(accumulatedBlueLogs);
    setStepHistory(accumulatedSteps);

    broadcastState({
      currentStepIndex: targetIndex,
      isPlaying: isPlayingRef.current,
      speed: speedRef.current,
      nodes: finalNodes,
      edges: finalEdges,
      redLogs: accumulatedRedLogs,
      blueLogs: accumulatedBlueLogs,
      stepHistory: accumulatedSteps,
      activeVectorId,
    });
  }, [broadcastState, activeVectorId]);

  const stepForward = useCallback(() => {
    isControllerRef.current = true;
    setCurrentStepIndex((prev) => {
      const next = prev + 1;
      if (next >= SIMULATION_STEPS.length) {
        setIsPlaying(false);
        return prev;
      }
      applyStepState(next);
      try {
        fetch('/api/step', { method: 'POST' }).catch(() => {
          fetch('http://localhost:8001/api/step', { method: 'POST' }).catch(() => {});
        });
      } catch (e) {}
      return next;
    });
  }, [applyStepState]);

  const reset = useCallback(() => {
    isControllerRef.current = true;
    clearStoredCustomDecoys();
    setIsPlaying(false);
    setIsAttackExecuting(false);
    setAttackProgress(0);
    setCurrentStepIndex(0);
    setNodes(INITIAL_NODES);
    setEdges(INITIAL_EDGES);
    setSelectedNode(null);
    applyStepState(0);
    try {
      fetch('/api/reset', { method: 'POST' }).catch(() => {
        fetch('http://localhost:8001/api/reset', { method: 'POST' }).catch(() => {});
      });
    } catch (e) {}
  }, [applyStepState]);

  const togglePlay = useCallback(() => {
    isControllerRef.current = true;
    setIsPlaying((prev) => {
      // If already at or past the final step, halt - do NOT loop automatically
      if (currentStepIndex >= SIMULATION_STEPS.length - 1) {
        return false;
      }
      const next = !prev;
      broadcastState({
        currentStepIndex,
        isPlaying: next,
        speed: speedRef.current,
        nodes: nodesRef.current,
        edges: edgesRef.current,
        redLogs: redLogsRef.current,
        stepHistory: stepHistoryRef.current,
        activeVectorId,
      });
      return next;
    });
  }, [broadcastState, currentStepIndex, activeVectorId]);

  // Autonomous playback loop: advances simulation automatically when isPlaying is true
  useEffect(() => {
    if (!isPlaying) return;

    const intervalMs = Math.max(600, Math.floor(2500 / (speed || 1)));
    const timer = setInterval(() => {
      // Only the window that initiated play runs the interval to avoid double-stepping
      if (!isControllerRef.current) return;

      setCurrentStepIndex((prev) => {
        const next = prev + 1;
        if (next >= SIMULATION_STEPS.length) {
          setIsPlaying(false);
          const finalIndex = SIMULATION_STEPS.length - 1;
          broadcastState({
            currentStepIndex: finalIndex,
            isPlaying: false,
            speed: speedRef.current,
            nodes: nodesRef.current,
            edges: edgesRef.current,
            redLogs: redLogsRef.current,
            stepHistory: stepHistoryRef.current,
            activeVectorId,
          });
          return finalIndex;
        }
        applyStepState(next);
        try {
          fetch('/api/step', { method: 'POST' }).catch(() => {
            fetch('http://localhost:8001/api/step', { method: 'POST' }).catch(() => {});
          });
        } catch (e) {}
        return next;
      });
    }, intervalMs);

    return () => clearInterval(timer);
  }, [isPlaying, speed, applyStepState, broadcastState, activeVectorId]);

  // Execute a Predefined Attack Vector interactively
  const executeAttackVector = useCallback((vectorId, customParams = {}) => {
    const vector = PREDEFINED_ATTACK_VECTORS.find(v => v.id === vectorId);
    if (!vector || isAttackExecuting) return;

    isControllerRef.current = true;
    setIsAttackExecuting(true);
    setAttackProgress(10);
    setActiveVectorId(vectorId);

    const targetNodeId = vector.targetNodeId;
    const customDecoys = getStoredCustomDecoys();
    let initialMatchedCustomDecoy = null;
    if (vector.id === 'recon_syn_scan') {
      initialMatchedCustomDecoy = customDecoys.find(c => c.subnet === 'DMZ' || c.neighborOf === 'web-public' || c.neighborOf === 'gateway');
    } else if (vector.id === 'sql_injection_exfil') {
      initialMatchedCustomDecoy = customDecoys.find(c => c.neighborOf === 'web-public');
    } else if (vector.id === 'path_traversal_file_read') {
      initialMatchedCustomDecoy = customDecoys.find(c => c.subnet === 'Internal' || ['workstation-1', 'workstation-2', 'corp-router'].includes(c.neighborOf));
    } else if (vector.id === 'credential_stuffing_ssh') {
      initialMatchedCustomDecoy = customDecoys.find(c => c.subnet === 'Internal' || ['workstation-1', 'workstation-2', 'corp-router', 'active-directory'].includes(c.neighborOf));
    } else if (vector.id === 'remote_code_execution') {
      initialMatchedCustomDecoy = customDecoys.find(c => c.subnet === 'Core' || ['core-switch', 'prod-database'].includes(c.neighborOf));
    }

    const activeAttackTargetId = vector.id === 'path_traversal_file_read'
      ? (initialMatchedCustomDecoy ? initialMatchedCustomDecoy.id : 'decoy-hr-backup')
      : (initialMatchedCustomDecoy ? initialMatchedCustomDecoy.id : targetNodeId);

    // Immediately signal attack initiation across UI and companion window
    setNodes(prev => prev.map(n => ({
      ...n,
      underAttack: n.id === activeAttackTargetId || n.id === targetNodeId,
      discovered: (n.id === activeAttackTargetId || n.id === targetNodeId || (vector.id === 'path_traversal_file_read' && (n.id === 'workstation-2' || n.id === 'decoy-hr-backup'))) ? true : n.discovered,
    })));

    if (broadcastRef.current) {
      broadcastRef.current.postMessage({
        type: 'ATTACK_STARTED',
        payload: {
          vectorId,
          targetNodeId: activeAttackTargetId,
          activeVectorId: vectorId,
        },
      });
    }

    // Ping backend to advance CybORG simulation & PyTorch GNN/PPO
    try {
      const launchPayload = JSON.stringify({
        vector_id: vectorId,
        target_override: activeAttackTargetId,
        params: customParams,
      });
      fetch('/api/attack/launch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: launchPayload,
      }).catch(() => {
        fetch('http://localhost:8001/api/attack/launch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: launchPayload,
        }).catch(() => {});
      });
    } catch (e) {}

    let phase = 0;
    const interval = setInterval(() => {
      phase++;
      setAttackProgress(phase * 20);

      if (phase >= vector.executionPhases.length) {
        clearInterval(interval);
        setIsAttackExecuting(false);

        // Compute updated nodes cleanly
        const customDecoys = getStoredCustomDecoys();
        let matchedCustomDecoy = null;
        if (vector.id === 'recon_syn_scan') {
          matchedCustomDecoy = customDecoys.find(c => c.subnet === 'DMZ' || c.neighborOf === 'web-public' || c.neighborOf === 'gateway');
        } else if (vector.id === 'sql_injection_exfil') {
          matchedCustomDecoy = customDecoys.find(c => c.neighborOf === 'web-public');
        } else if (vector.id === 'path_traversal_file_read') {
          matchedCustomDecoy = customDecoys.find(c => c.subnet === 'Internal' || ['workstation-1', 'workstation-2', 'corp-router'].includes(c.neighborOf));
        } else if (vector.id === 'credential_stuffing_ssh') {
          matchedCustomDecoy = customDecoys.find(c => c.subnet === 'Internal' || ['workstation-1', 'workstation-2', 'corp-router', 'active-directory'].includes(c.neighborOf));
        } else if (vector.id === 'remote_code_execution') {
          matchedCustomDecoy = customDecoys.find(c => c.subnet === 'Core' || ['core-switch', 'prod-database'].includes(c.neighborOf));
        }

        const { nodes: currentWithCustom } = mergeWithCustomDecoys(nodesRef.current);
        const nextNodes = currentWithCustom.map(n => {
          const isTarget = n.id === targetNodeId;
          const impact = isTarget ? (vector.gnnImpact[targetNodeId] || {}) : {};
          let node = { ...n, underAttack: false };

          if (isTarget) {
            node = { ...node, discovered: true, ...impact };
          }

          if (matchedCustomDecoy && n.id === matchedCustomDecoy.id) {
            node = { ...node, underAttack: true, compromised: true, discovered: true, gnnRisk: 0.96 };
          }

          if (vector.id === 'recon_syn_scan') {
            if (n.id === 'web-public') node = { ...node, underAttack: true, discovered: true, gnnRisk: 0.65 };
            if (n.id === 'vpn-gw' || n.id === 'gateway') node = { ...node, discovered: true };
          } else if (vector.id === 'sql_injection_exfil') {
            if (n.id === 'web-public') node = { ...node, compromised: true, underAttack: false, gnnRisk: 0.88 };
            if (n.id === 'corp-router') node = { ...node, discovered: true };
          } else if (vector.id === 'path_traversal_file_read') {
            const honeypotId = matchedCustomDecoy ? matchedCustomDecoy.id : 'decoy-hr-backup';
            if (n.id === 'workstation-2') {
              node = { ...node, underAttack: false, discovered: true, gnnRisk: 0.32 };
            }
            if (n.id === honeypotId) {
              node = { ...node, underAttack: true, compromised: true, discovered: true, gnnRisk: 0.96 };
            }
            if (n.id === 'corp-router' || n.id === 'decoy-hr-backup') {
              node = { ...node, discovered: true };
            }
          } else if (vector.id === 'credential_stuffing_ssh') {
            if (matchedCustomDecoy) {
              if (n.id === 'workstation-2' || n.id === 'workstation-1') node = { ...node, underAttack: false };
              if (n.id === 'active-directory') node = { ...node, underAttack: false, gnnRisk: 0.28 };
            } else if (activeAttackTargetId === 'active-directory') {
              if (n.id === 'active-directory') node = { ...node, underAttack: true, compromised: true, gnnRisk: 0.88 };
            } else {
              if (n.id === 'decoy-hr-backup') node = { ...node, underAttack: true, compromised: true, discovered: true, gnnRisk: 0.96 };
              if (n.id === 'workstation-2') node = { ...node, underAttack: false };
            }
          } else if (vector.id === 'remote_code_execution') {
            if (matchedCustomDecoy) {
              if (n.id === 'prod-database') node = { ...node, underAttack: false, gnnRisk: 0.24 };
            } else if (activeAttackTargetId === 'prod-database') {
              if (n.id === 'prod-database') node = { ...node, underAttack: true, compromised: true, gnnRisk: 0.99 };
            } else {
              if (n.id === 'decoy-db-replica') node = { ...node, underAttack: true, compromised: true, discovered: true, gnnRisk: 0.98 };
              if (n.id === 'prod-database' && !node.compromised) node = { ...node, gnnRisk: 0.28 };
            }
          }
          return node;
        });

        const targetHoneypotId = matchedCustomDecoy ? matchedCustomDecoy.id : 'decoy-hr-backup';
        const targetHoneypotLabel = matchedCustomDecoy ? matchedCustomDecoy.label : 'HR-Payroll-Backup [DECOY]';
        const targetHoneypotIp = matchedCustomDecoy ? matchedCustomDecoy.ip : '10.0.2.199';

        const activeTargetLabel = vector.id === 'path_traversal_file_read'
          ? targetHoneypotLabel
          : (matchedCustomDecoy ? matchedCustomDecoy.label : targetNodeId);

        const activeTargetIp = vector.id === 'path_traversal_file_read'
          ? targetHoneypotIp
          : (matchedCustomDecoy ? matchedCustomDecoy.ip : '10.0.x.x');

        const redCmd = vector.id === 'path_traversal_file_read'
          ? `curl -s "http://10.0.2.102/dev?file=../../credentials.env" && ssh -i fake_id_rsa root@${activeTargetIp}`
          : (matchedCustomDecoy 
              ? `${vector.c2Command} [REDIRECTED -> ${activeTargetIp}]`
              : vector.c2Command);

        const redResult = vector.id === 'path_traversal_file_read'
          ? `[LATERAL HOP SUCCESS] Pivoted from 10.0.2.102 into target ${activeTargetIp}. Interactive shell session established.`
          : (matchedCustomDecoy
              ? `[EXPLOIT SUCCESS] Connected to target ${matchedCustomDecoy.label} (${activeTargetIp}). Interactive root shell session spawned.`
              : vector.simulatedResult);

        const blueLog = vector.id === 'path_traversal_file_read'
          ? `[PPO LATERAL INTERCEPTION] Adversary lateral pivot from workstation-2 baited and trapped into Honeypot ${activeTargetLabel} (${activeTargetIp})! Real Domain Controller safe. Reward: +4.5`
          : (matchedCustomDecoy
              ? `[PPO REACTIVE DECEPTION] Dynamic Honeypot ${matchedCustomDecoy.label} absorbed incoming ${vector.name}! Adversary trapped. Core assets 100% secure. Reward: +7.5`
              : `[PPO DEFENDER] Handled ${vector.name}. Applied ${vector.ppoReaction.type}. Reward: +${vector.ppoReaction.reward}`);

        const newRedLog = {
          cmd: redCmd,
          output: redResult,
          phases: vector.executionPhases.map(p => p.text),
          vectorName: vector.name,
          timestamp: new Date().toLocaleTimeString(),
        };
        const updatedRedLogs = [...redLogsRef.current, newRedLog];

        const VECTOR_STEP_INDEX = {
          'recon_syn_scan': 0,
          'sql_injection_exfil': 1,
          'path_traversal_file_read': 2,
          'credential_stuffing_ssh': 3,
          'remote_code_execution': 4,
        };
        const targetStepIdx = VECTOR_STEP_INDEX[vector.id] !== undefined ? VECTOR_STEP_INDEX[vector.id] : 0;

        const newBlueLog = {
          stepIndex: targetStepIdx,
          phase: matchedCustomDecoy ? `DYNAMIC DECEPTION (${matchedCustomDecoy.label.toUpperCase()})` : vector.name.toUpperCase(),
          timestamp: new Date().toLocaleTimeString(),
          cmd: redCmd,
          target: activeTargetLabel,
          ppoAction: vector.id === 'path_traversal_file_read' ? 'ISOLATE_LATERAL_PATH' : (matchedCustomDecoy ? 'ACTIVATE_DYNAMIC_HONEYPOT' : vector.ppoReaction.type),
          ppoTarget: activeTargetLabel,
          confidence: 0.96,
          reward: vector.id === 'path_traversal_file_read' ? 4.5 : (matchedCustomDecoy ? 7.5 : vector.ppoReaction.reward),
          reasoning: vector.id === 'path_traversal_file_read'
            ? `Adversary lateral traversal from workstation-2 intercepted and lured into Honeypot (${activeTargetIp}). Real Domain Controller protected.`
            : (matchedCustomDecoy 
                ? `Adversary lured into dynamically deployed honeypot ${matchedCustomDecoy.label}. Real enterprise servers preserved.`
                : vector.ppoReaction.reasoning),
          details: blueLog,
          isDecoyTrapped: Boolean(vector.id === 'path_traversal_file_read' || matchedCustomDecoy || (vector.targetNodeId && vector.targetNodeId.includes('decoy'))),
          dwellWasted: vector.id === 'path_traversal_file_read' ? 90 : (matchedCustomDecoy ? 180 : (vector.id === 'credential_stuffing_ssh' ? 120 : (vector.id === 'remote_code_execution' ? 270 : 0))),
          databaseStatus: 'Enterprise Crown Jewel Database (10.0.3.50) is 100% SAFE and UNTOUCHED.'
        };
        const updatedBlueLogs = [...blueLogsRef.current, newBlueLog];

        // Synchronize with the 6-stage campaign kill chain
        const updatedHistory = SIMULATION_STEPS.map((s, idx) => {
          if (idx === targetStepIdx) {
            return {
              ...s,
              phase: matchedCustomDecoy ? `DYNAMIC DECEPTION (${matchedCustomDecoy.label.toUpperCase()})` : vector.name.toUpperCase(),
              attackerAction: {
                cmd: redCmd,
                description: vector.id === 'path_traversal_file_read'
                  ? `Adversary lured by HoneyTokens on workstation-2 to pivot laterally into Honeypot ${activeTargetLabel} (${activeTargetIp}).`
                  : (matchedCustomDecoy 
                      ? `Adversary lured by fake credentials & services on newly placed honeypot ${matchedCustomDecoy.label} (${activeTargetIp}).`
                      : vector.description),
                target: activeTargetLabel,
              },
              ppoAction: vector.id === 'path_traversal_file_read' ? {
                type: 'ISOLATE_LATERAL_PATH',
                target: activeTargetLabel,
                confidence: 0.96,
                criticValue: 3.2,
                reasoning: `Lateral traversal from workstation-2 successfully lured into Honeypot ${activeTargetLabel}. Domain Controller safe.`,
                reward: 4.5,
              } : (matchedCustomDecoy ? {
                type: 'ACTIVATE_DYNAMIC_HONEYPOT',
                target: matchedCustomDecoy.label,
                confidence: 0.98,
                criticValue: 6.2,
                reasoning: `Adversary lured into dynamically deployed honeypot ${matchedCustomDecoy.label}. Real enterprise servers preserved.`,
                reward: 7.5,
              } : vector.ppoReaction),
              redLog: redResult,
              blueLog: blueLog,
            };
          }
          return s;
        });

        const nextStepIndex = Math.min(targetStepIdx, SIMULATION_STEPS.length - 1);

        const { edges: currentEdges } = mergeWithCustomDecoys([], edgesRef.current);
        let updatedEdges = [...currentEdges];
        if (vector.id === 'path_traversal_file_read') {
          if (!updatedEdges.some(e => e.source === 'workstation-2' && e.target === targetHoneypotId)) {
            updatedEdges.push({ source: 'workstation-2', target: targetHoneypotId });
          }
        }

        // Apply state cleanly
        setNodes(nextNodes);
        setEdges(updatedEdges);
        setRedLogs(updatedRedLogs);
        setBlueLogs(updatedBlueLogs);
        setStepHistory(updatedHistory);
        setCurrentStepIndex(nextStepIndex);

        // Broadcast to companion windows
        if (broadcastRef.current) {
          broadcastRef.current.postMessage({
            type: 'ATTACK_EXECUTED',
            payload: {
              nodes: nextNodes,
              edges: updatedEdges,
              redLogs: updatedRedLogs,
              blueLogs: updatedBlueLogs,
              stepHistory: updatedHistory,
              currentStepIndex: nextStepIndex,
              activeVectorId: vectorId,
              targetNodeId: targetNodeId,
            },
          });
        }
      }
    }, 350);
  }, [isAttackExecuting]);

  // Select node is strictly local to the active view; NEVER broadcasted to attacker side
  const selectNode = useCallback((node) => {
    setSelectedNode(node);
  }, []);

  const manualDeception = useCallback((action, targetNodeOverride = null) => {
    const targetNode = 
      targetNodeOverride || 
      action.targetNode || 
      selectedNode || 
      (action.targetNodeId ? nodes.find(n => n.id === action.targetNodeId) : null) ||
      nodes.find(n => !n.isHoneypot && n.discovered) ||
      nodes[0];

    const decoyId = `decoy-${Date.now().toString().slice(-4)}`;
    const subnet = targetNode.subnet || 'Internal';
    
    let subnetOctet = '2';
    if (subnet === 'DMZ') subnetOctet = '1';
    else if (subnet === 'Core') subnetOctet = '3';
    const decoyIp = `10.0.${subnetOctet}.${Math.floor(Math.random() * 40) + 210}`;

    let offsetX = 44;
    let offsetY = targetNode.y > 220 ? -36 : 36;

    if (subnet === 'DMZ') {
      if (targetNode.x + offsetX > 215) offsetX = -42;
    } else if (subnet === 'Internal') {
      if (targetNode.x + offsetX > 480) offsetX = -42;
      if (targetNode.x + offsetX < 290) offsetX = 42;
    } else if (subnet === 'Core') {
      if (targetNode.x + offsetX > 730) offsetX = -44;
      if (targetNode.x + offsetX < 550) offsetX = 44;
    }

    const newX = targetNode.x + offsetX;
    const newY = Math.max(75, Math.min(325, targetNode.y + offsetY));

    const newDecoyNode = {
      id: decoyId,
      label: action.label ? (action.label.includes('Decoy') ? action.label : `Decoy-${action.label}`) : `Decoy-${targetNode.label}`,
      ip: decoyIp,
      subnet: subnet,
      type: 'honeypot',
      services: ['Emulated Honey Service', 'Cowrie HoneySSH', 'Decoy Banner'],
      os: 'CybORG Responsive Decoy Container',
      isHoneypot: true,
      honeypotType: 'High-Interaction Responsive Honeypot',
      compromised: false,
      underAttack: false,
      gnnRisk: 0.94,
      x: newX,
      y: newY,
      discovered: true,
      disguiseAs: `Clone of ${targetNode.label}`,
      neighborOf: targetNode.id,
    };

    const newEdge = { source: targetNode.id, target: decoyId };

    // Persist to localStorage so NO action can ever wipe this decoy out
    saveCustomDecoy(newDecoyNode, newEdge);

    const nextNodes = [...nodes, newDecoyNode];
    const nextEdges = [...edges, newEdge];

    setNodes(nextNodes);
    setEdges(nextEdges);

    // Sync to backend CybORG simulation if online
    try {
      const deployPayload = JSON.stringify({
        label: newDecoyNode.label,
        target_subnet: subnet,
        custom_node: newDecoyNode,
      });
      fetch('/api/deception/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: deployPayload,
      }).catch(() => {
        fetch('http://localhost:8001/api/deception/deploy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: deployPayload,
        }).catch(() => {});
      });
    } catch (e) {}

    broadcastState({
      currentStepIndex,
      isPlaying,
      speed,
      nodes: nextNodes,
      edges: nextEdges,
      redLogs,
      stepHistory,
      activeVectorId,
    });
  }, [nodes, edges, selectedNode, broadcastState, currentStepIndex, isPlaying, speed, redLogs, stepHistory, activeVectorId]);

  const updateNodePosition = useCallback((nodeId, x, y) => {
    setNodes(prev => {
      const next = prev.map(n => n.id === nodeId ? { ...n, x, y } : n);
      // If it's a custom decoy, update stored coordinates in localStorage
      const customDecoy = getStoredCustomDecoys().find(d => d.id === nodeId);
      if (customDecoy) {
        saveCustomDecoy({ ...customDecoy, x, y });
      }

      broadcastState({
        currentStepIndex,
        isPlaying,
        speed,
        nodes: next,
        edges,
        redLogs,
        stepHistory,
        activeVectorId,
      });
      return next;
    });
  }, [broadcastState, currentStepIndex, isPlaying, speed, edges, redLogs, stepHistory, activeVectorId]);

  const resetNodeLayout = useCallback(() => {
    clearStoredCustomDecoys();
    setNodes(INITIAL_NODES);
    setEdges(INITIAL_EDGES);
    broadcastState({
      currentStepIndex,
      isPlaying,
      speed,
      nodes: INITIAL_NODES,
      edges: INITIAL_EDGES,
      redLogs,
      stepHistory,
      activeVectorId,
    });
  }, [broadcastState, currentStepIndex, isPlaying, speed, redLogs, stepHistory, activeVectorId]);

  const currentStepData = stepHistory[currentStepIndex] || SIMULATION_STEPS[0];

  return (
    <SimulationContext.Provider
      value={{
        currentStepIndex,
        totalSteps: SIMULATION_STEPS.length,
        currentStepData,
        isPlaying,
        speed,
        setSpeed,
        nodes,
        edges,
        redLogs,
        blueLogs,
        stepHistory,
        selectedNode,
        activeVectorId,
        setActiveVectorId,
        vectorParams,
        setVectorParams,
        isAttackExecuting,
        attackProgress,
        isBackendConnected,
        executeAttackVector,
        updateNodePosition,
        resetNodeLayout,
        stepForward,
        reset,
        togglePlay,
        manualDeception,
        selectNode,
      }}
    >
      {children}
    </SimulationContext.Provider>
  );
}

export function useSimulation() {
  const context = useContext(SimulationContext);
  if (!context) {
    throw new Error('useSimulation must be used within a SimulationProvider');
  }
  return context;
}
