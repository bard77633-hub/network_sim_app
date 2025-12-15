import React, { useRef, useState } from 'react';
import htm from 'htm';
import { Monitor, Router, Network, Lock, Key, Server, Printer, Box, CircleDot } from 'lucide-react';

const html = htm.bind(React.createElement);
const DEVICE_SIZE = 60;

export const NetworkCanvas = ({
  devices,
  connections,
  packets,
  selectedDeviceId,
  connectionMode,
  onDeviceMove,
  onDeviceClick,
  onBackgroundClick,
  onDropDevice,
  isEncrypted,
}) => {
  const canvasRef = useRef(null);
  const [draggingId, setDraggingId] = useState(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const handleDrop = (e) => {
    e.preventDefault();
    const type = e.dataTransfer.getData('deviceType');
    if (type && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left - DEVICE_SIZE / 2;
      const y = e.clientY - rect.top - DEVICE_SIZE / 2;
      onDropDevice(type, x, y);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleMouseDown = (e, id, initialX, initialY) => {
    if (connectionMode.active) {
        onDeviceClick(id);
        e.stopPropagation();
        return;
    }
    
    e.stopPropagation();
    setDraggingId(id);
    setOffset({
      x: e.clientX - initialX,
      y: e.clientY - initialY,
    });
    onDeviceClick(id);
  };

  const handleMouseMove = (e) => {
    if (draggingId && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const mouseXRel = e.clientX - rect.left;
      const mouseYRel = e.clientY - rect.top;
      
      onDeviceMove(draggingId, mouseXRel - DEVICE_SIZE/2, mouseYRel - DEVICE_SIZE/2);
    }
  };

  const handleMouseUp = () => {
    setDraggingId(null);
  };

  const getCenter = (id) => {
    const device = devices.find((d) => d.id === id);
    if (!device) return { x: 0, y: 0 };
    return { x: device.x + DEVICE_SIZE / 2, y: device.y + DEVICE_SIZE / 2 };
  };

  const getIcon = (type) => {
    switch (type) {
      case 'PC': return html`<${Monitor} className="w-8 h-8 text-blue-600" />`;
      case 'SERVER': return html`<${Server} className="w-8 h-8 text-indigo-600" />`;
      case 'PRINTER': return html`<${Printer} className="w-8 h-8 text-slate-600" />`;
      case 'ROUTER': return html`<${Router} className="w-8 h-8 text-orange-600" />`;
      case 'SWITCH': return html`<${Network} className="w-8 h-8 text-green-600" />`;
      case 'HUB': return html`<${CircleDot} className="w-8 h-8 text-teal-600" />`;
      case 'ONU': return html`<${Box} className="w-8 h-8 text-gray-800" />`;
      default: return null;
    }
  };
  
  // Simple label for hover
  const getLabel = (type) => {
      switch (type) {
          case 'PC': return 'PC (端末)';
          case 'SERVER': return 'Server (サーバー)';
          case 'ROUTER': return 'Router (ルーター)';
          case 'SWITCH': return 'Switch (スイッチ)';
          case 'ONU': return 'ONU (回線終端装置)';
          default: return type;
      }
  }

  return html`
    <div
      ref=${canvasRef}
      className="flex-1 relative overflow-hidden canvas-grid cursor-default"
      onDrop=${handleDrop}
      onDragOver=${handleDragOver}
      onMouseMove=${handleMouseMove}
      onMouseUp=${handleMouseUp}
      onMouseDown=${onBackgroundClick}
    >
      <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
        ${connections.map((conn) => {
          const start = getCenter(conn.from);
          const end = getCenter(conn.to);
          return html`<line
            key=${conn.id}
            x1=${start.x}
            y1=${start.y}
            x2=${end.x}
            y2=${end.y}
            stroke=${isEncrypted ? "#8b5cf6" : "#94a3b8"}
            strokeWidth="4"
            strokeDasharray=${isEncrypted ? "5,5" : "0"}
          />`;
        })}
      </svg>

      ${devices.map((device) => html`
        <div
          key=${device.id}
          className=${`absolute flex flex-col items-center justify-center cursor-pointer transition-shadow z-10
            ${selectedDeviceId === device.id ? 'ring-2 ring-blue-500 shadow-lg scale-105' : ''}
            ${connectionMode.sourceId === device.id ? 'ring-2 ring-green-500' : ''}
          `}
          style=${{
            left: device.x,
            top: device.y,
            width: DEVICE_SIZE,
            height: DEVICE_SIZE,
          }}
          title=${getLabel(device.type)}
          onMouseDown=${(e) => handleMouseDown(e, device.id, device.x, device.y)}
        >
          <div className="bg-white p-2 rounded-lg shadow-md border border-slate-200 pointer-events-none">
            ${getIcon(device.type)}
          </div>
          <span className="absolute -bottom-6 text-xs font-semibold bg-white/80 px-1 rounded pointer-events-none whitespace-nowrap">
            ${device.name}
          </span>
          <span className="absolute -bottom-10 text-[10px] text-slate-500 bg-white/80 px-1 rounded pointer-events-none whitespace-nowrap">
             ${device.ip || ""}
          </span>
        </div>
      `)}

      ${packets.map((packet) => {
        if (packet.path.length < 2) return null;
        const fromId = packet.path[packet.currentIndex];
        const toId = packet.path[packet.currentIndex + 1];
        
        if (!fromId || !toId) return null;

        const start = getCenter(fromId);
        const end = getCenter(toId);
        
        const x = start.x + (end.x - start.x) * (packet.progress / 100);
        const y = start.y + (end.y - start.y) * (packet.progress / 100);

        return html`
          <div
            key=${packet.id}
            className="absolute z-20 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none"
            style=${{ left: x, top: y }}
          >
             ${packet.type === 'KEY_EXCHANGE' ? html`
                 <div className="bg-yellow-100 p-1 rounded-full border border-yellow-400 shadow-sm">
                     <${Key} size=${16} className="text-yellow-600" />
                 </div>
             ` : packet.type === 'PING' && isEncrypted ? html`
                <div className="bg-purple-100 p-1 rounded-full border border-purple-400 shadow-sm">
                    <${Lock} size=${16} className="text-purple-600" />
                </div>
             ` : html`
                <div className=${`w-4 h-4 rounded-full shadow-sm border ${
                    packet.status === 'failed' ? 'bg-red-500 border-red-700' : 
                    packet.status === 'success' ? 'bg-green-500 border-green-700' : 'bg-blue-500 border-blue-700'
                }`}></div>
             `}
          </div>
        `;
      })}
    </div>
  `;
};