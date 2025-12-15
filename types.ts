export type DeviceType = 'PC' | 'ROUTER' | 'SWITCH';

export interface Device {
  id: string;
  type: DeviceType;
  x: number;
  y: number;
  ip: string;
  subnet: string;
  name: string;
}

export interface Connection {
  id: string;
  from: string;
  to: string;
}

export interface Packet {
  id: string;
  fromId: string;
  toId: string;
  path: string[]; // Array of device IDs
  currentIndex: number;
  progress: number; // 0 to 100
  type: 'PING' | 'KEY_EXCHANGE' | 'DATA';
  status: 'active' | 'success' | 'failed';
  message?: string;
}

export interface Mission {
  id: number;
  title: string;
  description: string;
  hint?: string;
  check: (state: SimulationState) => boolean;
}

export interface SimulationState {
  devices: Device[];
  connections: Connection[];
  packets: Packet[];
  selectedDeviceId: string | null;
  connectionMode: {
    active: boolean;
    sourceId: string | null;
  };
  isEncrypted: boolean;
  logs: string[];
}