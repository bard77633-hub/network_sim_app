// Generate a random ID
export const generateId = () => Math.random().toString(36).substr(2, 9);

// Check if two devices are connected
export const isConnected = (connections, id1, id2) => {
  return connections.some(
    (c) => (c.from === id1 && c.to === id2) || (c.from === id2 && c.to === id1)
  );
};

// Breadth-First Search to find path between nodes
export const findPath = (
  devices,
  connections,
  startId,
  endId
) => {
  if (startId === endId) return [startId];

  const adjacencyList = {};
  
  // Build graph
  devices.forEach(d => adjacencyList[d.id] = []);
  connections.forEach(c => {
    if (adjacencyList[c.from]) adjacencyList[c.from].push(c.to);
    if (adjacencyList[c.to]) adjacencyList[c.to].push(c.from);
  });

  const queue = [[startId]];
  const visited = new Set();
  visited.add(startId);

  while (queue.length > 0) {
    const path = queue.shift();
    const node = path[path.length - 1];

    if (node === endId) {
      return path;
    }

    const neighbors = adjacencyList[node] || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        const newPath = [...path, neighbor];
        queue.push(newPath);
      }
    }
  }

  return null;
};

// Validate IP address format (Simple check)
export const isValidIP = (ip) => {
  if (!ip) return false;
  const parts = ip.split('.');
  if (parts.length !== 4) return false;
  return parts.every(part => {
    const num = parseInt(part, 10);
    return !isNaN(num) && num >= 0 && num <= 255;
  });
};

// Check if IP is in the same subnet (Assuming /24 for simplicity in high school context)
export const isInSameSubnet = (ip1, ip2) => {
  const parts1 = ip1.split('.');
  const parts2 = ip2.split('.');
  return parts1[0] === parts2[0] && parts1[1] === parts2[1] && parts1[2] === parts2[2];
};

// Check if IP is a Private IP address
// 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16
export const isPrivateIP = (ip) => {
  if (!isValidIP(ip)) return false;
  const parts = ip.split('.').map(Number);
  
  // 10.x.x.x
  if (parts[0] === 10) return true;
  
  // 172.16.x.x - 172.31.x.x
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
  
  // 192.168.x.x
  if (parts[0] === 192 && parts[1] === 168) return true;
  
  return false;
};