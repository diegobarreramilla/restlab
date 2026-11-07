const fs = require('fs');
const { ipcMain } = require('electron');

const RTF_UP = 0x1;
const IPV6_ANY_ADDRESS = '0'.repeat(32);

// /proc/net/route has a header line, then: Iface Destination Gateway Flags RefCnt Use Metric Mask ...
const hasIpv4DefaultRoute = (routeTable) => {
  return routeTable.split('\n').slice(1).some((line) => {
    const [, destination, , flags, , , , mask] = line.trim().split(/\s+/);
    return destination === '00000000' && mask === '00000000' && (parseInt(flags, 16) & RTF_UP) !== 0;
  });
};

// /proc/net/ipv6_route has no header: Destination PrefixLen Source SourcePrefixLen NextHop Metric RefCnt Use Flags Iface.
// The kernel also lists a reject route on `lo` for the default prefix, which is not a way out of the machine.
const hasIpv6DefaultRoute = (routeTable) => {
  return routeTable.split('\n').some((line) => {
    const [destination, prefixLength, , , , , , , flags, iface] = line.trim().split(/\s+/);
    return destination === IPV6_ANY_ADDRESS && prefixLength === '00' && iface !== 'lo' && (parseInt(flags, 16) & RTF_UP) !== 0;
  });
};

const readRouteTable = (filePath) => {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    return null;
  }
};

// Chromium's navigator.onLine counts any active interface, so Docker bridges and veth devices
// keep it true after the Wi-Fi is switched off. A default route is what reaches beyond the machine.
// Returns null where the route tables cannot be read (macOS, Windows), where navigator.onLine is reliable.
const hasDefaultRoute = () => {
  if (process.platform !== 'linux') {
    return null;
  }

  const ipv4Table = readRouteTable('/proc/net/route');
  const ipv6Table = readRouteTable('/proc/net/ipv6_route');

  if (ipv4Table === null && ipv6Table === null) {
    return null;
  }

  return (ipv4Table !== null && hasIpv4DefaultRoute(ipv4Table))
    || (ipv6Table !== null && hasIpv6DefaultRoute(ipv6Table));
};

const registerNetworkStatusIpc = () => {
  ipcMain.handle('renderer:get-has-default-route', () => hasDefaultRoute());
};

module.exports = registerNetworkStatusIpc;
module.exports.hasIpv4DefaultRoute = hasIpv4DefaultRoute;
module.exports.hasIpv6DefaultRoute = hasIpv6DefaultRoute;
module.exports.hasDefaultRoute = hasDefaultRoute;
