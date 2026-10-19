import { describe, it, expect, beforeEach } from 'vitest';
import { resolveApiBaseUrl, apiClient } from '../services/apiClient.js';

describe('resolveApiBaseUrl', () => {
  it('uses VITE_API_URL when provided with /api/v1', () => {
    const env = { VITE_API_URL: 'https://ricozhintel-api.onrender.com/api/v1' };
    expect(resolveApiBaseUrl(env)).toBe('https://ricozhintel-api.onrender.com/api/v1');
  });

  it('appends /api/v1 if VITE_API_URL does not include /api/v1', () => {
    const env = { VITE_API_URL: 'https://ricozhintel-api.onrender.com' };
    expect(resolveApiBaseUrl(env)).toBe('https://ricozhintel-api.onrender.com/api/v1');
  });

  it('normalizes trailing slashes on VITE_API_URL', () => {
    const env = { VITE_API_URL: 'https://ricozhintel-api.onrender.com/' };
    expect(resolveApiBaseUrl(env)).toBe('https://ricozhintel-api.onrender.com/api/v1');

    const envWithSubpath = { VITE_API_URL: 'https://ricozhintel-api.onrender.com/api/v1/' };
    expect(resolveApiBaseUrl(envWithSubpath)).toBe('https://ricozhintel-api.onrender.com/api/v1');
  });

  it('falls back to VITE_API_BASE_URL if VITE_API_URL is unset', () => {
    const env = { VITE_API_BASE_URL: 'https://custom-api.example.com/api/v1' };
    expect(resolveApiBaseUrl(env)).toBe('https://custom-api.example.com/api/v1');
  });

  it('defaults to production Render API when PROD is true and no env var is set', () => {
    const env = { PROD: true };
    expect(resolveApiBaseUrl(env)).toBe('https://ricozhintel-api.onrender.com/api/v1');
  });

  it('defaults to localhost:5000/api/v1 when in development and no env var is set', () => {
    const env = { PROD: false };
    expect(resolveApiBaseUrl(env)).toBe('http://localhost:5000/api/v1');
  });
});

describe('apiClient request interceptor', () => {
  const requestInterceptor = apiClient.interceptors.request.handlers[0];

  beforeEach(() => {
    localStorage.clear();
  });

  it('attaches Authorization Bearer token when a token exists in localStorage', () => {
    localStorage.setItem('ricozhintel_token', 'jwt-test-token-123');
    const config = { headers: {} };
    const result = requestInterceptor.fulfilled(config);
    expect(result.headers.Authorization).toBe('Bearer jwt-test-token-123');
  });

  it('does not attach Authorization header when logged out or token is missing', () => {
    const config = { headers: {} };
    const result = requestInterceptor.fulfilled(config);
    expect(result.headers.Authorization).toBeUndefined();
  });

  it('rejects with error when request interceptor rejected handler is called', async () => {
    const requestError = new Error('Request config error');
    await expect(requestInterceptor.rejected(requestError)).rejects.toThrow('Request config error');
  });
});

describe('apiClient response interceptor', () => {
  const responseInterceptor = apiClient.interceptors.response.handlers[0];

  it('returns response unchanged when request succeeds', () => {
    const mockResponse = { status: 200, data: { success: true, data: [] } };
    const result = responseInterceptor.fulfilled(mockResponse);
    expect(result).toBe(mockResponse);
  });

  it('transforms backend structured error into Error object with status, code, and details', async () => {
    const backendError = {
      response: {
        status: 422,
        data: {
          error: {
            message: 'Validation failed for KPI',
            code: 'VALIDATION_ERROR',
            details: [
              { field: 'code', message: 'Code must be unique' },
              { field: 'target', message: 'Target must be positive' },
            ],
          },
        },
      },
    };

    let caughtError;
    try {
      await responseInterceptor.rejected(backendError);
    } catch (err) {
      caughtError = err;
    }

    expect(caughtError).toBeInstanceOf(Error);
    expect(caughtError.message).toBe('Validation failed for KPI');
    expect(caughtError.status).toBe(422);
    expect(caughtError.code).toBe('VALIDATION_ERROR');
    expect(caughtError.details).toEqual([
      { field: 'code', message: 'Code must be unique' },
      { field: 'target', message: 'Target must be positive' },
    ]);
  });

  it('falls back to error.message when backend structured error message is missing', async () => {
    const genericError = {
      message: 'Network Timeout',
      response: {
        status: 504,
        data: {},
      },
    };

    let caughtError;
    try {
      await responseInterceptor.rejected(genericError);
    } catch (err) {
      caughtError = err;
    }

    expect(caughtError).toBeInstanceOf(Error);
    expect(caughtError.message).toBe('Network Timeout');
    expect(caughtError.status).toBe(504);
    expect(caughtError.code).toBeUndefined();
    expect(caughtError.details).toBeUndefined();
  });

  it('falls back to "Request failed" when neither backend message nor error.message are provided', async () => {
    const emptyError = {
      response: {
        status: 500,
        data: null,
      },
    };

    let caughtError;
    try {
      await responseInterceptor.rejected(emptyError);
    } catch (err) {
      caughtError = err;
    }

    expect(caughtError).toBeInstanceOf(Error);
    expect(caughtError.message).toBe('Request failed');
    expect(caughtError.status).toBe(500);
  });

  it('handles network failure safely when response object is undefined', async () => {
    const networkError = {
      message: 'Network Error',
    };

    let caughtError;
    try {
      await responseInterceptor.rejected(networkError);
    } catch (err) {
      caughtError = err;
    }

    expect(caughtError).toBeInstanceOf(Error);
    expect(caughtError.message).toBe('Network Error');
    expect(caughtError.status).toBeUndefined();
    expect(caughtError.code).toBeUndefined();
    expect(caughtError.details).toBeUndefined();
  });
});
