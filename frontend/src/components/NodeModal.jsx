import React from 'react';
import { X, Server, Shield, Activity, Cpu, Database, Network, Ghost } from 'lucide-react';

export default function NodeModal({ node, onClose, onActionClick }) {
  if (!node) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#0f172a] border border-slate-700 rounded-xl shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="px-5 py-3.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className={`p-2 rounded-lg ${node.isHoneypot ? 'bg-purple-500/20 text-purple-400' : 'bg-cyan-500/20 text-cyan-400'}`}>
              {node.isHoneypot ? <Ghost className="w-5 h-5" /> : <Server className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-bold text-slate-100 text-sm">{node.label}</h3>
                {node.isHoneypot && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-900/60 text-purple-300 border border-purple-500/40">
                    DECOY HONEYPOT
                  </span>
                )}
                {node.isCrownJewel && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-900/60 text-amber-300 border border-amber-500/40">
                    CROWN JEWEL
                  </span>
                )}
              </div>
              <p className="text-xs font-mono text-slate-400">{node.ip} • Subnet: {node.subnet}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 text-xs font-sans text-slate-300">
          {/* Status grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-2.5 rounded bg-slate-900/80 border border-slate-800">
              <span className="text-slate-400 text-[10px] uppercase font-mono block">OS & System</span>
              <span className="font-semibold text-slate-200 mt-0.5 block">{node.os}</span>
            </div>
            <div className="p-2.5 rounded bg-slate-900/80 border border-slate-800">
              <span className="text-slate-400 text-[10px] uppercase font-mono block">GNN Topological Risk</span>
              <div className="flex items-center space-x-2 mt-0.5">
                <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${node.gnnRisk > 0.7 ? 'bg-red-500' : (node.gnnRisk > 0.4 ? 'bg-amber-400' : 'bg-emerald-400')}`} 
                    style={{ width: `${node.gnnRisk * 100}%` }}
                  />
                </div>
                <span className="font-mono font-bold text-slate-200">{(node.gnnRisk * 100).toFixed(0)}%</span>
              </div>
            </div>
          </div>

          {/* Running Services */}
          <div>
            <span className="text-slate-400 text-[11px] font-semibold uppercase tracking-wider block mb-1.5">
              Listening Services / Ports
            </span>
            <div className="flex flex-wrap gap-1.5">
              {node.services?.map((svc, i) => (
                <span 
                  key={i} 
                  className="px-2 py-1 rounded bg-slate-800/80 text-cyan-300 font-mono text-[11px] border border-slate-700"
                >
                  {svc}
                </span>
              ))}
            </div>
          </div>

          {/* Deception Profile */}
          {node.isHoneypot ? (
            <div className="p-3 rounded bg-purple-950/20 border border-purple-900/40 space-y-1 font-mono text-[11px]">
              <span className="font-bold text-purple-300 block">Deception Specifications:</span>
              <p className="text-slate-300">Emulation Profile: <span className="text-purple-200">{node.honeypotType}</span></p>
              <p className="text-slate-300">Disguised As: <span className="text-amber-300 font-semibold">{node.disguiseAs}</span></p>
              <p className="text-slate-400 text-[10px] mt-1">CybORG telemetry actively logged; traps unauthorized lateral hops.</p>
            </div>
          ) : (
            <div className="p-3 rounded bg-slate-900/40 border border-slate-800 space-y-1 font-mono text-[11px]">
              <span className="font-bold text-slate-300 block">Host Health & State:</span>
              <p className="text-slate-300">
                Compromised Status: {node.compromised ? <span className="text-red-400 font-bold">YES (Active Breach)</span> : <span className="text-emerald-400">CLEAN</span>}
              </p>
              <p className="text-slate-300">
                Under Active Probe: {node.underAttack ? <span className="text-amber-400 font-bold">YES (Under Attack)</span> : <span className="text-slate-400">NO</span>}
              </p>
            </div>
          )}

          {/* PyTorch Geometric Embedding Vector Preview */}
          <div>
            <span className="text-slate-400 text-[10px] font-mono uppercase block mb-1">
              PyTorch Geometric (PyG) Latent Node Embedding Vector $h_v$:
            </span>
            <div className="p-2 rounded bg-black/60 font-mono text-[10px] text-cyan-400/90 break-all border border-slate-800">
              [{Array.from({ length: 8 }, (_, i) => ((Math.sin(node.gnnRisk * (i + 1)) * 0.8)).toFixed(4)).join(', ')}, ...]
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 bg-slate-900/80 border-t border-slate-800 flex justify-end space-x-2">
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition"
          >
            Close
          </button>
          {!node.isHoneypot && (
            <button
              onClick={() => {
                if (onActionClick) onActionClick(node);
                onClose();
              }}
              className="px-3.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium transition flex items-center space-x-1"
            >
              <Ghost className="w-3.5 h-3.5 mr-1" />
              <span>Deploy Honeypot Decoy Beside {node.label}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
