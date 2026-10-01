import { createClient, type RedisClientType } from 'redis';
import { RateLimiter } from './rate-limit.js';

export class RedisRateLimiter {
  private client?: RedisClientType;
  private connecting?: Promise<void>;
  private readonly fallback: RateLimiter;

  constructor(
    private readonly url: string,
    private readonly limit = 100,
    private readonly windowMs = 60_000
  ) {
    this.fallback = new RateLimiter(limit, windowMs);
  }

  private async connect() {
    if (this.client?.isReady) return;
    if (this.connecting) return this.connecting;
    this.client = createClient({ url: this.url });
    this.client.on('error', () => {});
    this.connecting = this.client.connect().then(() => undefined).finally(() => { this.connecting = undefined; });
    await this.connecting;
  }

  async allow(key: string, limit = this.limit) {
    try {
      await this.connect();
      const bucket = 'desktop-mcp:rate:' + key;
      const count = await this.client!.incr(bucket);
      if (count === 1) await this.client!.pExpire(bucket, this.windowMs);
      return count <= Math.max(1, limit);
    } catch {
      return this.fallback.allow(key);
    }
  }
}
