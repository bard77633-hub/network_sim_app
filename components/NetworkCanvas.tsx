import React, { useRef, useState, useEffect } from 'react';
import { Device, Connection, Packet, DeviceType } from '../types';
import { Monitor, Router, Network, Lock, Key, CheckCircle, XCircle } from 'lucide-react';

interface NetworkCanvasProps {
  devices: Device[];
  connections: Connection[];
  packets: Packet[];
  selectedDeviceId: string | null;
  connectionMode: { active: boolean; sourceId: string | null };
  onDeviceMove: (id: string, x: number, y: number) => void;
  onDeviceClick: (id: string) => void;
  onBackgroundClick: () => void;
  onDropDevice: (type: DeviceType, x: number, y: number) => void;
  isEncrypted: boolean;
}

const DEVICE_SIZE = 60;

export const NetworkCanvas: React.FC<NetworkCanvasProps> = ({
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
  const canvasRef = useRef<HTMLDivElement>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  // Handle Drop from Toolbar
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const type = e.dataTransfer.getData('deviceType') as DeviceType;
    if (type && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left - DEVICE_SIZE / 2;
      const y = e.clientY - rect.top - DEVICE_SIZE / 2;
      onDropDevice(type, x, y);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  // Handle Device Dragging within Canvas
  const handleMouseDown = (e: React.MouseEvent, id: string, initialX: number, initialY: number) => {
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

  const handleMouseMove = (e: React.MouseEvent) => {
    if (draggingId && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const newX = e.clientX - offset.x; // Absolute mouse - offset
      // Since we stored offset as (Mouse - DevicePos), DevicePos = Mouse - Offset is wrong?
      // Actually simpler:
      // Offset = MouseClient - DeviceX
      // NewDeviceX = MouseClient - Offset
      
      // Let's refine for local coordinate system
      // We need x,y relative to canvas
      const mouseXRel = e.clientX - rect.left;
      const mouseYRel = e.clientY - rect.top;
      
      // We need to maintain the grab offset. 
      // Let's recalculate on drag start simply: 
      // Not storing offset, just calculating delta? 
      // Let's allow center dragging for simplicity in this implementation.
      onDeviceMove(draggingId, mouseXRel - DEVICE_SIZE/2, mouseYRel - DEVICE_SIZE/2);
    }
  };

  const handleMouseUp = () => {
    setDraggingId(null);
  };

  // Get Device Center
  const getCenter = (id: string) => {
    const device = devices.find((d) => d.id === id);
    if (!device) return { x: 0, y: 0 };
    return { x: device.x + DEVICE_SIZE / 2, y: device.y + DEVICE_SIZE / 2 };
  };

  // Icon Mapper
  const getIcon = (type: DeviceType) => {
    switch (type) {
      case 'PC': return <Monitor className="w-8 h-8 text-blue-600" />;
      case 'ROUTER': return <Router className="w-8 h-8 text-orange-600" />;
      case 'SWITCH': return <Network className="w-8 h-8 text-green-600" />;
    }
  };

  return (
    <div
      ref={canvasRef}
      className="flex-1 relative overflow-hidden canvas-grid cursor-default"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseDown={onBackgroundClick}
    >
      <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
        {connections.map((conn) => {
          const start = getCenter(conn.from);
          const end = getCenter(conn.to);
          return (
            <line
              key={conn.id}
              x1={start.x}
              y1={start.y}
              x2={end.x}
              y2={end.y}
              stroke={isEncrypted ? "#8b5cf6" : "#94a3b8"}
              strokeWidth="4"
              strokeDasharray={isEncrypted ? "5,5" : "0"}
            />
          );
        })}
        {/* Connection Mode Line (Preview) */}
        {connectionMode.active && connectionMode.sourceId && (
            // In a real app we'd track mouse pos for the other end, 
            // but for now we skip the preview line for simplicity or implement later
            <React.Fragment />
        )}
      </svg>

      {/* Devices */}
      {devices.map((device) => (
        <div
          key={device.id}
          className={`absolute flex flex-col items-center justify-center cursor-pointer transition-shadow z-10
            ${selectedDeviceId === device.id ? 'ring-2 ring-blue-500 shadow-lg scale-105' : ''}
            ${connectionMode.sourceId === device.id ? 'ring-2 ring-green-500' : ''}
          `}
          style={{
            left: device.x,
            top: device.y,
            width: DEVICE_SIZE,
            height: DEVICE_SIZE,
          }}
          onMouseDown={(e) => handleMouseDown(e, device.id, device.x, device.y)}
        >
          <div className="bg-white p-2 rounded-lg shadow-md border border-slate-200 pointer-events-none">
            {getIcon(device.type)}
          </div>
          <span className="absolute -bottom-6 text-xs font-semibold bg-white/80 px-1 rounded pointer-events-none whitespace-nowrap">
            {device.name}
          </span>
          <span className="absolute -bottom-10 text-[10px] text-slate-500 bg-white/80 px-1 rounded pointer-events-none whitespace-nowrap">
             {device.ip || "No IP"}
          </span>
        </div>
      ))}

      {/* Packets / Animations */}
      {packets.map((packet) => {
        if (packet.path.length < 2) return null;
        const fromId = packet.path[packet.currentIndex];
        const toId = packet.path[packet.currentIndex + 1];
        
        if (!fromId || !toId) return null;

        const start = getCenter(fromId);
        const end = getCenter(toId);
        
        // Linear interpolation
        const x = start.x + (end.x - start.x) * (packet.progress / 100);
        const y = start.y + (end.y - start.y) * (packet.progress / 100);

        return (
          <div
            key={packet.id}
            className="absolute z-20 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none"
            style={{ left: x, top: y }}
          >
             {packet.type === 'KEY_EXCHANGE' ? (
                 <div className="bg-yellow-100 p-1 rounded-full border border-yellow-400 shadow-sm">
                     <Key size={16} className="text-yellow-600" />
                 </div>
             ) : packet.type === 'PING' && isEncrypted ? (
                <div className="bg-purple-100 p-1 rounded-full border border-purple-400 shadow-sm">
                    <Lock size={16} className="text-purple-600" />
                </div>
             ) : (
                <div className={`w-4 h-4 rounded-full shadow-sm border ${
                    packet.status === 'failed' ? 'bg-red-500 border-red-700' : 
                    packet.status === 'success' ? 'bg-green-500 border-green-700' : 'bg-blue-500 border-blue-700'
                }`}></div>
             )}
          </div>
        );
      })}
    </div>
  );
};
