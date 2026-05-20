/* eslint-disable no-console */
const axios = require('axios');

const API_BASE = process.env.SMOKE_API_BASE || 'http://localhost:4000';
const OWNER_EMAIL = process.env.SMOKE_OWNER_EMAIL;
const OWNER_PASSWORD = process.env.SMOKE_OWNER_PASSWORD;
const AUTO_PROVISION = String(process.env.SMOKE_AUTO_PROVISION || '1') !== '0';

function must(name, value) {
  if (!value) throw new Error(`${name} is required`);
  return value;
}

async function run() {
  let email = OWNER_EMAIL;
  let password = OWNER_PASSWORD;

  const client = axios.create({
    baseURL: API_BASE,
    timeout: 10000,
  });

  const checks = [];

  const health = await client.get('/health');
  checks.push({ name: 'GET /health', ok: health.status === 200 });

  const ready = await client.get('/ready');
  checks.push({ name: 'GET /ready', ok: ready.status === 200 });

  if ((!email || !password) && AUTO_PROVISION) {
    const nonce = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
    email = `smoke-owner-${nonce}@example.com`;
    password = `Smoke-${nonce}-A!`;

    const registered = await client.post('/api/auth/register', {
      email,
      password,
      name: `Smoke Owner ${nonce}`,
      role: 'owner',
    });
    checks.push({ name: 'POST /api/auth/register (auto)', ok: registered.status === 201 });
  }

  email = must('SMOKE_OWNER_EMAIL', email);
  password = must('SMOKE_OWNER_PASSWORD', password);

  const login = await client.post('/api/auth/login', { email, password });
  const token = login.data?.token;
  const refreshToken = login.data?.refresh_token;
  checks.push({ name: 'POST /api/auth/login', ok: Boolean(token && refreshToken) });

  client.defaults.headers.common.Authorization = `Bearer ${token}`;

  const securityStatus = await client.get('/api/auth/security/status');
  checks.push({ name: 'GET /api/auth/security/status', ok: securityStatus.status === 200 });

  const tickets = await client.get('/api/auth/security/tickets?limit=5');
  checks.push({ name: 'GET /api/auth/security/tickets', ok: tickets.status === 200 });

  const refreshed = await client.post('/api/auth/refresh', { refresh_token: refreshToken });
  checks.push({ name: 'POST /api/auth/refresh', ok: Boolean(refreshed.data?.token && refreshed.data?.refresh_token) });

  await client.post('/api/auth/logout', { refresh_token: refreshed.data.refresh_token });
  checks.push({ name: 'POST /api/auth/logout', ok: true });

  const failed = checks.filter((c) => !c.ok);
  console.table(checks);

  if (failed.length) {
    throw new Error(`Smoke tests failed: ${failed.map((f) => f.name).join(', ')}`);
  }

  console.log('Smoke tests passed.');
}

run().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
