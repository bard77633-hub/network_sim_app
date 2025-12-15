import React, { useState } from 'react';
import htm from 'htm';
import { Settings, Play, Shield, ShieldAlert, Trash2, Activity, RefreshCw, Unplug, Info } from 'lucide-react';
import { isConnected } from '../utils.js';

const html = htm.bind(React.createElement);

// 機器ごとの役割説明定義
const DEVICE_INFO = {
    PC: "エンドユーザーが操作する端末です。データの送信元または受信先になります。",
    SERVER: "ネットワーク上でサービス（Webサイトやファイル共有など）を提供する高性能なコンピュータです。",
    ROUTER: "異なるネットワーク（LANとWANなど）をつなぐ機器です。IPアドレスを見て、データの行き先（経路）を判断します。",
    SWITCH: "LAN内で複数の機器をつなぐ集線装置です。MACアドレスを見て、必要なポートにだけデータを送ります。",
    HUB: "古い集線装置です。届いたデータを全ポートにばら撒くため、効率が悪くセキュリティリスクがあります。",
    PRINTER: "ネットワーク経由で印刷データを受け取る出力装置です。",
    ONU: "光回線終端装置です。光ファイバーの光信号と、LANケーブルのデジタル信号を相互に変換します。"
};

export const Inspector = ({
  selectedDevice,
  devices,
  connections, // Add connections prop to find neighbors
  onUpdateDevice,
  onDeleteDevice,
  onDeleteConnection, // Add capability to delete connection
  onPing,
  isEncrypted,
  onToggleEncryption,
  logs,
}) => {
  const [targetIp, setTargetIp] = useState('');

  const handleIpChange = (e) => {
    if (selectedDevice) {
      onUpdateDevice(selectedDevice.id, { ip: e.target.value });
    }
  };

  const handleDhcp = () => {
    if (selectedDevice) {
       const randomLast = Math.floor(Math.random() * 200) + 10;
       onUpdateDevice(selectedDevice.id, { ip: `192.168.1.${randomLast}` });
    }
  };

  const handlePing = () => {
      if(!selectedDevice) return;
      const target = devices.find(d => d.ip === targetIp);
      if(target) {
          onPing(selectedDevice.id, target.id);
      } else {
          alert('指定されたIPアドレスの機器が見つかりません。');
      }
  };

  // Find connected devices
  const connectedNeighbors = selectedDevice 
    ? connections
        .filter(c => c.from === selectedDevice.id || c.to === selectedDevice.id)
        .map(c => {
            const partnerId = c.from === selectedDevice.id ? c.to : c.from;
            const partner = devices.find(d => d.id === partnerId);
            return { connectionId: c.id, device: partner };
        })
    : [];

  return html`
    <div className="w-80 bg-white border-l border-slate-200 flex flex-col h-full shadow-lg z-20">
      
      <div className="p-4 border-b border-slate-100 bg-slate-50">
        <h2 className="font-bold text-slate-800 flex items-center gap-2">
            <${Settings} size=${18} />
            設定とテスト (Properties)
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        
        ${selectedDevice ? html`
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
            
            ${/* Header with Name and Delete */ ''}
            <div className="flex justify-between items-start">
                <div>
                    <h3 className="font-semibold text-lg text-slate-800">${selectedDevice.name}</h3>
                    <span className="text-xs font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-500">ID: ${selectedDevice.id.substring(0,6)}</span>
                </div>
                <button 
                    onClick=${() => onDeleteDevice(selectedDevice.id)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors"
                    title="機器を削除"
                >
                    <${Trash2} size=${18} />
                </button>
            </div>

            ${/* Device Role Description */ ''}
            <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 text-xs text-blue-800 leading-relaxed">
                <div className="flex items-center gap-1 font-bold mb-1 text-blue-600">
                    <${Info} size=${14} /> 機器の役割
                </div>
                ${DEVICE_INFO[selectedDevice.type] || "詳細情報はありません。"}
            </div>

            ${/* IP Settings */ ''}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-600">IPアドレス (IP Address)</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value=${selectedDevice.ip}
                  onChange=${handleIpChange}
                  placeholder="0.0.0.0"
                  className="flex-1 px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                />
                <button 
                    onClick=${handleDhcp}
                    className="px-3 py-2 bg-slate-100 text-slate-600 border border-slate-300 rounded-md hover:bg-slate-200 text-xs font-semibold"
                    title="自動割り当て (DHCP)"
                >
                    自動
                </button>
              </div>
            </div>

            ${/* Connection Management */ ''}
            <div className="pt-2">
                <label className="block text-xs font-medium text-slate-500 mb-2 uppercase tracking-wider">接続されている機器</label>
                ${connectedNeighbors.length > 0 ? html`
                    <ul className="space-y-2">
                        ${connectedNeighbors.map(({ connectionId, device }) => html`
                            <li key=${connectionId} className="flex items-center justify-between p-2 bg-slate-50 rounded border border-slate-100 text-sm">
                                <div className="flex items-center gap-2 overflow-hidden">
                                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                    <span className="truncate font-medium text-slate-700">${device ? device.name : 'Unknown'}</span>
                                </div>
                                <button 
                                    onClick=${() => onDeleteConnection(connectionId)}
                                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                                    title="切断（ケーブル削除）"
                                >
                                    <${Unplug} size=${14} />
                                </button>
                            </li>
                        `)}
                    </ul>
                ` : html`
                    <p className="text-xs text-slate-400 italic p-2 bg-slate-50 rounded border border-slate-100 text-center">
                        接続されていません
                    </p>
                `}
            </div>

            ${/* Ping Test (PC/Server only) */ ''}
            ${(selectedDevice.type === 'PC' || selectedDevice.type === 'SERVER') && html`
                <div className="pt-4 border-t border-slate-100">
                    <h4 className="font-semibold text-sm text-slate-800 mb-3 flex items-center gap-2">
                        <${Activity} size=${16} /> 通信テスト (Ping)
                    </h4>
                    <div className="space-y-2">
                        <label className="block text-xs text-slate-500">宛先 IPアドレス</label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value=${targetIp}
                                onChange=${(e) => setTargetIp(e.target.value)}
                                placeholder="例: 192.168.1.1"
                                className="flex-1 px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 font-mono text-sm"
                            />
                            <button 
                                onClick=${handlePing}
                                className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center justify-center font-bold text-xs w-16"
                            >
                                実行
                            </button>
                        </div>
                    </div>
                </div>
            `}
          </div>
        ` : html`
            <div className="text-center py-10 text-slate-400">
                <p>機器を選択して設定を行ってください</p>
            </div>
        `}

        <hr className="border-slate-100" />

        <div className="space-y-3">
             <h3 className="font-semibold text-sm text-slate-800 flex items-center gap-2">
                全体設定 (Global)
            </h3>
            
            <div className=${`p-4 rounded-lg border-2 cursor-pointer transition-all flex items-center justify-between
                ${isEncrypted ? 'border-purple-500 bg-purple-50' : 'border-slate-200 bg-slate-50 hover:border-purple-300'}
            `}
            onClick=${onToggleEncryption}
            >
                <div className="flex items-center gap-3">
                    ${isEncrypted ? html`<${Shield} className="text-purple-600" />` : html`<${ShieldAlert} className="text-slate-400" />`}
                    <div>
                        <div className=${`font-bold ${isEncrypted ? 'text-purple-700' : 'text-slate-600'}`}>
                            通信の暗号化
                        </div>
                        <div className="text-[10px] text-slate-500">
                            ${isEncrypted ? 'ON: 鍵マークで保護されています' : 'OFF: 平文で通信します (危険)'}
                        </div>
                    </div>
                </div>
                <div className=${`w-10 h-6 rounded-full relative transition-colors ${isEncrypted ? 'bg-purple-600' : 'bg-slate-300'}`}>
                    <div className=${`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${isEncrypted ? 'left-5' : 'left-1'}`}></div>
                </div>
            </div>
        </div>

        <div className="pt-4 border-t border-slate-100 flex-1 flex flex-col min-h-[150px]">
             <div className="flex justify-between items-center mb-2">
                 <h3 className="font-semibold text-xs text-slate-500 uppercase tracking-wider">通信ログ (Logs)</h3>
                 <${RefreshCw} size=${12} className="text-slate-400 cursor-pointer hover:text-blue-500" />
             </div>
             <div className="bg-slate-900 rounded-md p-3 flex-1 overflow-y-auto font-mono text-[10px] text-green-400 leading-relaxed shadow-inner">
                 ${logs.length === 0 && html`<span className="text-slate-600 opacity-50">システム準備完了...</span>`}
                 ${logs.map((log, i) => html`
                     <div key=${i} className="mb-1 border-b border-slate-800 pb-1 last:border-0">
                         <span className="opacity-50 mr-2">[${new Date().toLocaleTimeString()}]</span>
                         ${log}
                     </div>
                 `)}
             </div>
        </div>

      </div>
    </div>
  `;
};