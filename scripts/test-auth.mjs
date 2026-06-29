import assert from 'node:assert/strict';
import test from 'node:test';

process.env.ADMIN_SESSION_SECRET = 'test-only-session-secret-with-at-least-32-bytes';

const { SESSION_TTL_SECONDS, signToken, verifyToken } = await import(
  '../src/lib/auth/token.ts'
);
const {
  signKeyboardToken,
  verifyKeyboardToken,
} = await import('../src/lib/auth/keyboard-token.ts');
const { redis } = await import('../src/lib/redis.ts');

const subject = { sub: 'admin-test-id', role: 'SUPER_ADMIN' };

test('accepts a valid signed session', async () => {
  const token = await signToken(subject, 1_000);
  assert.deepEqual(await verifyToken(token, 1_001), {
    ...subject,
    iat: 1_000,
    exp: 1_000 + SESSION_TTL_SECONDS,
  });
});

test('rejects a forged signature and modified payload', async () => {
  const token = await signToken(subject, 1_000);
  const [header, body] = token.split('.');
  assert.equal(await verifyToken(`${header}.${body}.forged`, 1_001), null);

  const modifiedBody = Buffer.from(
    JSON.stringify({ ...subject, role: 'READ_ONLY', iat: 1_000, exp: 2_000 }),
  ).toString('base64url');
  assert.equal(await verifyToken(`${header}.${modifiedBody}.${token.split('.')[2]}`, 1_001), null);
});

test('rejects expired, malformed, and unexpected-algorithm tokens', async () => {
  const token = await signToken(subject, 1_000);
  assert.equal(await verifyToken(token, 1_000 + SESSION_TTL_SECONDS), null);
  assert.equal(await verifyToken('not-a-token', 1_001), null);

  const [, body, signature] = token.split('.');
  const noneHeader = Buffer.from(
    JSON.stringify({ alg: 'none', typ: 'JWT' }),
  ).toString('base64url');
  assert.equal(await verifyToken(`${noneHeader}.${body}.${signature}`, 1_001), null);
});

test('fails closed when the session secret is absent or too short', async () => {
  const configuredSecret = process.env.ADMIN_SESSION_SECRET;
  delete process.env.ADMIN_SESSION_SECRET;
  await assert.rejects(async () => {
    await signToken(subject, 1_000);
  }, /at least 32 bytes/);
  assert.equal(await verifyToken('anything', 1_001), null);

  process.env.ADMIN_SESSION_SECRET = 'short';
  await assert.rejects(async () => {
    await signToken(subject, 1_000);
  }, /at least 32 bytes/);
  process.env.ADMIN_SESSION_SECRET = configuredSecret;
});

test('keyboard token requires matching active session sid and device', async () => {
  const payload = {
    sub: 'keyboard-user-id',
    role: 'USER',
    sid: 'session-1',
    did: 'device-1',
  };
  const token = await signKeyboardToken(payload, 60);

  const validSession = JSON.stringify({ sid: 'session-1', deviceId: 'device-1' });
  assert.equal(
    (await verifyKeyboardToken(token, { getActiveSession: async () => validSession }))?.sub,
    payload.sub,
  );

  assert.equal(
    await verifyKeyboardToken(token, {
      getActiveSession: async () => JSON.stringify({ sid: 'session-2', deviceId: 'device-1' }),
    }),
    null,
  );
  assert.equal(
    await verifyKeyboardToken(token, {
      getActiveSession: async () => JSON.stringify({ sid: 'session-1', deviceId: 'device-2' }),
    }),
    null,
  );
  assert.equal(await verifyKeyboardToken(token, { getActiveSession: async () => null }), null);
});

test.after(async () => {
  redis.disconnect();
});
