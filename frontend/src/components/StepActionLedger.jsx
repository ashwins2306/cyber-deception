import React, { useState, useRef, useEffect } from 'react';
import { 
  ShieldAlert, 
  BrainCircuit, 
  Zap, 
  Target, 
  Terminal, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Ghost, 
  Layers, 
  ArrowRight,
  Eye,
  Check,
  Flame,
  ChevronRight,
  RotateCw,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { SIMULATION_STEPS } from '../mock/simulationEngine';
import { useSimulation } from '../context/SimulationContext';

export default function StepActionLedger({ currentStepIndex, stepHistory, onSelectStep }) {
  // Allow user to click and inspect any step in the timeline (default to active step)
  const [inspectedStepIndex, setInspectedStepIndex] = useState(null);
  const [isTerminalExpanded, setIsTerminalExpanded] = useState(false);
  const { blueLogs, isAttackExecuting } = useSimulation();
  const terminalBottomRef = useRef(null);

  // Dynamic step list bounded strictly to the 6-phase campaign kill chain
  const effectiveSteps = (stepHistory && stepHistory.length > 0) ? stepHistory.slice(0, 6) : SIMULATION_STEPS;
  const activeIndex = Math.min(Math.max(0, currentStepIndex ?? 0), effectiveSteps.length - 1);
  const displayIndex = inspectedStepIndex !== null 
    ? Math.min(inspectedStepIndex, effectiveSteps.length - 1) 
    : activeIndex;

  const currentStep = effectiveSteps[displayIndex] || effectiveSteps[effectiveSteps.length - 1] || SIMULATION_STEPS[0];
  const ppo = currentStep?.ppoAction;
  const attacker = currentStep?.attackerAction;
  const metrics = currentStep?.metrics;

  const isCurrentActive = displayIndex === activeIndex;

  // Auto-scroll deception terminal to bottom when new logs arrive
  useEffect(() => {
    if (terminalBottomRef.current) {
      terminalBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [blueLogs, activeIndex, isAttackExecuting]);

  // Build terminal logs ensuring rich real-time display
  const terminalLogs = (blueLogs && blueLogs.length > 0)
    ? blueLogs
    : effectiveSteps.slice(0, activeIndex + 1).map((s, idx) => {
        const targetStr = (s?.attackerAction?.target || '').toLowerCase();
        const isDecoy = targetStr.includes('decoy') || (s?.metrics?.dwellTimeDecoySec > 0);
        return {
          stepIndex: idx,
          phase: s?.phase || `PHASE ${idx + 1}`,
          target: s?.attackerAction?.target || '10.0.1.10',
          ppoAction: s?.ppoAction?.type || 'MONITOR_SUBNET',
          confidence: s?.ppoAction?.confidence || 0.88,
          reward: s?.ppoAction?.reward || 1.0,
          reasoning: s?.ppoAction?.reasoning,
          details: s?.blueLog,
          isDecoyTrapped: isDecoy,
          dwellWasted: s?.metrics?.dwellTimeDecoySec || 0,
          timestamp: new Date().toLocaleTimeString(),
        };
      });

  const formatPhaseLabel = (phase, idx) => {
    if (!phase) return `Phase ${idx + 1}`;
    const p = phase.toUpperCase();
    if (p.includes('RECON')) return '1. Recon';
    if (p.includes('INITIAL')) return '2. Ingress Access';
    if (p.includes('LATERAL') || p.includes('PROBE')) return '3. Lateral Pivot';
    if (p.includes('HONEYPOT') || p.includes('TARPIT')) return '4. Honeypot Trap';
    if (p.includes('CORE') || p.includes('DATABASE')) return '5. Core Defense';
    if (p.includes('ISOLATION') || p.includes('NEUTRALIZATION')) return '6. Isolation';
    return `${idx + 1}. ${phase}`;
  };

  return (
    <div className="bg-slate-900/90 rounded-xl border border-slate-800 flex flex-col h-full overflow-hidden shadow-lg">
      {/* Frame Header */}
      <div className="p-3 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 rounded-lg bg-cyan-950/80 border border-cyan-800/60 text-cyan-400">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-100 font-mono flex items-center">
              <span>STEP ACTION AUDIT & INTELLIGENCE LEDGER</span>
              <span className="ml-2 px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-950/80 text-cyan-300 border border-cyan-800/40">
                Step {displayIndex + 1} of {effectiveSteps.length}
              </span>
            </h3>
            <p className="text-[10px] text-slate-400 font-mono">
              Live audit of Attacker Operations vs. GNN Analysis vs. PPO Autonomous Deception
            </p>
          </div>
        </div>

        {/* Live sync badge */}
        <span className="px-2 py-0.5 rounded text-[10px] font-mono flex items-center space-x-1.5 bg-emerald-950/50 border border-emerald-800/50 text-emerald-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>CYBORG ENGAGED</span>
        </span>
      </div>

      {/* Step Selector Horizontal Ribbon */}
      <div className="p-2 border-b border-slate-800/80 bg-slate-900/40 flex items-center gap-1.5 overflow-x-auto shrink-0 scrollbar-none">
        {effectiveSteps.map((step, idx) => {
          const isDone = idx < activeIndex;
          const isCurrent = idx === activeIndex;
          const isInspected = idx === displayIndex;

          return (
            <button
              key={`${step?.step || idx}-${idx}`}
              onClick={() => setInspectedStepIndex(idx)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium flex items-center space-x-1.5 transition shrink-0 ${
                isInspected
                  ? 'bg-cyan-500 text-black shadow-md font-bold'
                  : isCurrent
                  ? 'bg-cyan-950 text-cyan-300 border border-cyan-700/80 animate-pulse'
                  : isDone
                  ? 'bg-slate-800/90 text-slate-300 hover:bg-slate-700 border border-slate-700/60'
                  : 'bg-slate-900/60 text-slate-500 border border-slate-800'
              }`}
              title={`View Step ${step?.step || idx + 1}: ${step?.phase || 'Step'}`}
            >
              <span className="whitespace-nowrap text-[11px] font-bold">
                {formatPhaseLabel(step?.phase, idx)}
              </span>
              {isDone && <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 ml-1" />}
            </button>
          );
        })}

        {inspectedStepIndex !== null && inspectedStepIndex !== activeIndex && (
          <button
            onClick={() => setInspectedStepIndex(null)}
            className="ml-auto px-2 py-1 rounded text-[10px] font-mono text-cyan-400 hover:bg-slate-800 transition"
          >
            Reset to Active
          </button>
        )}
      </div>

      {/* Main Audit Content Area */}
      <div className="flex-1 p-3 overflow-y-auto space-y-3 min-w-0">
        {/* Phase Banner */}
        <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/80 border border-slate-800">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <span className="text-xs font-bold text-cyan-300 font-mono tracking-wide">
              PHASE {displayIndex + 1}: {currentStep?.phase || 'RECONNAISSANCE'}
            </span>
          </div>
          <div className="flex items-center space-x-3 text-[11px] font-mono">
            <span className="text-slate-400">
              Dwell Wasted: <strong className="text-emerald-400">+{metrics?.dwellTimeDecoySec || 0}s</strong>
            </span>
            <span className="text-slate-400">
              Reward: <strong className="text-cyan-400">+{metrics?.stepReward?.toFixed(1) || 0}</strong>
            </span>
          </div>
        </div>

        {/* 4 Core Pillars Grid (Collapsible to maximize terminal viewable space) */}
        {isTerminalExpanded ? (
          <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 text-[11px] font-mono flex flex-wrap items-center justify-between gap-2 shrink-0">
            <div className="flex items-center space-x-2">
              <span className="text-red-400 font-bold flex items-center">
                <Flame className="w-3 h-3 mr-1 text-red-400" />
                Target: {attacker?.target || '10.0.1.10'}
              </span>
              <span className="text-slate-600">|</span>
              <span className="text-cyan-400 flex items-center">
                <BrainCircuit className="w-3 h-3 mr-1 text-cyan-400" />
                GNN Risk: {currentStep?.nodeUpdates?.[attacker?.target]?.gnnRisk ? currentStep.nodeUpdates[attacker.target].gnnRisk.toFixed(2) : (currentStep?.gnnRisk || 0.85)}
              </span>
              <span className="text-slate-600">|</span>
              <span className="text-emerald-400 flex items-center">
                <Zap className="w-3 h-3 mr-1 text-emerald-400" />
                PPO: {ppo?.type || 'MONITOR'} ({((ppo?.confidence || 0.85) * 100).toFixed(0)}%)
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-purple-300 font-bold">Dwell Wasted: +{metrics?.dwellTimeDecoySec || 0}s</span>
              <span className="text-emerald-400 font-bold flex items-center">
                <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-400" />
                DB 100% SAFE
              </span>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {/* Pillar 1: Adversary Action */}
          <div className="p-2.5 rounded-lg bg-red-950/20 border border-red-900/40 space-y-1.5 flex flex-col">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="font-bold text-red-400 flex items-center">
                <Flame className="w-3.5 h-3.5 mr-1 text-red-400 shrink-0" />
                1. Adversary Offensive Action
              </span>
              <span className="px-1.5 py-0.5 rounded text-[9px] bg-red-900/40 text-red-300 uppercase">
                Red Team
              </span>
            </div>

            <div className="text-[11px] font-mono text-slate-300 space-y-1">
              <div className="flex items-center space-x-1.5">
                <span className="text-slate-400">Target Node:</span>
                <span className="px-1.5 py-0.2 rounded bg-slate-800 text-red-300 font-bold">
                  {attacker?.target || 'Perimeter Web App'}
                </span>
              </div>
              <p className="text-[11px] text-slate-300 leading-snug">
                {attacker?.description || 'Adversary probes network perimeter for vulnerable endpoints.'}
              </p>
            </div>

            <div className="mt-auto pt-1.5 border-t border-red-900/30">
              <div className="bg-black/60 rounded px-2 py-1 font-mono text-[10px] text-red-300/90 break-all border border-red-900/30 flex items-center space-x-1.5">
                <Terminal className="w-3 h-3 text-red-400 shrink-0" />
                <span>{attacker?.cmd || 'nmap -sS -p 22,80,443 10.0.1.0/24'}</span>
              </div>
            </div>
          </div>

          {/* Pillar 2: GNN Topology Representation */}
          <div className="p-2.5 rounded-lg bg-cyan-950/20 border border-cyan-900/40 space-y-1.5 flex flex-col">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="font-bold text-cyan-400 flex items-center">
                <BrainCircuit className="w-3.5 h-3.5 mr-1 text-cyan-400 shrink-0" />
                2. GNN Graph Risk Assessment
              </span>
              <span className="px-1.5 py-0.5 rounded text-[9px] bg-cyan-900/40 text-cyan-300 uppercase">
                PyTorch GAT
              </span>
            </div>

            <div className="text-[11px] font-mono text-slate-300 space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Topological Risk Score:</span>
                <span className="font-bold text-amber-400">
                  {currentStep?.nodeUpdates?.[attacker?.target]?.gnnRisk 
                    ? currentStep.nodeUpdates[attacker.target].gnnRisk.toFixed(2)
                    : (currentStep?.gnnRisk || 0.85)}
                </span>
              </div>
              <p className="text-[11px] text-slate-300 leading-snug">
                {currentStep?.blueLog || 'GNN evaluated neighborhood adjacency and structural edge centrality.'}
              </p>
            </div>

            <div className="mt-auto pt-1.5 border-t border-cyan-900/30 text-[10px] font-mono text-cyan-400/90 flex items-center space-x-1">
              <CheckCircle2 className="w-3 h-3 text-cyan-400 shrink-0" />
              <span>Edge message-passing updated graph embeddings (16-dim).</span>
            </div>
          </div>

          {/* Pillar 3: PPO Autonomous Deception Response */}
          <div className="p-2.5 rounded-lg bg-emerald-950/20 border border-emerald-900/40 space-y-1.5 flex flex-col">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="font-bold text-emerald-400 flex items-center">
                <Zap className="w-3.5 h-3.5 mr-1 text-emerald-400 shrink-0" />
                3. PPO Autonomous Deception
              </span>
              <span className="px-1.5 py-0.5 rounded text-[9px] bg-emerald-900/40 text-emerald-300 uppercase">
                RL Policy
              </span>
            </div>

            <div className="text-[11px] font-mono text-slate-300 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Action Dispatched:</span>
                <span className="px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 font-bold text-[10px] border border-emerald-800/40">
                  {ppo?.type || 'MONITOR'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Confidence / Critic V(s):</span>
                <span className="text-slate-200 font-bold">
                  {((ppo?.confidence || 0.85) * 100).toFixed(0)}% (V: {ppo?.criticValue || 0})
                </span>
              </div>
              <p className="text-[11px] text-slate-300 leading-snug italic pt-0.5">
                "{ppo?.reasoning || 'Topology risk assessment within safe threshold.'}"
              </p>
            </div>

            <div className="mt-auto pt-1.5 border-t border-emerald-900/30 text-[10px] font-mono text-emerald-400 flex justify-between items-center">
              <span>RL Reward Earned:</span>
              <span className="font-bold text-emerald-300">+{ppo?.reward || 1.0} pts</span>
            </div>
          </div>

          {/* Pillar 4: Tactical Deception Defense Outcome */}
          <div className="p-2.5 rounded-lg bg-purple-950/20 border border-purple-900/40 space-y-1.5 flex flex-col">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="font-bold text-purple-400 flex items-center">
                <Ghost className="w-3.5 h-3.5 mr-1 text-purple-400 shrink-0" />
                4. Tactical Deception Outcome
              </span>
              <span className="px-1.5 py-0.5 rounded text-[9px] bg-purple-900/40 text-purple-300 uppercase">
                Defense State
              </span>
            </div>

            <div className="text-[11px] font-mono text-slate-300 space-y-1">
              <div className="flex items-center space-x-1.5">
                <span className="text-slate-400">Trapped Status:</span>
                {(() => {
                  const targetStr = (currentStep?.attackerAction?.target || '').toLowerCase();
                  const isDecoy = targetStr.includes('decoy') || (currentStep?.metrics?.dwellTimeDecoySec > 0);
                  if (displayIndex > activeIndex) {
                    return (
                      <span className="px-1.5 py-0.5 rounded bg-slate-900 text-slate-500 font-medium text-[10px] border border-slate-800">
                        AWAITING TRIGGER
                      </span>
                    );
                  }
                  if (isDecoy) {
                    return (
                      <span className="px-1.5 py-0.5 rounded bg-purple-950 text-purple-300 font-bold text-[10px] border border-purple-800/40 flex items-center space-x-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-ping mr-1" />
                        <span>ADVERSARY TRAPPED IN HONEYPOT</span>
                      </span>
                    );
                  }
                  return (
                    <span className="px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 font-bold text-[10px] border border-cyan-800/40">
                      LURING ADVERSARY TO DECOY
                    </span>
                  );
                })()}
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-400">Crown Jewel Integrity:</span>
                <span className="text-emerald-400 font-bold flex items-center">
                  <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-400" />
                  100% UNCOMPROMISED
                </span>
              </div>

              <p className="text-[10px] text-slate-400 pt-0.5 leading-snug">
                {(() => {
                  const targetStr = (currentStep?.attackerAction?.target || '').toLowerCase();
                  if (displayIndex > activeIndex) {
                    return 'This phase has not executed yet. Start automation or launch an attack vector to observe real-time AI deception.';
                  }
                  if (targetStr.includes('decoy') || (currentStep?.metrics?.dwellTimeDecoySec > 0)) {
                    return `Attacker compute diverted to high-interaction honeypot container (${currentStep?.attackerAction?.target}). Real enterprise servers remain completely safe.`;
                  }
                  return 'Proactive honeytokens and service banner spoofs active on perimeter to steer upcoming lateral hops.';
                })()}
              </p>
            </div>

            <div className="mt-auto pt-1.5 border-t border-purple-900/30 text-[10px] font-mono text-purple-300 flex items-center justify-between">
              <span>Cumulative Dwell Wasted:</span>
              <strong className="text-amber-400">{metrics?.dwellTimeDecoySec || 0} seconds</strong>
            </div>
          </div>
        </div>
      )}

        {/* Bottom Live Deception Telemetry & Defense Response Terminal */}
        <div className="flex-1 flex flex-col bg-black/90 border border-slate-800 rounded-xl overflow-hidden shadow-2xl font-mono text-xs mt-2 min-h-[320px]">
          {/* Terminal Header */}
          <div className="px-4 py-2 bg-[#06121f] border-b border-cyan-950/80 flex items-center justify-between text-slate-300 text-[11px] shrink-0">
            <div className="flex items-center space-x-2">
              <Terminal className="w-3.5 h-3.5 text-cyan-400" />
              <span className="font-bold text-cyan-200 tracking-wide">LIVE DECEPTION TELEMETRY &amp; DEFENSE RESPONSE TERMINAL</span>
            </div>
            <div className="flex items-center space-x-3 text-[10px]">
              <div className="flex items-center text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping mr-1" />
                <span>STREAMING // WEBSOCKET // CYBORG SOC</span>
              </div>
              <button
                onClick={() => setIsTerminalExpanded(prev => !prev)}
                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 hover:text-cyan-100 border border-slate-700/60 transition flex items-center space-x-1 font-mono text-[10px]"
                title={isTerminalExpanded ? "Contract view to show all pillar cards" : "Maximize terminal to utilize full bottom frame space"}
              >
                {isTerminalExpanded ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
                <span>{isTerminalExpanded ? 'Contract View' : 'Maximize Frame'}</span>
              </button>
            </div>
          </div>

          {/* Script Command Line Prompt */}
          <div className="px-4 py-1.5 bg-[#030914] border-b border-slate-900 text-slate-400 text-[11px] flex items-center justify-between shrink-0">
            <div>
              <span className="text-cyan-400 select-none">soc@acds-deception:~$ </span>
              <span className="text-emerald-400 font-semibold">tail -f /var/log/acds/deception_telemetry.log</span>
            </div>
            <span className="text-[10px] text-slate-500 font-mono">CHANNEL: BLUE_SOC_FEED</span>
          </div>

          {/* Live Console Output Body */}
          <div className={`flex-1 p-3.5 space-y-2.5 overflow-y-auto text-slate-300 text-[11px] ${
            isTerminalExpanded ? 'min-h-[480px] max-h-[720px]' : 'min-h-[300px] max-h-[480px]'
          }`}>
            {terminalLogs.length === 0 ? (
              <div className="text-slate-500 italic py-4 text-center">
                SOC Deception Telemetry Stream initialized. Listening on CybORG environment...<br />
                Real-time GNN topology risk evaluations and PPO defensive deployments will stream here.
              </div>
            ) : null}

            {terminalLogs.map((log, i) => (
              <div key={i} className="space-y-1.5 pb-2.5 border-b border-slate-900/90 last:border-b-0">
                <div className="text-slate-400 flex items-center justify-between">
                  <span className="text-cyan-400 font-bold flex items-center space-x-1.5">
                    <span className="text-emerald-400 font-mono">[{log.phase || `PHASE ${i + 1}`}]</span>
                    <span className="text-slate-300 font-normal">» Adversary Target:</span>
                    <span className="text-amber-300 font-mono">{log.target}</span>
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">{log.timestamp}</span>
                </div>

                <div className="pl-3 border-l-2 border-cyan-800/60 space-y-1 text-[10.5px]">
                  <div className="text-purple-300">
                    <strong className="text-purple-400">PPO POLICY ACTION:</strong> {log.ppoAction}{' '}
                    {log.confidence && (
                      <span className="text-slate-400 ml-1">
                        (Confidence: {Math.round(log.confidence * 100)}% | Reward: +{log.reward})
                      </span>
                    )}
                  </div>
                  {log.details && (
                    <div className="text-slate-400">
                      <strong className="text-slate-300">TELEMETRY:</strong> {log.details}
                    </div>
                  )}
                  {log.reasoning && (
                    <div className="text-slate-400 italic">
                      "{log.reasoning}"
                    </div>
                  )}
                </div>

                {/* THE EXCLUSIVE MESSAGE SPECIFIED BY THE USER: ONLY ON DECEPTION SIDE */}
                <div className="text-emerald-400 pl-3 font-semibold mt-1 flex items-center space-x-1.5 bg-emerald-950/30 py-1 px-2 rounded border border-emerald-900/40">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>✔ ENTERPRISE DEFENSE STATUS: Enterprise Crown Jewel Database (10.0.3.50) is 100% SAFE and UNTOUCHED.</span>
                </div>
              </div>
            ))}

            {isAttackExecuting && (
              <div className="space-y-1 pt-1 text-cyan-300">
                <div className="flex items-center space-x-1.5 text-cyan-400">
                  <RotateCw className="w-3 h-3 animate-spin" />
                  <span>Analyzing real-time adversary telemetry & activating deceptive countermeasures...</span>
                </div>
              </div>
            )}

            <div ref={terminalBottomRef} />
          </div>
        </div>
      </div>
    </div>
  );
}
