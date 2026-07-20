import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  AppError,
  AuthError,
  NotFoundError,
  RateLimitError,
  ValidationError,
} from './errors.js';

describe('errors', () => {
  it('AppError preserva status e code', () => {
    const err = new AppError('Falha', 503, 'SERVICE');
    assert.equal(err.message, 'Falha');
    assert.equal(err.statusCode, 503);
    assert.equal(err.code, 'SERVICE');
  });

  it('ValidationError usa 400', () => {
    const err = new ValidationError('Campo inválido');
    assert.equal(err.statusCode, 400);
    assert.equal(err.code, 'VALIDATION_ERROR');
  });

  it('NotFoundError usa 404', () => {
    const err = new NotFoundError('Não encontrado');
    assert.equal(err.statusCode, 404);
  });

  it('AuthError aceita 401 e 403', () => {
    assert.equal(new AuthError('Token').statusCode, 401);
    assert.equal(new AuthError('Permissão', 403).statusCode, 403);
  });

  it('RateLimitError usa 429', () => {
    const err = new RateLimitError();
    assert.equal(err.statusCode, 429);
    assert.equal(err.code, 'RATE_LIMIT');
  });
});
