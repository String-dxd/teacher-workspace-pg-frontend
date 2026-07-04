import { describe, it, expect } from 'vitest';
import { RateLimitError, AppError } from './errors';

describe('RateLimitError', () => {
  it('is an instance of AppError with resultCode -429', () => {
    const err = new RateLimitError('Too many requests');
    expect(err).toBeInstanceOf(AppError);
    expect(err.resultCode).toBe(-429);
    expect(err.httpStatus).toBe(429);
    expect(err.name).toBe('RateLimitError');
    expect(err.message).toBe('Too many requests');
  });
});
