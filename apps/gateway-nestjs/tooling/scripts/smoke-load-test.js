const autocannon = require('autocannon');

// Configurable smoke test. Defaults:
// TARGET_URL: http://localhost:3000
// TARGET_PATH: /health
// CONNECTIONS: 3
// DURATION: 10 (seconds)
const run = async () => {
  const base = process.env.TARGET_URL || 'http://localhost:3000';
  const path = process.env.TARGET_PATH || '/health';
  const url = `${base.replace(/\/$/, '')}${path}`;
  const connections = Number(process.env.CONNECTIONS || 3);
  const duration = Number(process.env.DURATION || 10);

  console.log(`Running ${duration}s smoke test @ ${url} with ${connections} connections`);
  const instance = autocannon({ url, connections, duration });
  autocannon.track(instance, { renderProgressBar: true });
  instance.on('done', (res) => {
    console.log('Smoke test done');
    // print summary
    console.log(res);
    process.exit(0);
  });
};

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
