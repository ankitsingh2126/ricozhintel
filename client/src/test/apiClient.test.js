import { describe, it, expect } from 'vitest';
import { resolveApiBaseUrl } from '../services/apiClient.js';

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
