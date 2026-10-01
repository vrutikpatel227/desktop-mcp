export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

const CRITICAL = ['format-volume', 'diskpart', 'mimikatz', 'credential', 'disable-defender'];
const HIGH = ['remove-item', 'del /s', 'rmdir /s', 'git reset --hard', 'reg delete'];
const MEDIUM = ['npm install', 'npm run build', 'git pull', 'git checkout', 'service restart'];

export function classifyCommand(command: string): RiskLevel {
  const value = command.toLowerCase();
  if (CRITICAL.some(term => value.includes(term))) return 'critical';
  if (HIGH.some(term => value.includes(term))) return 'high';
  if (MEDIUM.some(term => value.includes(term))) return 'medium';
  return 'low';
}
