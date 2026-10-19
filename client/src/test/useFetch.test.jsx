import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useFetch } from '../hooks/useFetch.js';

describe('useFetch hook', () => {
  it('automatically fetches data on mount and updates loading and data states', async () => {
    const fetcher = vi.fn().mockResolvedValue({ message: 'success' });
    const { result } = renderHook(() => useFetch(fetcher, []));

    expect(result.current.loading).toBe(true);
    expect(result.current.data).toBe(null);
    expect(result.current.error).toBe(null);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toEqual({ message: 'success' });
    expect(result.current.error).toBe(null);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('handles fetch errors cleanly', async () => {
    const errorObj = new Error('Network error');
    const fetcher = vi.fn().mockRejectedValue(errorObj);
    const { result } = renderHook(() => useFetch(fetcher, []));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toBe(null);
    expect(result.current.error).toBe(errorObj);
  });

  it('re-fetches when dependencies change', async () => {
    const fetcher = vi.fn().mockImplementation((id) => Promise.resolve({ id }));

    const { result, rerender } = renderHook(
      ({ id }) => useFetch(() => fetcher(id), [id]),
      { initialProps: { id: 1 } }
    );

    await waitFor(() => {
      expect(result.current.data).toEqual({ id: 1 });
    });

    rerender({ id: 2 });

    await waitFor(() => {
      expect(result.current.data).toEqual({ id: 2 });
    });

    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('supports manual refetch()', async () => {
    let count = 0;
    const fetcher = vi.fn().mockImplementation(() => Promise.resolve(++count));
    const { result } = renderHook(() => useFetch(fetcher, []));

    await waitFor(() => {
      expect(result.current.data).toBe(1);
    });

    await act(async () => {
      await result.current.refetch();
    });

    expect(result.current.data).toBe(2);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('enforces latest-request-wins and drops stale out-of-order responses', async () => {
    let resolveFirst;
    let resolveSecond;

    const firstPromise = new Promise((res) => { resolveFirst = res; });
    const secondPromise = new Promise((res) => { resolveSecond = res; });

    let callCount = 0;
    const fetcher = vi.fn().mockImplementation(() => {
      callCount++;
      return callCount === 1 ? firstPromise : secondPromise;
    });

    const { result, rerender } = renderHook(
      ({ query }) => useFetch(fetcher, [query]),
      { initialProps: { query: 'a' } }
    );

    // Trigger second request before first finishes
    rerender({ query: 'b' });

    // Complete the second request first
    await act(async () => {
      resolveSecond({ result: 'second' });
    });

    await waitFor(() => {
      expect(result.current.data).toEqual({ result: 'second' });
    });

    // Now resolve the older, slow first request
    await act(async () => {
      resolveFirst({ result: 'first' });
    });

    // The data should STILL be 'second', never overwritten by 'first'
    expect(result.current.data).toEqual({ result: 'second' });
  });

  it('drops updates after unmount without throwing errors', async () => {
    let resolveSlow;
    const slowPromise = new Promise((res) => { resolveSlow = res; });
    const fetcher = vi.fn().mockReturnValue(slowPromise);

    const { result, unmount } = renderHook(() => useFetch(fetcher, []));
    expect(result.current.loading).toBe(true);

    unmount();

    // Resolving after unmount
    await act(async () => {
      resolveSlow({ result: 'done' });
    });

    // Should not throw and state remains unchanged
    expect(result.current.data).toBe(null);
  });

  it('handles a manual-refetch race (drops slow manual refetch when a newer refetch resolves first)', async () => {
    let resolveFirst;
    let resolveSecond;
    const firstPromise = new Promise((res) => { resolveFirst = res; });
    const secondPromise = new Promise((res) => { resolveSecond = res; });

    let callCount = 0;
    const fetcher = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) return Promise.resolve({ v: 'initial' });
      if (callCount === 2) return firstPromise; // slow refetch
      return secondPromise; // fast refetch
    });

    const { result } = renderHook(() => useFetch(fetcher, []));

    await waitFor(() => {
      expect(result.current.data).toEqual({ v: 'initial' });
    });

    // Fire first manual refetch (slow)
    act(() => {
      result.current.refetch();
    });

    // Fire second manual refetch (fast)
    act(() => {
      result.current.refetch();
    });

    expect(result.current.loading).toBe(true);

    // Resolve second refetch first
    await act(async () => {
      resolveSecond({ v: 'second-refetch' });
    });

    await waitFor(() => {
      expect(result.current.data).toEqual({ v: 'second-refetch' });
      expect(result.current.loading).toBe(false);
    });

    // Now resolve the older slow refetch
    await act(async () => {
      resolveFirst({ v: 'first-refetch' });
    });

    // Data must remain second-refetch and loading false
    expect(result.current.data).toEqual({ v: 'second-refetch' });
    expect(result.current.loading).toBe(false);
  });

  it('drops a rejected request if a newer request has already succeeded', async () => {
    let rejectFirst;
    let resolveSecond;
    const firstPromise = new Promise((_, rej) => { rejectFirst = rej; });
    const secondPromise = new Promise((res) => { resolveSecond = res; });

    let callCount = 0;
    const fetcher = vi.fn().mockImplementation(() => {
      callCount++;
      return callCount === 1 ? firstPromise : secondPromise;
    });

    const { result, rerender } = renderHook(
      ({ param }) => useFetch(fetcher, [param]),
      { initialProps: { param: 'first' } }
    );

    // Trigger newer request before first finishes
    rerender({ param: 'second' });

    // Newer request succeeds first
    await act(async () => {
      resolveSecond({ status: 'success-second' });
    });

    await waitFor(() => {
      expect(result.current.data).toEqual({ status: 'success-second' });
      expect(result.current.error).toBe(null);
      expect(result.current.loading).toBe(false);
    });

    // Older request now rejects
    await act(async () => {
      rejectFirst(new Error('Old request failed'));
    });

    // Must NOT overwrite with error; success data and loading remain intact
    expect(result.current.data).toEqual({ status: 'success-second' });
    expect(result.current.error).toBe(null);
    expect(result.current.loading).toBe(false);
  });

  it('maintains loading state when dependencies change while a request is pending', async () => {
    let resolveFirst;
    let resolveSecond;
    const firstPromise = new Promise((res) => { resolveFirst = res; });
    const secondPromise = new Promise((res) => { resolveSecond = res; });

    let callCount = 0;
    const fetcher = vi.fn().mockImplementation(() => {
      callCount++;
      return callCount === 1 ? firstPromise : secondPromise;
    });

    const { result, rerender } = renderHook(
      ({ page }) => useFetch(fetcher, [page]),
      { initialProps: { page: 1 } }
    );

    expect(result.current.loading).toBe(true);

    // Change dependency while request 1 is still pending
    rerender({ page: 2 });
    expect(result.current.loading).toBe(true);

    // Resolve first request
    await act(async () => {
      resolveFirst({ page: 1 });
    });

    // Loading must still be true because request 2 is pending
    expect(result.current.loading).toBe(true);
    expect(result.current.data).toBe(null);

    // Resolve second request
    await act(async () => {
      resolveSecond({ page: 2 });
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.data).toEqual({ page: 2 });
    });
  });

  it('operates cleanly under React.StrictMode', async () => {
    let count = 0;
    const fetcher = vi.fn().mockImplementation(() => Promise.resolve({ count: ++count }));

    const { result } = renderHook(() => useFetch(fetcher, []), {
      wrapper: ({ children }) => <React.StrictMode>{children}</React.StrictMode>,
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toBeDefined();
    expect(result.current.error).toBe(null);
  });
});
