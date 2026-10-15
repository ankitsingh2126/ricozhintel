// Data-fetch hook.
//
// Returns { data, loading, error, refetch }.
//
// Race-safe: only the latest invocation of `load()` is allowed to update state.
// Stale responses from prior fetches are ignored. The hook also ignores late
// updates after the component unmounts, so React does not warn about setting
// state on an unmounted component.

import { useCallback, useEffect, useRef, useState } from 'react';

export const useFetch = (fetcher, deps = []) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Monotonic request id. Every `load()` bumps it; older responses are ignored.
  const requestIdRef = useRef(0);

  // Track whether the component is still mounted, so late responses are dropped.
  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const memoFetcher = useCallback(fetcher, deps);

  const load = useCallback(async () => {
    const requestId = ++requestIdRef.current;

    setLoading(true);
    setError(null);

    try {
      const result = await memoFetcher();
      if (requestId !== requestIdRef.current || !isMountedRef.current) return;
      setData(result);
    } catch (err) {
      if (requestId !== requestIdRef.current || !isMountedRef.current) return;
      setError(err);
    } finally {
      if (requestId === requestIdRef.current && isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [memoFetcher]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error, refetch: load };
};