jest.mock('electron', () => ({
  ipcMain: { handle: jest.fn() }
}));

const { hasIpv4DefaultRoute, hasIpv6DefaultRoute } = require('./network-status');

const IPV4_HEADER = 'Iface\tDestination\tGateway \tFlags\tRefCnt\tUse\tMetric\tMask\t\tMTU\tWindow\tIRTT';
const ipv4Table = (...rows) => [IPV4_HEADER, ...rows].join('\n');

const WIFI_DEFAULT = 'wlan0\t00000000\t0156A8C0\t0003\t0\t0\t600\t00000000\t0\t0\t0';
const DOCKER_BRIDGE = 'br-97727c74c4ee\t000012AC\t00000000\t0001\t0\t0\t0\t0000FFFF\t0\t0\t0';
const WIFI_SUBNET = 'wlan0\t0056A8C0\t00000000\t0001\t0\t0\t600\t00FFFFFF\t0\t0\t0';

describe('hasIpv4DefaultRoute', () => {
  it('is true when a default route is up', () => {
    expect(hasIpv4DefaultRoute(ipv4Table(WIFI_DEFAULT, DOCKER_BRIDGE, WIFI_SUBNET))).toBe(true);
  });

  it('is false with only Docker bridges and a local subnet, which is what an unplugged Wi-Fi leaves', () => {
    expect(hasIpv4DefaultRoute(ipv4Table(DOCKER_BRIDGE, WIFI_SUBNET))).toBe(false);
  });

  it('is false for an empty table or just the header', () => {
    expect(hasIpv4DefaultRoute('')).toBe(false);
    expect(hasIpv4DefaultRoute(ipv4Table())).toBe(false);
  });

  it('ignores a default route that is not marked up', () => {
    expect(hasIpv4DefaultRoute(ipv4Table('wlan0\t00000000\t0156A8C0\t0002\t0\t0\t600\t00000000\t0\t0\t0'))).toBe(false);
  });
});

const IPV6_DEFAULT = '00000000000000000000000000000000 00 00000000000000000000000000000000 00 fe80000000000000ac99f503c7907474 00000064 00000001 00000000 00000003 wlan0';
const IPV6_LOOPBACK_REJECT = '00000000000000000000000000000000 00 00000000000000000000000000000000 00 00000000000000000000000000000000 ffffffff 00000001 00000000 00200200 lo';
const IPV6_LINK_LOCAL = 'fe800000000000000000000000000000 40 00000000000000000000000000000000 00 00000000000000000000000000000000 00000100 00000001 00000000 00000001 wlan0';

describe('hasIpv6DefaultRoute', () => {
  it('is true when a default route goes out through a real interface', () => {
    expect(hasIpv6DefaultRoute([IPV6_LINK_LOCAL, IPV6_DEFAULT].join('\n'))).toBe(true);
  });

  it('is false with only link-local routes and the loopback reject route', () => {
    expect(hasIpv6DefaultRoute([IPV6_LINK_LOCAL, IPV6_LOOPBACK_REJECT].join('\n'))).toBe(false);
  });

  it('is false for an empty table', () => {
    expect(hasIpv6DefaultRoute('')).toBe(false);
  });
});
