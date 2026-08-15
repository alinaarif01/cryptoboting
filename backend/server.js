const http = require('http');
const express = require('express');
const cors = require('cors');
const WebSocket = require('ws');
const path = require('path');

const apiRouter = require('./src/routes/api');
const botManager = require('./src/engine/botManager');
const { fetchLiveTickers } = require('./src/services/marketData');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// API Routes
app.use('/api', apiRouter);

// Serve frontend static assets if built/placed here
app.use(express.static(path.join(__dirname, '../frontend')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Create HTTP server
const server = http.createServer(app);

// Create WebSocket server
const wss = new WebSocket.Server({ server });

function broadcast(data) {
  const jsonStr = JSON.stringify(data);
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(jsonStr);
    }
  });
}

// Hook bot manager broadcasts to WebSocket
botManager.setBroadcastCallback((event) => {
  broadcast(event);
});

wss.on('connection', (ws) => {
  console.log('[WebSocket] Client connected');

  // Send initial state snapshot to newly connected client
  ws.send(JSON.stringify({
    type: 'INIT_STATE',
    data: botManager.getState()
  }));

  ws.on('message', (message) => {
    try {
      const parsed = JSON.parse(message);
      if (parsed.action === 'PING') {
        ws.send(JSON.stringify({ type: 'PONG' }));
      }
    } catch (e) {
      console.error('[WebSocket] Message parsing error:', e.message);
    }
  });

  ws.on('close', () => {
    console.log('[WebSocket] Client disconnected');
  });
});

// Interval to broadcast live ticker updates to all WS clients every 3 seconds
setInterval(async () => {
  try {
    const tickers = await fetchLiveTickers();
    broadcast({
      type: 'TICKERS_UPDATE',
      data: tickers
    });
  } catch (err) {
    console.error('[Server] Tickers broadcast error:', err.message);
  }
}, 3000);

server.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🚀 Crypto Trading Bot Backend running on port ${PORT}`);
  console.log(`📡 REST API: http://localhost:${PORT}/api/status`);
  console.log(`⚡ WebSocket Stream: ws://localhost:${PORT}`);
  console.log(`====================================================`);
});

module.exports = app;

