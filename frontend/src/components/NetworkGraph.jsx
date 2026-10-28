import React, { useState, useRef, useCallback } from 'react';
import { 
  Server, 
  Database, 
  Laptop, 
  Network, 
  Lock, 
  Ghost,
  Skull,
  HelpCircle,
  ArrowRight,
  Move,
  RotateCcw
} from 'lucide-react';

export default function NetworkGraph({ 
  nodes, 
  edges, 
  perspective = 'blue', // 'blue' | 'red'
  selectedNode, 
  onSelectNode,
  onNodeDrag,
  onResetLayout,
  activeTargetId = null,
  className = ''
}) {
  const isRed = perspective === 'red';
  const [hoveredNode, setHoveredNode] = useState(null);
  const [showHelper, setShowHelper] = useState(true);

  // SVG ref for pixel-perfect coordinate mapping
  const svgRef = useRef(null);
  
  // Drag state: { id, startMouseX, startMouseY, origNodeX, origNodeY, hasMoved }
  const [dragState, setDragState] = useState(null);

  // Subnet grouping boxes with beginner-friendly labels
  const subnets = [
    { 
      name: 'ZONE 1: DMZ PERIMETER', 
      desc: 'Public Facing (Internet Accessible)',
      x: 25, y: 45, width: 220, height: 320, 
      color: '#38bdf8',
      stepNum: '1'
    },
    { 
      name: 'ZONE 2: CORPORATE LAN', 
      desc: 'Internal Company Network',
      x: 275, y: 35, width: 235, height: 340, 
      color: '#818cf8',
      stepNum: '2'
    },
    { 
      name: 'ZONE 3: RESTRICTED CORE', 
      desc: 'Critical High-Security Data Center',
      x: 540, y: 55, width: 225, height: 300, 
      color: '#f43f5e',
      stepNum: '3'
    },
  ];

  // Map screen pixel coordinate to SVG viewBox coordinate using SVGMatrix
  const getSVGCoords = useCallback((e) => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const svg = svgRef.current;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    const svgP = pt.matrixTransform(ctm.inverse());
    return { x: svgP.x, y: svgP.y };
  }, []);

  // Mouse Down on a Node: Start Dragging
  const handleNodeMouseDown = (e, node) => {
    // Only drag with primary mouse button
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();

    const pt = getSVGCoords(e);
    setDragState({
      id: node.id,
      startMouseX: pt.x,
      startMouseY: pt.y,
      origNodeX: node.x,
      origNodeY: node.y,
      hasMoved: false,
    });
  };

  // Mouse Move over SVG: Reposition Node dynamically
  const handleSVGMouseMove = (e) => {
    if (!dragState) return;

    const pt = getSVGCoords(e);
    const dx = pt.x - dragState.startMouseX;
    const dy = pt.y - dragState.startMouseY;

    if (Math.hypot(dx, dy) > 4) {
      dragState.hasMoved = true;
    }

    // Keep node safely within the canvas bounds
    const newX = Math.round(Math.max(25, Math.min(765, dragState.origNodeX + dx)));
    const newY = Math.round(Math.max(25, Math.min(375, dragState.origNodeY + dy)));

    if (onNodeDrag) {
      onNodeDrag(dragState.id, newX, newY);
    }
  };

  // Mouse Up over SVG: Finish Drag or Trigger Click Modal
  const handleSVGMouseUp = () => {
    if (dragState) {
      if (!dragState.hasMoved) {
        // User clicked without dragging -> Open node details modal
        const clicked = nodes.find(n => n.id === dragState.id);
        if (clicked && onSelectNode) {
          onSelectNode(clicked);
        }
      }
      setDragState(null);
    }
  };

  const getNodeStory = (node) => {
    if (node.isCrownJewel) {
      return {
        role: 'Crown-Jewel Vault (Real Production Data)',
        explanation: 'The adversary’s ultimate target. Contains confidential records. Must remain 100% secure.',
        status: node.compromised ? 'BREACHED' : 'SECURE & PROTECTED'
      };
    }
    if (node.isHoneypot) {
      if (isRed) {
        return {
          role: node.disguiseAs || 'Internal Corporate Server',
          explanation: `Discovered network asset running ${node.services?.join(', ') || 'network services'}.`,
          status: node.compromised ? 'ROOT ACCESS GAINED' : (node.underAttack ? 'TARGET PROBED' : 'ONLINE')
        };
      }
      return {
        role: 'Responsive Honeypot Trap (Fake Asset)',
        explanation: 'A deceptive decoy emulating real servers. Traps the adversary and wastes their compute.',
        status: node.compromised ? 'ADVERSARY TRAPPED HERE' : 'ARMED & MONITORING'
      };
    }
    if (node.id === 'web-public') {
      return {
        role: 'Public Web Application (Entry Point)',
        explanation: 'Customer-facing portal. Vulnerable to web exploits like SQL injection.',
        status: node.compromised ? 'COMPROMISED FOOTHOLD' : 'NORMAL'
      };
    }
    if (node.id === 'active-directory') {
      return {
        role: 'Domain Controller (Identity & Access)',
        explanation: 'Manages user logins across the company. Targeted for credential harvesting.',
        status: node.underAttack ? 'UNDER ATTACK' : 'NORMAL'
      };
    }
    return {
      role: `${node.subnet} Node (${node.os})`,
      explanation: `Internal network asset running ${node.services?.join(', ') || 'network services'}.`,
      status: node.compromised ? 'COMPROMISED' : (node.underAttack ? 'PROBED' : 'CLEAN')
    };
  };

  const getNodeColor = (node) => {
    if (isRed) {
      if (!node.discovered) return '#334155';
      if (node.compromised) return '#ef4444';
      if (node.underAttack) return '#f59e0b';
      return '#38bdf8';
    }

    if (node.isCrownJewel) return '#eab308';
    if (node.isHoneypot) {
      if (node.underAttack || node.compromised) return '#d946ef';
      return '#a855f7';
    }
    if (node.compromised) return '#ef4444';
    if (node.underAttack) return '#f97316';
    if (node.gnnRisk > 0.7) return '#f59e0b';
    return '#10b981';
  };

  const getNodeIcon = (node) => {
    if (isRed && !node.discovered) {
      return <Lock className="w-4 h-4 text-slate-500" />;
    }
    if (isRed && node.isHoneypot) {
      if (node.disguiseAs?.includes('Database')) return <Database className="w-4 h-4 text-amber-400" />;
      return <Server className="w-4 h-4 text-cyan-400" />;
    }

    if (node.isCrownJewel) return <Database className="w-4 h-4 text-yellow-300" />;
    if (node.isHoneypot) return <Ghost className="w-4 h-4 text-purple-300" />;
    if (node.type === 'database') return <Database className="w-4 h-4 text-emerald-400" />;
    if (node.type === 'router' || node.type === 'gateway') return <Network className="w-4 h-4 text-blue-400" />;
    if (node.type === 'workstation') return <Laptop className="w-4 h-4 text-slate-300" />;
    return <Server className="w-4 h-4 text-teal-300" />;
  };

  const currentAttackerNode = nodes.find(n => n.id === activeTargetId) || nodes.find(n => n.underAttack) || nodes.find(n => n.compromised);

  return (
    <div className={`relative w-full h-full min-h-[300px] bg-[#070b14] rounded-xl border border-slate-800 overflow-hidden shadow-inner flex flex-col p-2 select-none ${className}`}>
      {/* Top Story & Controls Bar */}
      <div className="flex items-center justify-between px-2 py-1.5 mb-1 bg-slate-900/70 border border-slate-800/80 rounded-lg text-[10px] font-mono text-slate-300 shrink-0">
        <div className="flex items-center space-x-2 overflow-x-auto min-w-0">
          <span className="text-red-400 font-bold flex items-center shrink-0">
            <Skull className="w-3.5 h-3.5 mr-1" />
            ATTACK FLOW:
          </span>
          <span className="text-slate-400 shrink-0">Internet Hacker</span>
          <ArrowRight className="w-3 h-3 text-slate-600 shrink-0" />
          <span className="px-1.5 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-800 shrink-0">
            1. DMZ Web Entry
          </span>
          <ArrowRight className="w-3 h-3 text-slate-600 shrink-0" />
          <span className="px-1.5 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800 shrink-0">
            2. Corporate LAN Pivot
          </span>
          <ArrowRight className="w-3 h-3 text-slate-600 shrink-0" />
          <span className="px-1.5 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800 shrink-0 font-bold">
            🪤 Honeypot Traps
          </span>
          <ArrowRight className="w-3 h-3 text-slate-600 shrink-0" />
          <span className="px-1.5 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800 shrink-0 font-bold">
            ⭐ Crown Jewel Vault
          </span>
        </div>

        <div className="flex items-center space-x-2 shrink-0 ml-2">
          {onResetLayout && (
            <button
              onClick={onResetLayout}
              className="text-slate-400 hover:text-white flex items-center space-x-1 px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 transition"
              title="Reset all node positions to default"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Layout</span>
            </button>
          )}

          <button
            onClick={() => setShowHelper(!showHelper)}
            className="text-slate-400 hover:text-cyan-300 flex items-center space-x-1"
            title="Toggle beginner legend helper"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{showHelper ? 'Hide Tips' : 'Show Tips'}</span>
          </button>
        </div>
      </div>

      {/* Main SVG Interactive Canvas with Drag Support */}
      <div className="relative flex-1 w-full h-full min-h-0 flex items-center justify-center">
        {/* Background Grid Pattern */}
        <svg className="absolute inset-0 w-full h-full opacity-10 pointer-events-none">
          <defs>
            <pattern id={`grid-${perspective}`} width="25" height="25" patternUnits="userSpaceOnUse">
              <path d="M 25 0 L 0 0 0 25" fill="none" stroke="#475569" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill={`url(#grid-${perspective})`} />
        </svg>

        <svg 
          ref={svgRef}
          viewBox="0 0 790 400" 
          preserveAspectRatio="xMidYMid meet"
          className={`w-full h-full max-h-full max-w-full select-none ${
            dragState ? 'cursor-grabbing' : 'cursor-default'
          }`}
          onMouseMove={handleSVGMouseMove}
          onMouseUp={handleSVGMouseUp}
          onMouseLeave={handleSVGMouseUp}
        >
          {/* Subnet Boundaries */}
          {subnets.map((sub, i) => {
            const isVisible = !isRed || (i === 0) || (nodes.some(n => n.subnet === (i === 1 ? 'Internal' : 'Core') && n.discovered));
            if (!isVisible) return null;

            return (
              <g key={sub.name}>
                <rect
                  x={sub.x}
                  y={sub.y}
                  width={sub.width}
                  height={sub.height}
                  rx="14"
                  fill={isRed ? 'rgba(239, 68, 68, 0.02)' : 'rgba(59, 130, 246, 0.025)'}
                  stroke={isRed ? 'rgba(239, 68, 68, 0.2)' : 'rgba(100, 116, 139, 0.25)'}
                  strokeDasharray="4 4"
                  strokeWidth="1.2"
                />
                <rect
                  x={sub.x + 10}
                  y={sub.y + 10}
                  width={sub.width - 20}
                  height="26"
                  rx="6"
                  fill="#0b1324"
                  stroke={sub.color}
                  strokeOpacity="0.3"
                />
                <text
                  x={sub.x + 18}
                  y={sub.y + 26}
                  fill={sub.color}
                  fontSize="9.5"
                  fontFamily="monospace"
                  fontWeight="700"
                  className="tracking-wider uppercase"
                >
                  {sub.name}
                </text>
              </g>
            );
          })}

          {/* Network Edges / Cables */}
          {edges.map((edge, index) => {
            const s = nodes.find((n) => n.id === edge.source);
            const t = nodes.find((n) => n.id === edge.target);
            if (!s || !t) return null;

            const edgeVisible = !isRed || (s.discovered && t.discovered);
            if (!edgeVisible) return null;

            // Highlight only the active incoming vector path into the target node
            const isActiveEdge = activeTargetId && (
              t.id === activeTargetId || 
              (s.id === activeTargetId && !edges.some(e => e.target === activeTargetId))
            );

            return (
              <g key={`edge-${index}`}>
                <line
                  x1={s.x}
                  y1={s.y}
                  x2={t.x}
                  y2={t.y}
                  stroke={
                    isActiveEdge 
                      ? (isRed ? '#ef4444' : '#38bdf8') 
                      : '#334155'
                  }
                  strokeWidth={isActiveEdge ? 2.5 : 1.2}
                  strokeDasharray={isActiveEdge ? '5,5' : 'none'}
                />
                {isActiveEdge && (
                  <circle r="3.5" fill={isRed ? '#f87171' : '#38bdf8'}>
                    <animateMotion
                      path={`M ${s.x} ${s.y} L ${t.x} ${t.y}`}
                      dur="1.3s"
                      repeatCount="indefinite"
                    />
                  </circle>
                )}
              </g>
            );
          })}

          {/* Network Nodes with Drag-and-Drop Handlers */}
          {nodes.map((node) => {
            const isDiscovered = !isRed || node.discovered;
            const isSelected = selectedNode?.id === node.id;
            const isTarget = activeTargetId === node.id;
            const isBeingDragged = dragState?.id === node.id;
            const nodeColor = getNodeColor(node);

            if (!isDiscovered) {
              return (
                <g key={node.id} transform={`translate(${node.x}, ${node.y})`}>
                  <circle
                    r="15"
                    fill="#0b1120"
                    stroke="#334155"
                    strokeWidth="1"
                    strokeDasharray="2 2"
                  />
                  <text
                    textAnchor="middle"
                    dy="4"
                    fill="#64748b"
                    fontSize="10"
                    fontFamily="monospace"
                  >
                    ?
                  </text>
                </g>
              );
            }

            return (
              <g
                key={node.id}
                transform={`translate(${node.x}, ${node.y})`}
                className={`group ${
                  isBeingDragged 
                    ? 'cursor-grabbing' 
                    : 'cursor-grab'
                }`}
                onMouseDown={(e) => handleNodeMouseDown(e, node)}
                onMouseEnter={() => !dragState && setHoveredNode(node)}
                onMouseLeave={() => !dragState && setHoveredNode(null)}
              >
                {/* Hit test area for effortless click & drag */}
                <circle r="28" fill="transparent" />

                {/* Dragging Active Glow Ring */}
                {isBeingDragged && (
                  <circle
                    r="32"
                    fill="none"
                    stroke="#38bdf8"
                    strokeWidth="2"
                    strokeDasharray="4 4"
                    className="animate-spin"
                    style={{ animationDuration: '4s' }}
                  />
                )}

                {/* GNN Heatmap Halo (Blue Perspective) */}
                {!isRed && (
                  <circle
                    r={22 + node.gnnRisk * 12}
                    fill={node.isHoneypot ? '#a855f7' : (node.gnnRisk > 0.7 ? '#ef4444' : '#38bdf8')}
                    className="animate-pulse-subtle pointer-events-none"
                  />
                )}

                {/* Selection Ring */}
                {isSelected && !isBeingDragged && (
                  <circle
                    r="24"
                    fill="none"
                    stroke="#38bdf8"
                    strokeWidth="2"
                    strokeDasharray="4 4"
                    className="pointer-events-none"
                  />
                )}

                {/* Hover ring */}
                <circle
                  r="23"
                  fill="none"
                  stroke={nodeColor}
                  strokeWidth="1.5"
                  opacity="0"
                  className="transition-opacity duration-150 group-hover:opacity-80 pointer-events-none"
                />

                {/* Attacker Active Target Indicator */}
                {isTarget && (
                  <circle
                    r="26"
                    fill="none"
                    stroke={isRed ? '#ef4444' : '#f59e0b'}
                    strokeWidth="2.5"
                    opacity="0.7"
                    className="pointer-events-none animate-ping"
                  />
                )}

                {/* Main Node Circle */}
                <circle
                  r="18"
                  fill={isBeingDragged ? '#1e293b' : '#0f172a'}
                  stroke={nodeColor}
                  strokeWidth={node.isHoneypot || node.isCrownJewel ? 2.5 : 1.8}
                  className="transition-colors duration-150 group-hover:fill-[#1e293b]"
                />

                {/* Center Icon */}
                <g transform="translate(-8, -8)" className="pointer-events-none">
                  {getNodeIcon(node)}
                </g>

                {/* Node Label with Contrast Pill Background */}
                <g transform="translate(0, 24)" className="pointer-events-none">
                  <rect
                    x="-55"
                    y="0"
                    width="110"
                    height="18"
                    rx="4"
                    fill="#080e1c"
                    fillOpacity="0.88"
                    stroke="#1e293b"
                    strokeWidth="0.8"
                  />
                  <text
                    x="0"
                    y="12"
                    textAnchor="middle"
                    fill={isSelected ? '#38bdf8' : (node.isCrownJewel ? '#fde047' : '#e2e8f0')}
                    fontSize="8.5"
                    fontWeight={node.isCrownJewel || node.isHoneypot ? '700' : '500'}
                    fontFamily="sans-serif"
                  >
                    {isRed && node.isHoneypot ? (node.disguiseAs || node.label) : node.label.replace(' [DECOY]', '')}
                  </text>
                </g>

                {/* IP Address Pill */}
                <g transform="translate(0, 44)" className="pointer-events-none">
                  <text
                    x="0"
                    y="0"
                    textAnchor="middle"
                    fill="#94a3b8"
                    fontSize="8"
                    fontFamily="monospace"
                  >
                    {node.ip}
                  </text>
                </g>

                {/* Crown Jewel Tag Badge */}
                {!isRed && node.isCrownJewel && (
                  <g transform="translate(10, -18)" className="pointer-events-none">
                    <rect
                      width="54"
                      height="14"
                      rx="3"
                      fill="#854d0e"
                      stroke="#facc15"
                      strokeWidth="1"
                    />
                    <text
                      x="27"
                      y="10"
                      textAnchor="middle"
                      fill="#fef08a"
                      fontSize="7"
                      fontWeight="700"
                      fontFamily="monospace"
                    >
                      ⭐ VAULT DB
                    </text>
                  </g>
                )}

                {/* Honeypot Decoy Tag Badge (Blue View) */}
                {!isRed && node.isHoneypot && (
                  <g transform="translate(10, -18)" className="pointer-events-none">
                    <rect
                      width="50"
                      height="14"
                      rx="3"
                      fill="#581c87"
                      stroke="#a855f7"
                      strokeWidth="1"
                    />
                    <text
                      x="25"
                      y="10"
                      textAnchor="middle"
                      fill="#f3e8ff"
                      fontSize="7"
                      fontWeight="700"
                      fontFamily="monospace"
                    >
                      🪤 HONEYPOT
                    </text>
                  </g>
                )}

                {/* Compromised Badge */}
                {node.compromised && (
                  <g transform="translate(-32, -18)" className="pointer-events-none">
                    <rect
                      width="38"
                      height="14"
                      rx="3"
                      fill="#7f1d1d"
                      stroke="#ef4444"
                      strokeWidth="0.8"
                    />
                    <text
                      x="19"
                      y="10"
                      textAnchor="middle"
                      fill="#fee2e2"
                      fontSize="6.5"
                      fontWeight="700"
                      fontFamily="monospace"
                    >
                      BREACHED
                    </text>
                  </g>
                )}
              </g>
            );
          })}

          {/* Attacker Active Target Indicator (Stationary, Non-Bouncing) */}
          {activeTargetId && currentAttackerNode && !dragState && (
            <g 
              transform={`translate(${currentAttackerNode.x}, ${currentAttackerNode.y - 28})`} 
              className="pointer-events-none"
            >
              <rect
                x="-36"
                y="-14"
                width="72"
                height="14"
                rx="3"
                fill="#7f1d1d"
                stroke="#ef4444"
                strokeWidth="0.8"
              />
              <text
                x="0"
                y="-4"
                textAnchor="middle"
                fill="#fee2e2"
                fontSize="7"
                fontWeight="700"
                fontFamily="monospace"
              >
                PROBING TARGET
              </text>
            </g>
          )}
        </svg>

        {/* Hovered Node Explainer Tooltip (suppressed while actively dragging) */}
        {hoveredNode && !dragState && (
          <div className="absolute top-3 left-3 max-w-xs bg-slate-900/95 border border-cyan-500/50 rounded-lg p-3 shadow-2xl backdrop-blur-md text-xs font-sans z-20 animate-in fade-in duration-150">
            <div className="flex items-center space-x-2 mb-1.5 pb-1 border-b border-slate-800">
              <span className={`w-2.5 h-2.5 rounded-full ${hoveredNode.isHoneypot && !isRed ? 'bg-purple-400' : (hoveredNode.isCrownJewel ? 'bg-amber-400' : 'bg-cyan-400')}`} />
              <strong className="text-white text-[12px]">
                {isRed && hoveredNode.isHoneypot ? (hoveredNode.disguiseAs || hoveredNode.label.replace(' [DECOY]', '')) : hoveredNode.label}
              </strong>
              <span className="text-[10px] font-mono text-slate-400">({hoveredNode.ip})</span>
            </div>
            <div className="text-[11px] text-cyan-300 font-semibold mb-1">
              Role: {getNodeStory(hoveredNode).role}
            </div>
            <p className="text-[10.5px] text-slate-300 leading-relaxed mb-2 font-normal">
              {getNodeStory(hoveredNode).explanation}
            </p>
            <div className="flex justify-between items-center text-[10px] font-mono pt-1.5 border-t border-slate-800 text-slate-400">
              <span>Status: <strong className={hoveredNode.compromised ? 'text-red-400' : 'text-emerald-400'}>{getNodeStory(hoveredNode).status}</strong></span>
              {!isRed && <span>GNN Risk: <strong className="text-amber-400">{(hoveredNode.gnnRisk * 100).toFixed(0)}%</strong></span>}
            </div>
          </div>
        )}
      </div>

      {/* Beginner Legend Card & Drag Instruction */}
      {showHelper && (
        <div className="mt-1 bg-slate-900/90 border border-slate-800/80 px-3 py-1.5 rounded-lg text-[10px] font-mono text-slate-300 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-slate-400 font-bold uppercase">Color Guide:</span>
            <span className="flex items-center"><span className="w-2 h-2 rounded-full bg-emerald-400 mr-1" /> Green: Clean</span>
            <span className="flex items-center"><span className="w-2 h-2 rounded-full bg-yellow-400 mr-1" /> Gold: Crown Vault</span>
            <span className="flex items-center"><span className="w-2 h-2 rounded-full bg-purple-500 mr-1" /> Purple: Honeypot</span>
            <span className="flex items-center"><span className="w-2 h-2 rounded-full bg-red-500 mr-1" /> Red: Breached</span>
          </div>
          <span className="text-cyan-400 font-medium flex items-center">
            <Move className="w-3 h-3 mr-1" /> Click &amp; drag any node to adjust layout
          </span>
        </div>
      )}
    </div>
  );
}
