import React from 'react';
import { 
  ShieldCheck, 
  Cpu, 
  BrainCircuit, 
  Layers, 
  Ghost, 
  Activity, 
  RotateCcw, 
  Sparkles,
  Zap,
  CheckCircle,
  TrendingUp
} from 'lucide-react';
import NetworkGraph from './NetworkGraph';
import { DECEPTION_ACTIONS } from '../mock/simulationData';

export default function DeceptionView({
  nodes,
  edges,
  selectedNode,
  onSelectNode,
  currentStepData,
  onManualDeception,
}) {
  const ppo = currentStepData?.ppoAction;
  const activeDecoys = nodes.filter(n => n.isHoneypot);
  const totalDecoys = activeDecoys.length;
  const cumulativeReward = currentStepData?.metrics?.cumulativeReward || 0;
  const stepReward = currentStepData?.metrics?.stepReward || 0;

  return (
    <div className="flex flex-col h-full bg-[#0b0f19] border border-cyan-950/60 rounded-xl overflow-hidden shadow-2xl">
      {/* Blue Header Bar */}
      <div className="px-4 py-3 bg-gradient-to-r from-cyan-950/70 via-slate-900 to-slate-950 border-b border-cyan-900/40 flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="p-1.5 rounded-lg bg-cyan-500/20 border border-cyan-500/30 text-cyan-400">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-sm font-bold text-cyan-200 tracking-wide">RESPONSIVE DECEPTION DEFENDER</span>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                GNN + PPO Policy
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono">
              Topology-Aware Dynamic Deception Framework (PyTorch Geometric + SB3)
            </p>
          </div>
        </div>

        {/* Quick blue metrics */}
        <div className="flex items-center space-x-4 text-xs font-mono">
          <div className="flex items-center space-x-1.5 text-slate-300">
            <Ghost className="w-3.5 h-3.5 text-purple-400" />
            <span>Active Decoys: <strong className="text-purple-300">{totalDecoys}</strong></span>
          </div>
          <div className="flex items-center space-x-1.5 text-slate-300">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            <span>PPO Reward: <strong className="text-emerald-300">+{cumulativeReward.toFixed(1)}</strong></span>
          </div>
        </div>
      </div>

      <div className="p-3 space-y-3 flex-1 flex flex-col overflow-y-auto">
        {/* Ground Truth Interactive Topology */}
        <div className="flex-shrink-0 h-72 sm:h-80 w-full min-w-0">
          <div className="flex items-center justify-between mb-1.5 px-1">
            <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mr-2" />
              Ground Truth Topology & GNN Attention Heatmap
            </span>
            <span className="text-[11px] text-purple-300 font-mono flex items-center">
              <Sparkles className="w-3 h-3 mr-1" />
              Purple nodes = Active Deception Honeypots
            </span>
          </div>
          <NetworkGraph
            nodes={nodes}
            edges={edges}
            perspective="blue"
            selectedNode={selectedNode}
            onSelectNode={onSelectNode}
            activeTargetId={ppo?.target}
          />
        </div>

        {/* PPO Agent & GNN Real-Time Intelligence Box */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* GNN Representation Status */}
          <div className="p-3 rounded-lg bg-slate-900/70 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-cyan-300 flex items-center">
                <BrainCircuit className="w-4 h-4 mr-1.5 text-cyan-400" />
                GNN Topology Encoder
              </span>
              <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
                PyG 2-layer GAT
              </span>
            </div>
            <div className="text-[11px] font-mono text-slate-300 space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-400">Node Embedding Dim:</span>
                <span className="text-cyan-400">16 dimensions</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Max Topological Risk:</span>
                <span className="text-amber-400 font-bold">
                  {Math.max(...nodes.map(n => n.gnnRisk)).toFixed(2)}
                </span>
              </div>
              <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-800">
                {currentStepData?.blueLog || 'GNN analyzing graph adjacency matrix...'}
              </div>
            </div>
          </div>

          {/* PPO Autonomous Decision Box */}
          <div className="p-3 rounded-lg bg-slate-900/70 border border-cyan-900/40 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-emerald-300 flex items-center">
                <Zap className="w-4 h-4 mr-1.5 text-emerald-400" />
                Latest PPO Action
              </span>
              {ppo && (
                <span className="text-[10px] font-mono text-emerald-300 bg-emerald-950/60 border border-emerald-800/40 px-1.5 py-0.5 rounded">
                  Reward: +{stepReward.toFixed(1)}
                </span>
              )}
            </div>

            {ppo ? (
              <div className="space-y-1.5 text-xs font-mono">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Action:</span>
                  <span className="px-2 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-800/40 font-bold text-[11px]">
                    {ppo.type}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">Target Asset:</span>
                  <span className="text-slate-200">{ppo.target}</span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">Policy Confidence:</span>
                  <div className="flex items-center space-x-1.5">
                    <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-emerald-400" 
                        style={{ width: `${(ppo.confidence || 0.85) * 100}%` }}
                      />
                    </div>
                    <span className="text-emerald-400">{((ppo.confidence || 0.85) * 100).toFixed(0)}%</span>
                  </div>
                </div>
                <p className="text-[10px] text-slate-300 pt-1 border-t border-slate-800 italic">
                  "{ppo.reasoning}"
                </p>
              </div>
            ) : (
              <p className="text-xs font-mono text-slate-400 italic">Waiting for initial step...</p>
            )}
          </div>
        </div>

        {/* Deception Action Palette (Manual override or Autonomous test) */}
        <div className="p-2.5 rounded-lg bg-slate-900/50 border border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-300 flex items-center">
              <Ghost className="w-3.5 h-3.5 mr-1.5 text-purple-400" />
              Deception Action Repertoire (CybORG Primitives)
            </span>
            <span className="text-[10px] text-slate-400 font-mono">Click to test manual intervention</span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {DECEPTION_ACTIONS.map(action => (
              <button
                key={action.id}
                onClick={() => onManualDeception && onManualDeception(action)}
                className="px-2 py-1.5 rounded bg-slate-800/70 hover:bg-slate-700/80 border border-slate-700/60 hover:border-cyan-500/50 transition-all text-left group"
              >
                <div className="text-[11px] font-medium text-slate-200 group-hover:text-cyan-300 truncate">
                  {action.label}
                </div>
                <div className="text-[9px] font-mono text-slate-400 flex justify-between mt-0.5">
                  <span className="uppercase text-purple-400">{action.type}</span>
                  <span>Cost: -{action.cost}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
