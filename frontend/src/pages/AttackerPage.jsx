import React, { useState, useRef, useEffect } from 'react';
import { useSimulation } from '../context/SimulationContext';
import NetworkGraph from '../components/NetworkGraph';
import { PREDEFINED_ATTACK_VECTORS } from '../mock/attackVectorsData';
import { 
  Flame, 
  Terminal as TerminalIcon, 
  Play, 
  Pause, 
  SkipForward, 
  RotateCcw, 
  ExternalLink, 
  ShieldCheck, 
  Target, 
  Globe, 
  Key, 
  FolderSearch, 
  Cpu, 
  AlertTriangle,
  RotateCw,
  Send,
  Radio,
  CheckCircle2,
  FileCode,
  Layers,
  ChevronRight
} from 'lucide-react';

// Strictly sanitize red team telemetry to prevent any deception/safety disclosure to attacker
const sanitizeAttackerOutput = (text) => {
  if (!text) return '';
  return text
    .replace(/\s*\(Crown Jewel Database.*safe.*?\)/gi, '')
    .replace(/\s*Crown Jewel.*safe!*/gi, '')
    .replace(/\s*Domain Controller.*safe\.*/gi, '')
    .replace(/\s*Core assets.*secure\.*/gi, '')
    .replace(/\s*Adversary quarantined in honeypot container!*/gi, 'Session established.')
    .trim();
};

