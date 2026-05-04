const cron = require('node-cron');

const BASE = 'http://localhost:3000/api';

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

async function poll() {
  const ts = new Date().toLocaleString();
  try {
    const data = await fetchWithRetry(`${BASE}/poll`);
    if (!data.ok) {
      console.error(`[worker ${ts}] Poll error: ${data.error}`);
      return;
    }
    if (data.new > 0) {
      console.log(`[worker ${ts}] NEW: ${data.new} new collection(s)! Total: ${data.total}`);
    } else {
      console.log(`[worker ${ts}] No new collections. Total: ${data.total}`);
    }

    console.log(`[worker ${ts}] Fetching product counts...`);
    const counts = await fetchWithRetry(`${BASE}/poll-counts`);
    console.log(`[worker ${ts}] Product counts updated for ${counts.updated} collections.`);
  } catch (err) {
    console.error(`[worker ${ts}] Poll failed: ${err.message}`);
  }
}

console.log('[worker] Started. Initial poll in 10s, then every hour.');
setTimeout(poll, 10000);
cron.schedule('0 * * * *', poll);
