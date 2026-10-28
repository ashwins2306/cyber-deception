import React from 'react';
import { 
  Skull, 
  ShieldCheck, 
  ExternalLink, 
  Split, 
  Layers, 
  Sparkles, 
  BrainCircuit, 
  Zap, 
  ShieldAlert,
  ArrowRight
} from 'lucide-react';

export default function PortalPage({ onNavigate }) {
  const launchAttackerWindow = () => {
    window.open('/#/attacker', 'AttackerWindow', 'width=1100,height=800');
  };

  const launchDeceptionWindow = () => {
    window.open('/#/deception', 'DeceptionWindow', 'width=1100,height=800');
  };

  const launchBothSideBySide = () => {
    const width = Math.floor(window.screen.availWidth / 2);
    const height = window.screen.availHeight;

    window.open(
      '/#/attacker',
      'AttackerWindow',
      `left=0,top=0,width=${width},height=${height}`
    );

    window.open(
      '/#/deception',
      'DeceptionWindow',
      `left=${width},top=0,width=${width},height=${height}`
    );
  };

  return (
    <div className="min-h-screen w-screen bg-[#060913] text-slate-100 flex flex-col justify-between p-6 sm:p-10 font-sans">
      {/* Top Banner */}
      <div className="max-w-6xl w-full mx-auto flex items-center justify-between border-b border-slate-800/80 pb-6">
        <div className="flex items-center space-x-3.5">
          <div className="p-3 rounded-2xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-purple-600 text-white shadow-xl shadow-cyan-500/10">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center">
              Adaptive Cyber Deception System <span className="text-cyan-400 font-mono text-sm ml-2">ACDS</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 font-mono mt-0.5">
              CybORG Cyber Range • PyG Graph Neural Networks • PPO Reinforcement Learning
            </p>
          </div>
        </div>

        {/* Sync Status Badge */}
        <div className="hidden sm:flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs font-mono text-slate-300">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Cross-Window Realtime Sync Active</span>
        </div>
      </div>

      {/* Main Launcher Section */}
      <div className="max-w-6xl w-full mx-auto my-auto py-8">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Independent Operational Webpages
          </h2>
          <p className="text-sm text-slate-400 mt-2">
            The Attacker and Deception Defender operate in completely isolated webpages that communicate in real-time. You can launch them in separate browser windows or monitor displays.
          </p>

          {/* Quick Dual Launch Button */}
          <div className="mt-5">
            <button
              onClick={launchBothSideBySide}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-red-600 via-purple-600 to-cyan-500 hover:from-red-500 hover:to-cyan-400 text-white font-bold text-sm shadow-xl shadow-purple-950/40 transition-all transform hover:-translate-y-0.5 flex items-center space-x-2.5 mx-auto"
            >
              <Split className="w-4 h-4" />
              <span>Launch Both Webpages Side-by-Side (Dual Windows)</span>
              <ExternalLink className="w-4 h-4 ml-1 opacity-80" />
            </button>
          </div>
        </div>

        {/* Dual Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Card 1: Attacker Webpage */}
          <div className="relative group rounded-2xl bg-gradient-to-b from-red-950/30 to-slate-900/60 border border-red-900/40 p-6 sm:p-8 hover:border-red-500/60 transition-all shadow-2xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-xl bg-red-500/20 text-red-400 border border-red-500/30">
                  <Skull className="w-6 h-6" />
                </div>
                <span className="px-2.5 py-1 rounded text-xs font-mono font-bold bg-red-950 text-red-300 border border-red-800">
                  PAGE 1: OFFENSIVE
                </span>
              </div>

              <h3 className="text-xl font-bold text-red-100 group-hover:text-red-300 transition">
                Attacker Operations Webpage
              </h3>
              <p className="text-xs text-slate-400 font-mono mt-1 mb-4">
                Target URL: <code className="text-red-300">http://localhost:3000/#/attacker</code>
              </p>

              <ul className="space-y-2.5 text-xs text-slate-300">
                <li className="flex items-start">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 mr-2 shrink-0" />
                  <span><strong>Fog-of-War Perception Map:</strong> Adversary sees only scanned nodes.</span>
                </li>
                <li className="flex items-start">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 mr-2 shrink-0" />
                  <span><strong>Disguised Decoys:</strong> Honeypots appear as real corporate backup servers.</span>
                </li>
                <li className="flex items-start">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 mr-2 shrink-0" />
                  <span><strong>Live Adversary Terminal:</strong> Real-time streaming command execution.</span>
                </li>
                <li className="flex items-start">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 mr-2 shrink-0" />
                  <span><strong>Wasted Dwell Time Tracker:</strong> Measures attacker compute trapped in decoys.</span>
                </li>
              </ul>
            </div>

            <div className="mt-8 pt-4 border-t border-slate-800/80 flex items-center space-x-3">
              <button
                onClick={() => onNavigate('attacker')}
                className="flex-1 py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold text-xs transition flex items-center justify-center space-x-1.5"
              >
                <span>Navigate in this Tab</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={launchAttackerWindow}
                className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-red-300 border border-red-900/40 text-xs font-semibold transition flex items-center space-x-1.5"
                title="Open in a new popup window"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>New Window</span>
              </button>
            </div>
          </div>

          {/* Card 2: Deception SOC Webpage */}
          <div className="relative group rounded-2xl bg-gradient-to-b from-cyan-950/30 to-slate-900/60 border border-cyan-900/40 p-6 sm:p-8 hover:border-cyan-500/60 transition-all shadow-2xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <span className="px-2.5 py-1 rounded text-xs font-mono font-bold bg-cyan-950 text-cyan-300 border border-cyan-800">
                  PAGE 2: DEFENSIVE
                </span>
              </div>

              <h3 className="text-xl font-bold text-cyan-100 group-hover:text-cyan-300 transition">
                Deception SOC Webpage
              </h3>
              <p className="text-xs text-slate-400 font-mono mt-1 mb-4">
                Target URL: <code className="text-cyan-300">http://localhost:3000/#/deception</code>
              </p>

              <ul className="space-y-2.5 text-xs text-slate-300">
                <li className="flex items-start">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-1.5 mr-2 shrink-0" />
                  <span><strong>Ground-Truth Topology:</strong> Full network visibility + GNN risk heatmap.</span>
                </li>
                <li className="flex items-start">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-1.5 mr-2 shrink-0" />
                  <span><strong>PPO Policy Engine:</strong> Autonomous deception decisions with confidence % & reward.</span>
                </li>
                <li className="flex items-start">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-1.5 mr-2 shrink-0" />
                  <span><strong>Active Decoy Badges:</strong> Clear indicators on purple honeypot nodes.</span>
                </li>
                <li className="flex items-start">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-1.5 mr-2 shrink-0" />
                  <span><strong>Interactive Recharts:</strong> Replaces Matplotlib with live reward curves.</span>
                </li>
              </ul>
            </div>

            <div className="mt-8 pt-4 border-t border-slate-800/80 flex items-center space-x-3">
              <button
                onClick={() => onNavigate('deception')}
                className="flex-1 py-2.5 px-4 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs transition flex items-center justify-center space-x-1.5"
              >
                <span>Navigate in this Tab</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={launchDeceptionWindow}
                className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-900/40 text-xs font-semibold transition flex items-center space-x-1.5"
                title="Open in a new popup window"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>New Window</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="max-w-6xl w-full mx-auto text-center border-t border-slate-800/80 pt-4 text-xs text-slate-500 font-mono">
        Adaptive Cyber Deception System (ACDS) • Built with CybORG, PyG, PPO & React
      </footer>
    </div>
  );
}
