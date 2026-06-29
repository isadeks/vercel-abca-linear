import { describe, it, expect } from 'vitest';
import { greet } from '../lib/greet.js';

describe('greet', () => {
  it("returns 'Hello, A' for input 'A'", () => {
    expect(greet('A')).toBe('Hello, A');
  });
});
