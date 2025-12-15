import React from 'react';
import { Monitor, Router, Network, Cable } from 'lucide-react';
import { DeviceType } from '../types';

interface SidebarProps {
  onStartConnection: () => void;
  connectionModeActive: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ onStartConnection, connectionModeActive }) => {
  const handleDragStart = (e: React.DragEvent, type: DeviceType) => {
    e.dataTransfer.setData('deviceType', type);
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <div className="w-64 bg-slate-800 text-white flex flex-col border-r border-slate-700 shadow-xl z-20">
      <div className="p-4 border-b border-slate-700">
        <h1 className="text-lg font-bold flex items-center gap-2">
          <Network className="text-blue-400" />
          NetSim Builder
        </h1>
        <p className="text-xs text-slate-400 mt-1">ネットワーク学習シミュレーター</p>
      </div>

      <div className="p-4 flex-1 overflow-y-auto">
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">機器リスト (Devices)</h2>
        <div className="space-y-3">
          <DraggableItem
            type="PC"
            label="パソコン (PC)"
            icon={<Monitor size={20} />}
            onDragStart={handleDragStart}
            description="端末 (クライアント)"
          />
          <DraggableItem
            type="SWITCH"
            label="スイッチ (Switch)"
            icon={<Network size={20} />}
            onDragStart={handleDragStart}
            description="LAN内の機器を接続"
          />
          <DraggableItem
            type="ROUTER"
            label="ルーター (Router)"
            icon={<Router size={20} />}
            onDragStart={handleDragStart}
            description="異なるネットワークを接続"
          />
        </div>

        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mt-8 mb-3">ツール (Tools)</h2>
        <div className="space-y-3">
            <button 
                onClick={onStartConnection}
                className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all duration-200
                    ${connectionModeActive 
                        ? 'bg-blue-600 border-blue-500 text-white shadow-[0_0_10px_rgba(37,99,235,0.5)]' 
                        : 'bg-slate-700 border-slate-600 hover:bg-slate-600'
                    }
                `}
            >
                <Cable size={20} />
                <div className="text-left">
                    <div className="font-medium">ケーブル接続</div>
                    <div className="text-[10px] opacity-70">2つの機器をクリックして接続</div>
                </div>
            </button>
        </div>
      </div>
      
      <div className="p-4 bg-slate-900 border-t border-slate-700">
        <p className="text-[10px] text-slate-500">情報I ネットワーク実習用 v1.0</p>
      </div>
    </div>
  );
};

interface DraggableItemProps {
  type: DeviceType;
  label: string;
  icon: React.ReactNode;
  description: string;
  onDragStart: (e: React.DragEvent, type: DeviceType) => void;
}

const DraggableItem: React.FC<DraggableItemProps> = ({ type, label, icon, onDragStart, description }) => {
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, type)}
      className="flex items-center gap-3 p-3 bg-slate-700 rounded-lg cursor-grab active:cursor-grabbing hover:bg-slate-600 border border-transparent hover:border-slate-500 transition-colors"
    >
      <div className="p-2 bg-slate-800 rounded-md text-blue-300">
        {icon}
      </div>
      <div>
        <div className="font-medium text-sm">{label}</div>
        <div className="text-[10px] text-slate-400">{description}</div>
      </div>
    </div>
  );
};