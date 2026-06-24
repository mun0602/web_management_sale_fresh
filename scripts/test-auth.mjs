import assert from 'node:assert/strict';
import test from 'node:test';

process.env.ADMIN_SESSION_SECRET = 'test-only-session-secret-with-at-least-32-bytes';

const { SESSION_TTL_SECONDS, signToken, verifyToken } = await import(
  '../src/lib/auth/token.ts'
);

const subject = { sub: 'admin-test-id', role: 'SUPER_ADMIN' };

test('accepts a valid signed session', () => {
  const token = signToken(subject, 1_000);
  assert.deepEqual(verifyToken(token, 1_001), {
    ...subject,
    iat: 1_000,
    exp: 1_000 + SESSION_TTL_SECONDS,
  });
});

test('rejects a forged signature and modified payload', () => {
  const token = signToken(subject, 1_000);
  const [header, body] = token.split('.');
  assert.equal(verifyToken(`${header}.${body}.forged`, 1_001), null);

  const modifiedBody = Buffer.from(
    JSON.stringify({ ...subject, role: 'READ_ONLY', iat: 1_000, exp: 2_000 }),
  ).toString('base64url');
  assert.equal(verifyToken(`${header}.${modifiedBody}.${token.split('.')[2]}`, 1_001), null);
});

test('rejects expired, malformed, and unexpected-algorithm tokens', () => {
  const token = signToken(subject, 1_000);
  assert.equal(verifyToken(token, 1_000 + SESSION_TTL_SECONDS), null);
  assert.equal(verifyToken('not-a-token', 1_001), null);

  const [, body, signature] = token.split('.');
  const noneHeader = Buffer.from(
    JSON.stringify({ alg: 'none', typ: 'JWT' }),
  ).toString('base64url');
  assert.equal(verifyToken(`${noneHeader}.${body}.${signature}`, 1_001), null);
});

test('fails closed when the session secret is absent or too short', () => {
  const configuredSecret = process.env.ADMIN_SESSION_SECRET;
  delete process.env.ADMIN_SESSION_SECRET;
  assert.throws(() => signToken(subject, 1_000), /at least 32 bytes/);
  assert.equal(verifyToken('anything', 1_001), null);

  process.env.ADMIN_SESSION_SECRET = 'short';
  assert.throws(() => signToken(subject, 1_000), /at least 32 bytes/);
  process.env.ADMIN_SESSION_SECRET = configuredSecret;
});
