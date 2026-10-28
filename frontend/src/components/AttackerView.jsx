import React, { useRef, useEffect } from 'react';
import { 
  Skull, 
  Terminal as TerminalIcon, 
  Flame, 
  Clock, 
  Crosshair, 
  CheckCircle2, 
  AlertTriangle,
  Target
} from 'lucide-react';
import NetworkGraph from './NetworkGraph';

export default function AttackerView({
  nodes,
  edges,
  selectedNode,
  onSelectNode,
  currentStepData,
  logHistory,
}) {
  const terminalRef = useRef(null);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [logHistory]);

  const activeTargetId = currentStepData?.attackerAction?.target;
  const discoveredCount = nodes.filter(n => n.discovered).length;
  const pwnedCount = nodes.filter(n => n.discovered && n.compromised).length;
  const dwellWasted = currentStepData?.metrics?.dwellTimeDecoySec || 0;
  const isTrapped = currentStepData?.metrics?.trappedAttacks > 0;

  return (
    <div className="flex flex-col h-full bg-[#0b0f19] border border-red-950/60 rounded-xl overflow-hidden shadow-2xl">
      {/* Red Header Bar */}
      <div className="px-4 py-3 bg-gradient-to-r from-red-950/70 via-slate-900 to-slate-950 border-b border-red-900/40 flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="p-1.5 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400">
            <Skull className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-sm font-bold text-red-200 tracking-wide">ATTACKER OPERATIONAL VIEW</span>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20">
                Red Agent: {currentStepData?.phase || 'RECON'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono">
              Scripted Adversary Model (CybORG B_line / Lateral Emulation)
            </p>
          </div>
        </div>

        {/* Quick red stats */}
        <div className="flex items-center space-x-4 text-xs font-mono">
          <div className="flex items-center space-x-1.5 text-slate-300">
            <Target className="w-3.5 h-3.5 text-red-400" />
            <span>Discovered: <strong className="text-red-300">{discoveredCount} / {nodes.length}</strong></span>
          </div>
          <div className="flex items-center space-x-1.5 text-slate-300">
            <Flame className="w-3.5 h-3.5 text-orange-400" />
            <span>Pwned: <strong className="text-orange-300">{pwnedCount}</strong></span>
          </div>
        </div>
      </div>

      <div className="p-3 space-y-3 flex-1 flex flex-col overflow-y-auto">
        {/* Attacker Mission Brief */}
        <div className="p-2.5 rounded-lg bg-red-950/20 border border-red-900/30 flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2">
            <Crosshair className="w-4 h-4 text-red-400 shrink-0" />
            <div>
              <span className="font-semibold text-red-300">Adversary Goal: </span>
              <span className="text-slate-300 font-mono">Infiltrate DMZ ➔ Lateral Move ➔ Exfiltrate Crown Jewel DB</span>
            </div>
          </div>
          {isTrapped && (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-purple-900/50 text-purple-300 border border-purple-600/40 animate-pulse">
              <AlertTriangle className="w-3 h-3 mr-1 text-purple-400" />
              DECEPTION ACTIVE (TRAPPED)
            </span>
          )}
        </div>

        {/* Perceived Network Map (Fog of War) */}
        <div className="flex-shrink-0 h-72 sm:h-80 w-full min-w-0">
          <div className="flex items-center justify-between mb-1.5 px-1">
            <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 mr-2" />
              Adversary Perception Map (Fog of War)
            </span>
            <span className="text-[11px] text-slate-400 font-mono">
              Hidden nodes concealed by topology
            </span>
          </div>
          <NetworkGraph
            nodes={nodes}
            edges={edges}
            perspective="red"
            selectedNode={selectedNode}
            onSelectNode={onSelectNode}
            activeTargetId={activeTargetId}
          />
        </div>

        {/* Adversary Command Terminal */}
        <div className="flex-1 flex flex-col min-h-[160px] bg-black/70 border border-slate-800 rounded-lg overflow-hidden font-mono text-xs">
          <div className="px-3 py-1.5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between text-slate-400 text-[11px]">
            <div className="flex items-center space-x-2">
              <TerminalIcon className="w-3.5 h-3.5 text-red-400" />
              <span>attacker@kali-offensive:~</span>
            </div>
            <div className="flex items-center space-x-1 text-red-400 text-[10px]">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping mr-1" />
              LIVE TELEMETRY
            </div>
          </div>

          <div ref={terminalRef} className="p-3 space-y-2 overflow-y-auto max-h-[180px] text-slate-300">
            {logHistory.map((log, i) => (
              <div key={i} className="leading-relaxed">
                <span className="text-red-400 select-none">$ </span>
                <span className="text-emerald-400">{log.cmd || log.action}</span>
                <div className="text-slate-400 pl-4 text-[11px] mt-0.5 border-l border-slate-800">
                  {log.output}
                </div>
              </div>
            ))}
            {currentStepData?.attackerAction && (
              <div className="leading-relaxed pt-1 border-t border-slate-800/80">
                <span className="text-red-400 select-none">$ </span>
                <span className="text-amber-300 font-semibold">{currentStepData.attackerAction.cmd}</span>
                <div className="text-slate-300 pl-4 text-[11px] mt-1 border-l-2 border-red-500/50">
                  {currentStepData.redLog}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Attacker Dwell Metric Banner */}
        <div className="p-2.5 bg-slate-900/60 rounded-lg border border-slate-800 flex items-center justify-between text-xs font-mono">
          <div className="flex items-center space-x-2 text-slate-400">
            <Clock className="w-4 h-4 text-purple-400" />
            <span>Time Wasted on Decoys:</span>
          </div>
          <span className="text-purple-300 font-bold text-sm bg-purple-950/40 px-2.5 py-0.5 rounded border border-purple-800/50">
            {dwellWasted} seconds
          </span>
        </div>
      </div>
    </div>
  );
}
