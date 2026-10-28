import React, { useState } from 'react';
import { useSimulation } from '../context/SimulationContext';
import NetworkGraph from '../components/NetworkGraph';
import AnalyticsPanel from '../components/AnalyticsPanel';
import StepActionLedger from '../components/StepActionLedger';
import NodeModal from '../components/NodeModal';
import { DECEPTION_ACTIONS } from '../mock/simulationData';
import { 
  ShieldCheck, 
  Play, 
  Pause, 
  SkipForward, 
  RotateCcw, 
  ExternalLink, 
  Skull, 
  BrainCircuit, 
  Zap, 
  Ghost, 
  TrendingUp, 
  Sparkles,
  Layers,
  Activity
} from 'lucide-react';

export default function DeceptionPage() {
  const [rightViewMode, setRightViewMode] = useState('ledger'); // 'ledger' | 'analytics'
  const {
    currentStepIndex,
    totalSteps,
    currentStepData,
    isPlaying,
    speed,
    setSpeed,
    nodes,
    edges,
    stepHistory,
    selectedNode,
    isBackendConnected,
    stepForward,
    reset,
    togglePlay,
    changeSpeed,
    manualDeception,
    selectNode,
    updateNodePosition,
    resetNodeLayout,
  } = useSimulation();

  const ppo = currentStepData?.ppoAction;
  const activeDecoys = (nodes || []).filter(n => n.isHoneypot);
  const totalDecoys = activeDecoys.length;
  const cumulativeReward = currentStepData?.metrics?.cumulativeReward || 0;
  const stepReward = currentStepData?.metrics?.stepReward || 0;

  const openAttackerWindow = () => {
    window.open('/#/attacker', 'AttackerWindow', 'width=1100,height=800');
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-[#070b14] text-slate-100 overflow-hidden font-sans">
      {/* Top Blue Defender Header */}
      <header className="px-5 py-3 bg-[#08101e] border-b border-cyan-950/80 flex flex-wrap items-center justify-between gap-3 shadow-2xl">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 shadow-lg shadow-cyan-950">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-base font-bold text-cyan-100 tracking-wide font-mono">
                BLUE TEAM // RESPONSIVE DECEPTION SOC
              </h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-950 text-cyan-300 border border-cyan-800">
                GNN + PPO Policy Engine
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 flex items-center">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5 animate-ping" />
                SYNCED TO ATTACKER
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono">
              Topology-Aware Cyber Deception Framework • CybORG Environment
            </p>
          </div>
        </div>

        {/* Global Playback & Step Controls */}
        <div className="flex items-center space-x-2 bg-slate-900/90 border border-cyan-950 px-3 py-1.5 rounded-xl">
          <button
            onClick={togglePlay}
            className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition ${
              isPlaying 
                ? 'bg-amber-500 hover:bg-amber-600 text-black' 
                : 'bg-emerald-500 hover:bg-emerald-600 text-black'
            }`}
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isPlaying ? 'Pause' : 'Play'}</span>
          </button>

          <button
            onClick={stepForward}
            disabled={isPlaying}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 disabled:opacity-40 transition"
            title="Step simulation forward"
          >
            <SkipForward className="w-4 h-4" />
          </button>

          <button
            onClick={reset}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
            title="Reset episode"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <div className="flex items-center space-x-1 pl-2 border-l border-slate-800 text-[11px] font-mono text-slate-400">
            {[1, 2, 4].map(s => (
              <button
                key={s}
                onClick={() => setSpeed(s)}
                className={`px-1.5 py-0.5 rounded transition ${
                  speed === s
                    ? 'bg-cyan-950 text-cyan-400 font-bold border border-cyan-800/60'
                    : 'hover:text-slate-200'
                }`}
                title={`Playback Speed ${s}x`}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>

        {/* Backend Connection Status Badge & Attacker Action Link */}
        <div className="flex items-center space-x-2">
          {isBackendConnected ? (
            <span className="hidden lg:flex px-2.5 py-1 rounded-lg bg-emerald-950/70 border border-emerald-800/80 text-emerald-400 text-xs font-mono items-center space-x-1.5 shadow">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>GNN+PPO BACKEND: LIVE</span>
            </span>
          ) : (
            <span className="hidden lg:flex px-2.5 py-1 rounded-lg bg-amber-950/70 border border-amber-800/80 text-amber-400 text-xs font-mono items-center space-x-1.5 shadow">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span>BACKEND OFFLINE</span>
            </span>
          )}

          <button
            onClick={openAttackerWindow}
            className="px-3 py-1.5 rounded-lg bg-red-950/80 hover:bg-red-900 text-red-300 border border-red-800/60 text-xs font-medium flex items-center space-x-1.5 transition shadow"
            title="Open Attacker View in a companion window"
          >
            <Skull className="w-4 h-4 text-red-400" />
            <span>Open Attacker Window</span>
            <ExternalLink className="w-3.5 h-3.5 ml-0.5 opacity-70" />
          </button>
        </div>
      </header>

      {/* Main Deception Workspace */}
      <main className="flex-1 p-3 sm:p-4 grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4 overflow-hidden min-w-0">
        {/* Left Column: Ground-Truth Topology & Deception Action Palette (7 Cols) */}
        <div className="lg:col-span-7 flex flex-col gap-3 h-full overflow-hidden min-w-0">
          {/* Ground Truth Header */}
          <div className="flex items-center justify-between px-1 shrink-0">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center font-mono truncate">
              <span className="w-2 h-2 rounded-full bg-cyan-400 mr-2 animate-pulse shrink-0" />
              Ground Truth Network Graph & GNN Heatmap
            </span>
            <span className="text-[11px] text-purple-300 font-mono flex items-center shrink-0">
              <Ghost className="w-3.5 h-3.5 mr-1" />
              Active Decoy Honeypots: {totalDecoys}
            </span>
          </div>

          {/* Graph Canvas */}
          <div className="flex-1 min-h-[300px] w-full min-w-0">
            <NetworkGraph
              nodes={nodes}
              edges={edges}
              perspective="blue"
              selectedNode={selectedNode}
              onSelectNode={selectNode}
              onNodeDrag={updateNodePosition}
              onResetLayout={resetNodeLayout}
              activeTargetId={ppo?.target || nodes.find(n => n.underAttack)?.id}
            />
          </div>

          {/* Deception Action Palette */}
          <div className="p-2.5 sm:p-3 bg-slate-900/60 rounded-xl border border-slate-800 shrink-0">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-300 flex items-center font-mono">
                <Ghost className="w-3.5 h-3.5 mr-1.5 text-purple-400" />
                CybORG Deception Action Repertoire
              </span>
              <span className="text-[10px] text-slate-400 font-mono">Manual trigger override</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {DECEPTION_ACTIONS.slice(0, 6).map(action => (
                <button
                  key={action.id}
                  onClick={() => manualDeception(action)}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-700/60 hover:border-cyan-500/50 transition text-left group"
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

        {/* Right Column: AI Brain (GNN & PPO telemetry) & Live Recharts (5 Cols) */}
        <div className="lg:col-span-5 flex flex-col gap-3 h-full overflow-y-auto min-w-0 pr-1">

          {/* AI Intelligence Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* GNN Representation Card */}
            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-cyan-300 flex items-center font-mono">
                  <BrainCircuit className="w-4 h-4 mr-1.5 text-cyan-400" />
                  GNN Encoder
                </span>
                <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
                  PyG GATConv
                </span>
              </div>
              <div className="text-[11px] font-mono text-slate-300 space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-400">Embedding Dim:</span>
                  <span className="text-cyan-400">16 dimensions</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Max Topology Risk:</span>
                  <span className="text-amber-400 font-bold">
                    {(nodes && nodes.length > 0) ? Math.max(...nodes.map(n => n.gnnRisk || 0)).toFixed(2) : '0.85'}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 pt-1.5 border-t border-slate-800 leading-tight">
                  {currentStepData?.blueLog}
                </p>
              </div>
            </div>

            {/* PPO Agent Card */}
            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-cyan-900/40 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-emerald-300 flex items-center font-mono">
                  <Zap className="w-4 h-4 mr-1.5 text-emerald-400" />
                  PPO Policy Action
                </span>
                <span className="text-[10px] font-mono text-emerald-300 bg-emerald-950/60 border border-emerald-800/40 px-1.5 py-0.5 rounded">
                  Reward: +{stepReward.toFixed(1)}
                </span>
              </div>

              {ppo ? (
                <div className="space-y-1.5 text-xs font-mono">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-[11px]">Action:</span>
                    <span className="px-2 py-0.5 rounded bg-cyan-950/90 text-cyan-300 border border-cyan-800/40 font-bold text-[10px]">
                      {ppo.type}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Target Asset:</span>
                    <span className="text-slate-200">{ppo.target}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Confidence:</span>
                    <span className="text-emerald-400 font-bold">{((ppo.confidence || 0.85) * 100).toFixed(0)}%</span>
                  </div>
                  <p className="text-[10px] text-slate-300 pt-1 border-t border-slate-800 italic">
                    "{ppo.reasoning}"
                  </p>
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">Waiting for initial step...</p>
              )}
            </div>
          </div>

          {/* View Mode Toggle: Step Action Audit Frame vs Telemetry Analytics */}
          <div className="flex items-center space-x-1.5 p-1 bg-slate-900/90 rounded-xl border border-slate-800 shrink-0">
            <button
              onClick={() => setRightViewMode('ledger')}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-mono font-medium flex items-center justify-center space-x-2 transition ${
                rightViewMode === 'ledger'
                  ? 'bg-cyan-500 text-black font-bold shadow'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Step Action Audit Frame</span>
            </button>

            <button
              onClick={() => setRightViewMode('analytics')}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-mono font-medium flex items-center justify-center space-x-2 transition ${
                rightViewMode === 'analytics'
                  ? 'bg-cyan-500 text-black font-bold shadow'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Live Recharts Telemetry</span>
            </button>
          </div>

          {/* Conditional Content Area */}
          <div className="flex-1 min-h-[480px] flex flex-col min-w-0">
            {rightViewMode === 'ledger' ? (
              <StepActionLedger
                currentStepIndex={currentStepIndex}
                stepHistory={stepHistory}
              />
            ) : (
              <AnalyticsPanel
                stepHistory={stepHistory}
                currentMetrics={currentStepData?.metrics}
              />
            )}
          </div>
        </div>
      </main>

      {/* Node Inspector Modal */}
      {selectedNode && (
        <NodeModal
          node={selectedNode}
          onClose={() => selectNode(null)}
          onActionClick={(targetNode) => manualDeception({ label: `Decoy-${targetNode.label}`, targetNode })}
        />
      )}
    </div>
  );
}
