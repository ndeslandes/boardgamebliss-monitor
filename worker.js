const cron = require('node-cron');

const BASE = 'http://localhost:3000/api';

const STORES = ['boardgamebliss', '401games'];

async function fetchWithRetry(url) {
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      const res = await fetch(url, { method: 'POST' });
      return await res.json();
    } catch (err) {
      if (attempt < 5) {
        await new Promise(r => setTimeout(r, attempt * 3000));
      } else {
        throw err;
      }
    }
  }
}

async function pollStore(storeId) {
  const ts = new Date().toLocaleString();
  try {
    const data = await fetchWithRetry(`${BASE}/${storeId}/poll`);
    if (!data.ok) {
      console.error(`[worker ${ts}] [${storeId}] Poll error: ${data.error}`);
      return;
    }
    if (data.new > 0) {
      console.log(`[worker ${ts}] [${storeId}] NEW: ${data.new} new collection(s)! Total: ${data.total}`);
    } else {
      console.log(`[worker ${ts}] [${storeId}] No new collections. Total: ${data.total}`);
    }

    console.log(`[worker ${ts}] [${storeId}] Fetching product counts...`);
    const counts = await fetchWithRetry(`${BASE}/${storeId}/poll-counts`);
    console.log(`[worker ${ts}] [${storeId}] Product counts updated for ${counts.updated} collections.`);
  } catch (err) {
    console.error(`[worker ${ts}] [${storeId}] Poll failed: ${err.message}`);
  }
}

async function poll() {
  for (const storeId of STORES) {
    await pollStore(storeId);
  }
}

console.log('[worker] Started. Initial poll in 10s, then every hour.');
setTimeout(poll, 10000);
cron.schedule('0 * * * *', poll);