export default function AttackerPage() {
  const {
    nodes,
    edges,
    selectedNode,
    selectNode,
    redLogs,
    activeVectorId,
    setActiveVectorId,
    isAttackExecuting,
    attackProgress,
    executeAttackVector,
    reset,
    updateNodePosition,
    resetNodeLayout,
  } = useSimulation();

  // Active Tab: 'launchpad' | 'architecture' | 'logs'
  const [activeTab, setActiveTab] = useState('launchpad');

  // Currently selected vector object
  const activeVector = PREDEFINED_ATTACK_VECTORS.find(v => v.id === activeVectorId) || PREDEFINED_ATTACK_VECTORS[0];

  // Editable parameters for active vector
  const [formParams, setFormParams] = useState(() => {
    const initial = {};
    activeVector.params.forEach(p => {
      initial[p.key] = p.value;
    });
    return initial;
  });

  // When vector changes, update form params
  useEffect(() => {
    const nextParams = {};
    activeVector.params.forEach(p => {
      nextParams[p.key] = p.value;
    });
    setFormParams(nextParams);
  }, [activeVectorId]);

  const terminalBottomRef = useRef(null);
  useEffect(() => {
    if (terminalBottomRef.current) {
      terminalBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [redLogs, isAttackExecuting, attackProgress]);

  const handleParamChange = (key, value) => {
    setFormParams(prev => ({ ...prev, [key]: value }));
  };

  const handleResetParams = () => {
    const resetValues = {};
    activeVector.params.forEach(p => {
      resetValues[p.key] = p.value;
    });
    setFormParams(resetValues);
  };

  const handleLaunchAttack = () => {
    executeAttackVector(activeVector.id, formParams);
  };

  const openDeceptionWindow = () => {
    window.open('/#/deception', 'DeceptionWindow', 'width=1100,height=800');
  };

  const getVectorIcon = (category) => {
    switch (category) {
      case 'Reconnaissance': return <Globe className="w-4 h-4 text-red-400" />;
      case 'Web Exploitation': return <FileCode className="w-4 h-4 text-red-400" />;
      case 'Credential Access': return <Key className="w-4 h-4 text-amber-400" />;
      case 'Discovery & Traversal': return <FolderSearch className="w-4 h-4 text-orange-400" />;
      case 'Execution': return <Cpu className="w-4 h-4 text-red-500" />;
      default: return <Flame className="w-4 h-4 text-red-400" />;
    }
  };

  const getSeverityBadgeClass = (severity) => {
    switch (severity) {
      case 'Critical': return 'bg-red-950/80 text-red-400 border border-red-800/80';
      case 'High': return 'bg-amber-950/80 text-amber-400 border border-amber-800/80';
      case 'Medium': return 'bg-yellow-950/80 text-yellow-300 border border-yellow-800/80';
      default: return 'bg-slate-800 text-slate-300';
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-[#070b14] text-slate-100 overflow-hidden font-sans">
      {/* Top Header Bar matching the uploaded screenshot */}
      <header className="px-5 py-2.5 bg-[#0a0f1d] border-b border-slate-800/90 flex flex-wrap items-center justify-between gap-3 shadow-md">
        {/* Brand */}
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-xl bg-red-600/20 border border-red-500/30 text-red-400 shadow-sm">
            <Flame className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-base font-extrabold text-white tracking-wider font-mono">
                ARES CYBER <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-red-950 text-red-400 border border-red-800">RED TEAM CONSOLE</span>
              </h1>
            </div>
            <p className="text-[11px] text-slate-400 font-mono">
              Attacker-Aware Deception Testbed // Attack Generation Unit
            </p>
          </div>
        </div>

        {/* Center Tab Buttons */}
        <div className="flex items-center space-x-1.5 bg-[#0e1628] p-1 rounded-xl border border-slate-800 text-xs font-mono">
          <button
            onClick={() => setActiveTab('launchpad')}
            className={`px-3 py-1.5 rounded-lg flex items-center space-x-1.5 transition font-semibold ${
              activeTab === 'launchpad' 
                ? 'bg-red-600 text-white shadow-lg shadow-red-950' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>Attack Launchpad</span>
          </button>

          <button
            onClick={() => setActiveTab('architecture')}
            className={`px-3 py-1.5 rounded-lg flex items-center space-x-1.5 transition font-semibold ${
              activeTab === 'architecture' 
                ? 'bg-red-600 text-white shadow-lg shadow-red-950' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Target Architecture</span>
          </button>

          <button
            onClick={() => setActiveTab('logs')}
            className={`px-3 py-1.5 rounded-lg flex items-center space-x-1.5 transition font-semibold ${
              activeTab === 'logs' 
                ? 'bg-red-600 text-white shadow-lg shadow-red-950' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <TerminalIcon className="w-3.5 h-3.5" />
            <span>Execution Logs</span>
          </button>

          <button
            onClick={openDeceptionWindow}
            className="px-3 py-1.5 rounded-lg text-cyan-400 hover:bg-cyan-950/50 flex items-center space-x-1.5 transition"
            title="Open Deception SOC Window"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Deception System</span>
            <ExternalLink className="w-3 h-3 ml-0.5 opacity-60" />
          </button>
        </div>

        {/* Right Status Badges */}
        <div className="flex items-center space-x-2 text-xs font-mono">
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-emerald-950/40 border border-emerald-800/40 text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>C2 LINK ACTIVE</span>
          </div>
          <div className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-400">
            {isAttackExecuting ? (
              <span className="text-amber-400 font-bold flex items-center">
                <RotateCw className="w-3 h-3 mr-1 animate-spin" /> EXECUTING
              </span>
            ) : (
              <span>STANDBY</span>
            )}
          </div>
        </div>
      </header>

      {/* Sub-Header Operational Telemetry Banner */}
      <div className="px-5 py-2 bg-[#090e1c] border-b border-slate-800/80 flex flex-wrap items-center justify-between text-[11px] font-mono text-slate-400">
        <div className="flex items-center space-x-6">
          <div>
            OPERATION: <strong className="text-red-400 font-semibold">RED-VIPER-SIMULATION</strong>
          </div>
          <div>
            TARGET: <strong className="text-red-300 font-semibold">{formParams.target_ip || activeVector.defaultTarget}</strong>
          </div>
          <div>
            VECTORS ARMED: <strong className="text-slate-200">{PREDEFINED_ATTACK_VECTORS.length} / {PREDEFINED_ATTACK_VECTORS.length}</strong>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <span className="text-cyan-400">EXPLOIT ENGINE: REALTIME WEBSOCKET</span>
          <button
            onClick={reset}
            className="text-slate-400 hover:text-white flex items-center space-x-1 transition"
            title="Reset simulation"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 p-4 overflow-hidden">
        {activeTab === 'launchpad' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-full overflow-hidden">
            {/* Left Column: Predefined Attack Vectors List (5 Cols) */}
            <div className="lg:col-span-5 flex flex-col h-full overflow-hidden">
              <div className="flex items-center justify-between mb-2 px-1">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center font-mono">
                  <Flame className="w-4 h-4 text-red-500 mr-1.5" />
                  PREDEFINED ATTACK VECTORS ({PREDEFINED_ATTACK_VECTORS.length})
                </span>
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">
                  CLICK TO SELECT
                </span>
              </div>

              {/* Cards List */}
              <div className="flex-1 space-y-2.5 overflow-y-auto pr-1">
                {PREDEFINED_ATTACK_VECTORS.map((vector) => {
                  const isSelected = activeVector.id === vector.id;

                  return (
                    <div
                      key={vector.id}
                      onClick={() => setActiveVectorId(vector.id)}
                      className={`p-3.5 rounded-xl cursor-pointer transition-all border ${
                        isSelected
                          ? 'bg-red-950/30 border-red-600/80 shadow-lg shadow-red-950/30 ring-1 ring-red-500/40'
                          : 'bg-[#0d1424] hover:bg-[#111a30] border-slate-800/80'
                      }`}
                    >
                      {/* Card Header */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300">
                            {vector.category}
                          </span>
                          <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${getSeverityBadgeClass(vector.severity)}`}>
                            {vector.severity}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-slate-400">
                          {vector.mitreId}
                        </span>
                      </div>

                      {/* Card Body */}
                      <div className="flex items-start space-x-3">
                        <div className={`p-2 rounded-lg mt-0.5 ${isSelected ? 'bg-red-500/20 text-red-400' : 'bg-slate-800 text-slate-400'}`}>
                          {getVectorIcon(vector.category)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-xs font-bold text-slate-100 truncate">
                            {vector.name}
                          </h4>
                          <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-relaxed font-sans">
                            {vector.description}
                          </p>
                        </div>
                      </div>

                      {/* Card Footer */}
                      <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono">
                        <span className="text-slate-400">5 execution phases</span>
                        <span className={`font-bold flex items-center ${isSelected ? 'text-red-400' : 'text-slate-400'}`}>
                          {isSelected ? 'ACTIVE SELECTION ➔' : 'CONFIGURE ➔'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Column: Vector Configuration + Terminal (7 Cols) */}
            <div className="lg:col-span-7 flex flex-col gap-3 h-full overflow-hidden">
              {/* Top Configuration Box */}
              <div className="p-4 rounded-xl bg-[#0d1424] border border-slate-800 shadow-xl flex flex-col">
                <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-800">
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-red-950/70 text-red-400 border border-red-800/60">
                      VECTOR CONFIGURATION
                    </span>
                    <span className="text-xs font-mono text-slate-300">
                      {activeVector.subHeader}
                    </span>
                  </div>
                  <button
                    onClick={handleResetParams}
                    className="text-[11px] font-mono text-slate-400 hover:text-white flex items-center space-x-1 transition"
                  >
                    <RotateCcw className="w-3 h-3 mr-1" />
                    <span>Reset</span>
                  </button>
                </div>

                <h3 className="text-sm font-bold text-white mb-3">
                  {activeVector.name}
                </h3>

                {/* Payload Parameters Form */}
                <div className="space-y-2 mb-3">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-red-400 flex items-center">
                    <Flame className="w-3 h-3 mr-1" /> PAYLOAD PARAMETERS
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
                    {activeVector.params.map((param) => (
                      <div key={param.key} className="space-y-1">
                        <label className="text-[10px] text-slate-400 uppercase">
                          {param.label}
                        </label>
                        {param.type === 'select' ? (
                          <select
                            value={formParams[param.key] || param.value}
                            onChange={(e) => handleParamChange(param.key, e.target.value)}
                            className="w-full bg-[#070b14] border border-slate-700/80 rounded-lg px-2.5 py-1 text-slate-200 text-xs focus:outline-none focus:border-red-500"
                          >
                            {param.options?.map(opt => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type="text"
                            value={formParams[param.key] ?? param.value}
                            onChange={(e) => handleParamChange(param.key, e.target.value)}
                            className="w-full bg-[#070b14] border border-slate-700/80 rounded-lg px-2.5 py-1 text-slate-200 text-xs focus:outline-none focus:border-red-500 font-mono"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Target Warning Callout */}
                <div className="p-2.5 rounded-lg bg-amber-950/20 border border-amber-900/40 text-[11px] font-mono text-amber-300 flex items-center space-x-2 mb-3">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>
                    Target: <strong className="text-white">{activeVector.targetLabel}</strong>. Payload will be dispatched through C2 WebSocket interface.
                  </span>
                </div>

                {/* Big Glowing Red Launch Button */}
                <button
                  onClick={handleLaunchAttack}
                  disabled={isAttackExecuting}
                  className={`w-full py-2.5 px-4 rounded-xl font-bold font-mono text-xs uppercase tracking-wider transition-all shadow-xl flex items-center justify-center space-x-2 ${
                    isAttackExecuting
                      ? 'bg-red-950 text-red-300 border border-red-800 cursor-not-allowed'
                      : 'bg-red-600 hover:bg-red-500 text-white shadow-red-900/40 transform hover:-translate-y-0.5'
                  }`}
                >
                  {isAttackExecuting ? (
                    <>
                      <RotateCw className="w-4 h-4 animate-spin text-red-400" />
                      <span>DISPATCHING PHASES ({attackProgress}%)...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 fill-white text-white" />
                      <span>▶ LAUNCH ATTACK VECTOR</span>
                    </>
                  )}
                </button>

                {/* Progress bar during execution */}
                {isAttackExecuting && (
                  <div className="w-full bg-slate-900 h-1.5 rounded-full mt-2 overflow-hidden border border-red-950">
                    <div 
                      className="bg-red-500 h-full transition-all duration-300"
                      style={{ width: `${attackProgress}%` }}
                    />
                  </div>
                )}
              </div>

              {/* Bottom Live Outbound Payload & Telemetry Terminal */}
              <div className="flex-1 flex flex-col bg-black/90 border border-slate-800 rounded-xl overflow-hidden shadow-2xl font-mono text-xs">
                {/* Terminal Header */}
                <div className="px-4 py-2 bg-[#090e1c] border-b border-slate-800 flex items-center justify-between text-slate-300 text-[11px]">
                  <div className="flex items-center space-x-2">
                    <TerminalIcon className="w-3.5 h-3.5 text-red-400" />
                    <span>&gt;_ LIVE OUTBOUND PAYLOAD &amp; TELEMETRY TERMINAL</span>
                  </div>
                  <div className="flex items-center space-x-2 text-[10px] text-cyan-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping mr-1" />
                    <span>STREAMING // WEBSOCKET</span>
                  </div>
                </div>

                {/* Script Command Line */}
                <div className="px-4 py-1.5 bg-[#050811] border-b border-slate-900 text-slate-400 text-[11px]">
                  <span className="text-red-400 select-none">c2@ares-redteam:~$ </span>
                  <span className="text-emerald-400 font-semibold">{activeVector.scriptName}</span>
                </div>

                {/* Live Console Output Body */}
                <div className="flex-1 p-4 space-y-2 overflow-y-auto max-h-[220px] text-slate-300 text-[11px]">
                  {redLogs.length === 0 && !isAttackExecuting ? (
                    <div className="text-slate-500 italic py-4 text-center">
                      Console initialized. Awaiting attack execution signal ...<br />
                      All outbound payloads and response telemetry will stream here in real-time.
                    </div>
                  ) : null}

                  {redLogs.map((log, i) => (
                    <div key={i} className="space-y-1 pb-2 border-b border-slate-900">
                      <div className="text-slate-400 flex items-center justify-between">
                        <span className="text-red-400">&gt; Executed: {log.vectorName || log.cmd}</span>
                        <span className="text-[10px] text-slate-500">{log.timestamp}</span>
                      </div>
                      {log.phases?.map((p, idx) => (
                        <div key={idx} className="text-slate-300 pl-3 border-l border-slate-800 text-[10.5px]">
                          {p}
                        </div>
                      ))}
                      <div className="text-emerald-400 pl-3 font-semibold mt-1">
                        ✔ {sanitizeAttackerOutput(log.output)}
                      </div>
                    </div>
                  ))}

                  {/* Active running phases indicator */}
                  {isAttackExecuting && (
                    <div className="space-y-1 pt-1 text-amber-300">
                      <div className="flex items-center space-x-1.5 text-amber-400">
                        <RotateCw className="w-3 h-3 animate-spin" />
                        <span>Dispatching payload packets to target...</span>
                      </div>
                      <div className="pl-4 text-slate-400 border-l border-amber-500/50">
                        {activeVector.executionPhases.slice(0, Math.ceil(attackProgress / 20)).map((p, idx) => (
                          <div key={idx} className="text-amber-200">
                            {p.text}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div ref={terminalBottomRef} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Target Architecture View (Network Graph) */}
        {activeTab === 'architecture' && (
          <div className="h-full flex flex-col gap-2 min-w-0">
            <div className="flex items-center justify-between px-1 shrink-0">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center font-mono">
                <Radio className="w-3.5 h-3.5 text-red-400 mr-1.5 animate-pulse" />
                Target Architecture Perception Map (Fog of War)
              </span>
              <span className="text-[11px] text-slate-400 font-mono">
                Adversary views only scanned &amp; breached topology
              </span>
            </div>
            <div className="flex-1 min-h-[300px] w-full min-w-0">
              <NetworkGraph
                nodes={nodes}
                edges={edges}
                perspective="red"
                selectedNode={selectedNode}
                onSelectNode={selectNode}
                onNodeDrag={updateNodePosition}
                onResetLayout={resetNodeLayout}
                activeTargetId={activeVector.targetNodeId}
              />
            </div>
          </div>
        )}

        {/* Tab 3: Execution Logs */}
        {activeTab === 'logs' && (
          <div className="h-full bg-[#0d1424] border border-slate-800 rounded-xl p-4 overflow-y-auto font-mono text-xs">
            <h3 className="text-sm font-bold text-white mb-3 flex items-center">
              <TerminalIcon className="w-4 h-4 mr-2 text-red-400" />
              Full Adversary Campaign Execution History
            </h3>
            {redLogs.length === 0 ? (
              <p className="text-slate-500 italic">No attack vectors launched yet in this session.</p>
            ) : (
              <div className="space-y-4">
                {redLogs.map((log, i) => (
                  <div key={i} className="p-3 rounded-lg bg-black/60 border border-slate-800 space-y-1.5">
                    <div className="flex justify-between text-red-400 font-bold">
                      <span>[{i + 1}] {log.vectorName || log.cmd}</span>
                      <span className="text-slate-500 font-normal">{log.timestamp}</span>
                    </div>
                    <div className="text-slate-300 pl-3 border-l border-slate-700">
                      {log.phases?.map((p, idx) => (
                        <div key={idx}>{p}</div>
                      ))}
                    </div>
                    <div className="text-emerald-400 pl-3">
                      Result: {sanitizeAttackerOutput(log.output)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
