// Summarizes a CDP Profiler CPU profile: self/inclusive time by function and by script file.
export const SAMPLING_INTERVAL_US = 100;
const TOP_ENTRIES = 25;

export interface ProfileNode {
  id: number;
  callFrame: { functionName: string; url: string; lineNumber: number; columnNumber: number };
  children?: number[];
}

export interface CpuProfile {
  nodes: ProfileNode[];
  samples: number[];
  timeDeltas: number[];
}

const IDLE_FUNCTIONS = new Set(['(idle)', '(program)', '(root)']);

function frameLabel(node: ProfileNode): string {
  const { functionName, url, lineNumber, columnNumber } = node.callFrame;
  const file = url ? url.split('/').slice(-2).join('/') : '(native)';
  return `${functionName || '(anonymous)'}  ${file}:${lineNumber + 1}:${columnNumber + 1}`;
}

export function summarizeProfile(profile: CpuProfile) {
  const byId = new Map(profile.nodes.map((node) => [node.id, node]));
  const selfUs = new Map<number, number>();

  profile.samples.forEach((nodeId, index) => {
    selfUs.set(nodeId, (selfUs.get(nodeId) || 0) + (profile.timeDeltas[index] || 0));
  });

  const inclusiveUs = new Map<number, number>();
  const total = (nodeId: number): number => {
    const cached = inclusiveUs.get(nodeId);
    if (cached !== undefined) return cached;
    const node = byId.get(nodeId)!;
    const value = (selfUs.get(nodeId) || 0) + (node.children || []).reduce((sum, child) => sum + total(child), 0);
    inclusiveUs.set(nodeId, value);
    return value;
  };
  profile.nodes.forEach((node) => total(node.id));

  const isWork = (node: ProfileNode) => !IDLE_FUNCTIONS.has(node.callFrame.functionName);
  const ms = (us: number) => Math.round(us / 100) / 10;

  const selfByFrame = new Map<string, number>();
  const selfByFile = new Map<string, number>();
  for (const node of profile.nodes) {
    const self = selfUs.get(node.id) || 0;
    if (!self || !isWork(node)) continue;
    selfByFrame.set(frameLabel(node), (selfByFrame.get(frameLabel(node)) || 0) + self);
    const file = node.callFrame.url ? node.callFrame.url.split('/').pop()! : '(native)';
    selfByFile.set(file, (selfByFile.get(file) || 0) + self);
  }

  const top = (map: Map<string, number>, limit: number) =>
    [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit).map(([label, us]) => `${String(ms(us)).padStart(8)} ms  ${label}`);

  const inclusive = profile.nodes
    .filter((node) => isWork(node) && node.callFrame.url)
    .map((node) => ({ label: frameLabel(node), us: inclusiveUs.get(node.id) || 0 }))
    .sort((a, b) => b.us - a.us)
    .slice(0, TOP_ENTRIES)
    .map(({ label, us }) => `${String(ms(us)).padStart(8)} ms  ${label}`);

  const busyUs = profile.nodes.filter(isWork).reduce((sum, node) => sum + (selfUs.get(node.id) || 0), 0);

  return { busyMs: ms(busyUs), selfByFile: top(selfByFile, 10), selfByFrame: top(selfByFrame, TOP_ENTRIES), inclusive };
}
