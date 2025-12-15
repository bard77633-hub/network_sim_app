import React, { useState, useEffect, useCallback } from 'react';
import { Sidebar } from './components/Sidebar';
import { NetworkCanvas } from './components/NetworkCanvas';
import { Inspector } from './components/Inspector';
import { Device, Connection, Packet, DeviceType, SimulationState, Mission } from './types';
import { generateId, isConnected, findPath, isValidIP } from './utils';
import { CheckCircle, ArrowRight, BookOpen, AlertCircle } from 'lucide-react';

const App: React.FC = () => {
  // State
  const [devices, setDevices] = useState<Device[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [packets, setPackets] = useState<Packet[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [connectionMode, setConnectionMode] = useState<{ active: boolean; sourceId: string | null }>({
    active: false,
    sourceId: null,
  });
  const [isEncrypted, setIsEncrypted] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  
  // Mission/Drill State
  const [currentMissionIndex, setCurrentMissionIndex] = useState(0);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [missionError, setMissionError] = useState<string | null>(null);

  // Logging Helper
  const log = (msg: string) => {
    setLogs((prev) => [msg, ...prev].slice(0, 50));
  };

  // --- Missions Definition ---
  const MISSIONS: Mission[] = [
    {
        id: 1,
        title: "基本の機器配置",
        description: "左のパネルから「パソコン」と「ルーター」を1台ずつキャンバスに配置してください。",
        hint: "ドラッグ＆ドロップで配置できます。",
        check: (state) => {
            const hasPC = state.devices.some(d => d.type === 'PC');
            const hasRouter = state.devices.some(d => d.type === 'ROUTER');
            return hasPC && hasRouter;
        }
    },
    {
        id: 2,
        title: "スイッチの設置と接続",
        description: "「スイッチ」を追加し、パソコンとルーターをスイッチ経由でケーブル接続してください。",
        hint: "構成: パソコン ↔ スイッチ ↔ ルーター。「ケーブル接続」ツールを使います。",
        check: (state) => {
            const switchDevice = state.devices.find(d => d.type === 'SWITCH');
            if (!switchDevice) return false;
            
            // Check PC connected to Switch
            const pc = state.devices.find(d => d.type === 'PC');
            const router = state.devices.find(d => d.type === 'ROUTER');
            
            if(!pc || !router) return false;

            const pcToSwitch = isConnected(state.connections, pc.id, switchDevice.id);
            const routerToSwitch = isConnected(state.connections, router.id, switchDevice.id);

            return pcToSwitch && routerToSwitch;
        }
    },
    {
        id: 3,
        title: "IPアドレスの設定",
        description: "パソコンとルーターに正しいIPアドレスを設定してください。",
        hint: "例: ルーター(192.168.1.1), パソコン(192.168.1.2)。右のパネルで設定できます。",
        check: (state) => {
            const pc = state.devices.find(d => d.type === 'PC');
            const router = state.devices.find(d => d.type === 'ROUTER');
            if(!pc || !router) return false;
            
            return isValidIP(pc.ip) && isValidIP(router.ip) && pc.ip !== router.ip;
        }
    },
    {
        id: 4,
        title: "通信テスト (Ping)",
        description: "パソコンからルーターへ「Ping」を実行し、通信を成功させてください。",
        hint: "パソコンを選択し、ルーターのIPアドレスを入力して「実行」を押します。",
        check: (state) => {
            const pc = state.devices.find(d => d.type === 'PC');
            const router = state.devices.find(d => d.type === 'ROUTER');
            if(!pc || !router) return false;

            const path = findPath(state.devices, state.connections, pc.id, router.id);
            return !!path && isValidIP(pc.ip) && isValidIP(router.ip);
        }
    },
    {
        id: 5,
        title: "暗号化通信の体験",
        description: "「通信の暗号化」をONにして、再度Pingを実行するか、鍵交換のアニメーションを確認してください。",
        hint: "右パネルの「全体設定」で暗号化をONにします。",
        check: (state) => {
            return state.isEncrypted;
        }
    }
  ];

  const currentMission = MISSIONS[currentMissionIndex];

  const checkMissionCompletion = () => {
      const state: SimulationState = {
          devices,
          connections,
          packets,
          selectedDeviceId,
          connectionMode,
          isEncrypted,
          logs
      };

      if (currentMission.check(state)) {
          setShowSuccessModal(true);
          setMissionError(null);
      } else {
          setMissionError("条件を満たしていません。ヒントを確認して再挑戦してください。");
      }
  };

  const nextMission = () => {
      setShowSuccessModal(false);
      if (currentMissionIndex < MISSIONS.length - 1) {
          setCurrentMissionIndex(prev => prev + 1);
      }
  };

  // --- Device Management ---

  const addDevice = (type: DeviceType, x: number, y: number) => {
    const id = generateId();
    const count = devices.filter(d => d.type === type).length + 1;
    const typeLabel = type === 'PC' ? 'PC' : type === 'SWITCH' ? 'SW' : 'Router';
    const name = `${typeLabel}-${count}`;
    
    // Auto-assign logical defaults for routers in this scenario
    let ip = '';
    // if(type === 'ROUTER') ip = '192.168.1.1'; // Let users set it for the drill

    const newDevice: Device = {
      id,
      type,
      x,
      y,
      ip,
      subnet: '255.255.255.0',
      name,
    };

    setDevices((prev) => [...prev, newDevice]);
    log(`機器を追加: ${name}`);
  };

  const updateDevice = (id: string, updates: Partial<Device>) => {
    setDevices((prev) => prev.map((d) => (d.id === id ? { ...d, ...updates } : d)));
  };

  const moveDevice = (id: string, x: number, y: number) => {
    setDevices((prev) => prev.map((d) => (d.id === id ? { ...d, x, y } : d)));
  };

  const deleteDevice = (id: string) => {
    setDevices((prev) => prev.filter((d) => d.id !== id));
    setConnections((prev) => prev.filter((c) => c.from !== id && c.to !== id));
    if (selectedDeviceId === id) setSelectedDeviceId(null);
    log(`機器を削除: ${id}`);
  };

  // --- Connection Management ---

  const handleDeviceClick = (id: string) => {
    if (connectionMode.active) {
      if (!connectionMode.sourceId) {
        // Select source
        setConnectionMode({ ...connectionMode, sourceId: id });
        log(`接続元を選択しました。接続先をクリックしてください。`);
      } else {
        // Connect to target
        if (connectionMode.sourceId === id) {
          // Cancel if clicked same
          setConnectionMode({ active: false, sourceId: null });
          return;
        }

        // Check if already connected
        if (isConnected(connections, connectionMode.sourceId, id)) {
          log(`既に接続されています。`);
          setConnectionMode({ active: false, sourceId: null });
          return;
        }

        const newConn: Connection = {
          id: generateId(),
          from: connectionMode.sourceId,
          to: id,
        };

        setConnections((prev) => [...prev, newConn]);
        setConnectionMode({ active: false, sourceId: null });
        log(`接続完了。`);
      }
    } else {
      setSelectedDeviceId(id);
    }
  };

  const startConnectionMode = () => {
    setConnectionMode({ active: true, sourceId: null });
    log(`ケーブル接続モード: 接続元の機器をクリックしてください。`);
  };

  // --- Simulation / Animation Loop ---

  const startPing = (fromId: string, toId: string) => {
    const fromDevice = devices.find(d => d.id === fromId);
    const toDevice = devices.find(d => d.id === toId);

    if(!fromDevice || !toDevice) return;

    // IP Validation Logic
    if(!isValidIP(fromDevice.ip) || !isValidIP(toDevice.ip)) {
        log(`エラー: IPアドレスの設定が正しくありません。`);
        return;
    }

    const path = findPath(devices, connections, fromId, toId);

    if (!path) {
      log(`Ping失敗: 経路が見つかりません。ケーブルを確認してください。`);
      return;
    }

    log(`Ping送信: ${fromDevice.ip} -> ${toDevice.ip}`);

    // Create Ping Packet
    const newPacket: Packet = {
      id: generateId(),
      fromId,
      toId,
      path,
      currentIndex: 0,
      progress: 0,
      type: 'PING',
      status: 'active',
    };

    setPackets((prev) => [...prev, newPacket]);
  };

  // Animation Loop
  useEffect(() => {
    let animationFrameId: number;

    const animate = () => {
      setPackets((prevPackets) => {
        const nextPackets: Packet[] = [];

        prevPackets.forEach((p) => {
            // Speed of animation
            const speed = 2; 
            let newProgress = p.progress + speed;

            if (newProgress >= 100) {
                // Reached next node
                const nextIndex = p.currentIndex + 1;
                
                if (nextIndex >= p.path.length - 1) {
                    // Reached Destination
                    if (p.status === 'active') {
                        // If it was the first leg of a ping, we might want to return?
                        // For simplicity, just one way success for this demo, or immediate return packet.
                        if (p.type === 'PING') {
                             log(`応答あり: ${devices.find(d => d.id === p.toId)?.ip} (bytes=32 time=10ms)`);
                             // Send Reply Packet logic could go here
                        }
                    }
                    // Remove packet
                    return; 
                } else {
                    // Move to next hop
                    nextPackets.push({
                        ...p,
                        currentIndex: nextIndex,
                        progress: 0
                    });
                }
            } else {
                nextPackets.push({ ...p, progress: newProgress });
            }
        });

        return nextPackets;
      });
      animationFrameId = requestAnimationFrame(animate);
    };

    animationFrameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrameId);
  }, [devices, isEncrypted]);

  // Special Encryption Demo Animation
  const runEncryptionDemo = () => {
     if(connections.length === 0) {
         log("接続されている機器がありません。");
         return;
     }
     setIsEncrypted(!isEncrypted);
     if(!isEncrypted) {
         log("暗号化をONにしました。ハンドシェイクを開始します...");
         // Find a random connection to animate key exchange
         const conn = connections[0];
         const p1: Packet = {
             id: generateId(), fromId: conn.from, toId: conn.to, path: [conn.from, conn.to],
             currentIndex: 0, progress: 0, type: 'KEY_EXCHANGE', status: 'active'
         };
         // Delayed return key
         setTimeout(() => {
            const p2: Packet = {
                id: generateId(), fromId: conn.to, toId: conn.from, path: [conn.to, conn.from],
                currentIndex: 0, progress: 0, type: 'KEY_EXCHANGE', status: 'active'
            };
            setPackets(prev => [...prev, p2]);
         }, 1000);

         setPackets(prev => [...prev, p1]);
     } else {
         log("暗号化をOFFにしました。");
     }
  };

  // --- Render ---

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-50 text-slate-800 font-sans">
      
      {/* Top Banner (Mission Guide) */}
      <div className="h-16 bg-white border-b border-slate-200 flex items-center px-6 justify-between shadow-sm z-10">
          <div className="flex items-center gap-4 flex-1">
            <div className="flex flex-col">
                 <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">
                     MISSION {currentMissionIndex + 1} / {MISSIONS.length}
                 </span>
                 <h2 className="text-lg font-bold text-slate-800">{currentMission.title}</h2>
            </div>
            <div className="h-8 w-px bg-slate-200 mx-2 hidden md:block"></div>
            <p className="text-sm text-slate-600 hidden md:block flex-1">{currentMission.description}</p>
          </div>
          
          <div className="flex items-center gap-3">
               {missionError && (
                   <span className="text-xs text-red-500 font-bold animate-pulse flex items-center gap-1">
                       <AlertCircle size={12} />
                       {missionError}
                   </span>
               )}
               <button 
                   onClick={checkMissionCompletion}
                   className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm font-bold flex items-center gap-2 transition-all active:scale-95"
               >
                   <CheckCircle size={18} />
                   答え合わせ
               </button>
          </div>
      </div>

      {/* Main Workspace */}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar 
            onStartConnection={startConnectionMode} 
            connectionModeActive={connectionMode.active}
        />
        
        <NetworkCanvas
          devices={devices}
          connections={connections}
          packets={packets}
          selectedDeviceId={selectedDeviceId}
          connectionMode={connectionMode}
          onDeviceMove={moveDevice}
          onDeviceClick={handleDeviceClick}
          onBackgroundClick={() => {
              setSelectedDeviceId(null);
              setConnectionMode({ active: false, sourceId: null });
          }}
          onDropDevice={addDevice}
          isEncrypted={isEncrypted}
        />

        <Inspector
          selectedDevice={selectedDeviceId ? devices.find(d => d.id === selectedDeviceId) || null : null}
          devices={devices}
          onUpdateDevice={updateDevice}
          onDeleteDevice={deleteDevice}
          onPing={startPing}
          isEncrypted={isEncrypted}
          onToggleEncryption={runEncryptionDemo}
          logs={logs}
        />
      </div>

      {/* Success Modal */}
      {showSuccessModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl transform scale-100 text-center">
                  <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CheckCircle size={32} />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-800 mb-2">ミッションクリア！</h3>
                  <p className="text-slate-600 mb-6">素晴らしい！正しく構成されています。</p>
                  
                  <div className="flex gap-3 justify-center">
                      {currentMissionIndex < MISSIONS.length - 1 ? (
                          <button 
                            onClick={nextMission}
                            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center gap-2 shadow-lg hover:shadow-xl transition-all"
                          >
                              次のミッションへ <ArrowRight size={18} />
                          </button>
                      ) : (
                          <div className="text-blue-600 font-bold text-lg">全ミッション達成おめでとう！</div>
                      )}
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default App;