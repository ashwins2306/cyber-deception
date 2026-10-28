import React from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  SkipForward, 
  ShieldAlert, 
  Split, 
  Eye, 
  Skull, 
  ShieldCheck, 
  Activity,
  Layers,
  BarChart2
} from 'lucide-react';

export default function Header({
  isPlaying,
  onTogglePlay,
  onStepForward,
  onReset,
  speed,
  onChangeSpeed,
  viewMode,
  onChangeViewMode,
  step,
  totalSteps,
  phase,
  isConnectedBackend = false
}) {
  return (
    <header className="bg-[#0b101d] border-b border-slate-800 px-5 py-3 flex flex-wrap items-center justify-between gap-3 shadow-lg select-none">
      {/* Brand & Project Identity */}
      <div className="flex items-center space-x-3">
        <div className="p-2 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-cyan-500/20 shadow-lg">
          <ShieldAlert className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-base font-bold tracking-tight text-white flex items-center">
              ACDS <span className="text-cyan-400 font-mono ml-1.5 text-xs font-normal">v1.0</span>
            </h1>
            <span className="hidden sm:inline-block px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-950 text-cyan-300 border border-cyan-800">
              GNN + PPO Cyber Deception
            </span>
            <span className="hidden sm:inline-block px-2 py-0.5 rounded text-[10px] font-mono bg-purple-950 text-purple-300 border border-purple-800">
              CybORG Range
            </span>
          </div>
          <p className="text-[11px] text-slate-400">
            Responsive Cyber Deception Framework with Dual-Perspective Visualization
          </p>
        </div>
      </div>

      {/* Playback & Step Controls */}
      <div className="flex items-center space-x-2 bg-slate-900/90 border border-slate-800 px-3 py-1.5 rounded-xl">
        <button
          onClick={onTogglePlay}
          className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition ${
            isPlaying 
              ? 'bg-amber-500 hover:bg-amber-600 text-black' 
              : 'bg-emerald-500 hover:bg-emerald-600 text-black'
          }`}
          title={isPlaying ? 'Pause Simulation' : 'Play Autonomous Simulation'}
        >
          {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          <span>{isPlaying ? 'Pause' : 'Play'}</span>
        </button>

        <button
          onClick={onStepForward}
          disabled={isPlaying}
          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 disabled:opacity-40 disabled:hover:bg-slate-800 transition"
          title="Step One Tick Forward"
        >
          <SkipForward className="w-4 h-4" />
        </button>

        <button
          onClick={onReset}
          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
          title="Reset Simulation Episode"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        {/* Speed Selector */}
        <div className="flex items-center space-x-1 pl-2 border-l border-slate-800 text-[11px] font-mono text-slate-400">
          {[1, 2, 4].map(s => (
            <button
              key={s}
              onClick={() => onChangeSpeed(s)}
              className={`px-1.5 py-0.5 rounded ${speed === s ? 'bg-cyan-500 text-black font-bold' : 'hover:bg-slate-800 text-slate-300'}`}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>

      {/* Perspective / View Mode Switcher */}
      <div className="flex items-center space-x-1 bg-slate-900/90 border border-slate-800 p-1 rounded-xl text-xs font-medium">
        <button
          onClick={() => onChangeViewMode('split')}
          className={`px-2.5 py-1 rounded-lg flex items-center space-x-1.5 transition ${
            viewMode === 'split' ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
          }`}
          title="Side-by-side Dual View"
        >
          <Split className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Dual View</span>
        </button>

        <button
          onClick={() => onChangeViewMode('blue')}
          className={`px-2.5 py-1 rounded-lg flex items-center space-x-1.5 transition ${
            viewMode === 'blue' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
          }`}
          title="Defender / Deception Focus"
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Deception (Blue)</span>
        </button>

        <button
          onClick={() => onChangeViewMode('red')}
          className={`px-2.5 py-1 rounded-lg flex items-center space-x-1.5 transition ${
            viewMode === 'red' ? 'bg-red-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
          }`}
          title="Attacker Perspective Focus"
        >
          <Skull className="w-3.5 h-3.5" />
          <span>Attacker (Red)</span>
        </button>

        <button
          onClick={() => onChangeViewMode('analytics')}
          className={`px-2.5 py-1 rounded-lg flex items-center space-x-1.5 transition ${
            viewMode === 'analytics' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
          }`}
          title="Full Analytics"
        >
          <BarChart2 className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Analytics</span>
        </button>
      </div>
    </header>
  );
}
