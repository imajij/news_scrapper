import { createClient } from 'redis';

let client = null;
let attempted = false;

function isEnabled() {
  return !!process.env.REDIS_URL;
}

export async function getRedisClient() {
  if (!isEnabled()) return null;
  if (client) return client;
  if (attempted) return null; // prevent repeated attempts if failed
  attempted = true;

  try {
    client = createClient({
      url: process.env.REDIS_URL,
      // socket: { reconnectStrategy: (retries) => Math.min(retries * 50, 2000) }
    });
    client.on('error', (e) => console.error('[redis] error', e.message));
    await client.connect();
    console.log('[redis] connected');
    return client;
  } catch (e) {
    console.warn('[redis] disabled (failed to connect)', e.message);
    client = null;
    return null;
  }
}

export async function getCache(key) {
  const c = await getRedisClient();
  if (!c) return null;
  try {
    return await c.get(key);
  } catch {
    return null;
  }
}

export async function setCache(key, val, ttlSeconds = 900) {
  const c = await getRedisClient();
  if (!c) return null;
  try {
    await c.set(key, val, { EX: ttlSeconds });
    return true;
  } catch {
    return null;
  }
}

export async function closeRedis() {
  if (client) {
    try {
      await client.quit();
      console.log('[redis] closed');
    } catch {
      // ignore
    } finally {
      client = null;
    }
  }
}
