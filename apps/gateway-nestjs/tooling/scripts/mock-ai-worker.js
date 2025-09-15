const http = require('http');

const port = process.env.MOCK_AI_PORT || 8001;
const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/v1/stream') {
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
    });
    req.on('end', () => {
      const sid = req.headers['x-session-id'] || '';
      const body = {
        status: 'ok',
        partial: { text: 'xin chao (mock)' },
        final: { text: 'xin chao the gioi (mock)', words: [] },
        detections: [],
        bytes: size,
        sessionId: sid,
      };
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(body));
    });
  } else if (req.method === 'GET' && req.url === '/health') {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ status: 'ok' }));
  } else {
    res.statusCode = 404;
    res.end('not found');
  }
});

server.listen(port, () => {
  console.log(`[mock-ai] listening on :${port}`);
});
