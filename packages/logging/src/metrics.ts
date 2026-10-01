const counters = new Map<string, number>();
const durations: number[] = [];

export function increment(name: string, value = 1) {
  counters.set(name, (counters.get(name) ?? 0) + value);
}

export function observeDuration(ms: number) {
  durations.push(ms);
  if (durations.length > 1000) durations.shift();
}

export function snapshot() {
  const result: Record<string, number> = {};
  for (const [key, value] of counters) result[key] = value;
  result.execution_duration_avg_ms = durations.length ? Math.round(durations.reduce((a,b) => a+b, 0) / durations.length) : 0;
  return result;
}

export function prometheus() {
  return Object.entries(snapshot()).map(([key,value]) => key + ' ' + value).join('\n') + '\n';
}
