import { describe, it, expect } from 'vitest';
import { sign, verify, ACCESS_TTL } from '../../api/_lib/auth/jwt.js';

const SECRET = 'test-secret-32-chars-long-enough!!';

describe('jwt', () => {
  it('signs and verifies a token', () => {
    const token = sign({ sub: 'u1', roles: ['user'] }, SECRET);
    const claims = verify(token, SECRET);
    expect(claims.sub).toBe('u1');
    expect(claims.roles).toEqual(['user']);
  });

  it('rejects a tampered token', () => {
    const token = sign({ sub: 'u1' }, SECRET);
    const [h, b, s] = token.split('.');
    const tampered = `${h}.${b}.${s}x`;
    expect(() => verify(tampered, SECRET)).toThrow('Invalid token signature');
  });

  it('rejects an expired token', () => {
    const token = sign({ sub: 'u1' }, SECRET, -1);
    expect(() => verify(token, SECRET)).toThrow('Token expired');
  });

  it('rejects a token signed with the wrong secret', () => {
    const token = sign({ sub: 'u1' }, SECRET);
    expect(() => verify(token, 'other-secret')).toThrow('Invalid token signature');
  });

  it('embeds iat and exp claims', () => {
    const before = Math.floor(Date.now() / 1000);
    const token = sign({ sub: 'u1' }, SECRET, ACCESS_TTL);
    const claims = verify(token, SECRET);
    expect(claims.iat).toBeGreaterThanOrEqual(before);
    expect(claims.exp).toBeGreaterThanOrEqual(before + ACCESS_TTL);
  });
});
