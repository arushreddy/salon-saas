// src/utils/keepAlive.js
// Pings the backend every 10 minutes to prevent Render free tier cold starts

const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const PING_INTERVAL = 10 * 60 * 1000; // 10 minutes

let intervalId = null;

export function startKeepAlive() {
  if (intervalId) return; // already running

  const ping = async () => {
    try {
      await fetch(`${BACKEND_URL}/health`, { method: 'GET' });
    } catch (_) {
      // silently ignore — server might be waking up
    }
  };

  // Ping immediately on start
  ping();

  // Then every 10 minutes
  intervalId = setInterval(ping, PING_INTERVAL);
}

export function stopKeepAlive() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
}