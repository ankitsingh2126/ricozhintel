// Data-fetch hook.
//
// Returns { data, loading, error, refetch }.
//
// Race-safe: only the latest invocation of load/fetch is allowed to update state.
// Stale responses from prior fetches are ignored. The hook also drops late
// updates after the component unmounts.

import { useCallback, useEffect, useRef, useState } from 'react';

const areDepsEqual = (prevDeps, nextDeps) => {
  if (prevDeps === nextDeps) return true;
  if (!prevDeps || !nextDeps || prevDeps.length !== nextDeps.length) return false;
  for (let i = 0; i < prevDeps.length; i++) {
    if (!Object.is(prevDeps[i], nextDeps[i])) return false;
  }
  return true;
};

export const useFetch = (fetcher, deps = []) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [depKey, setDepKey] = useState(0);
  const [prevDeps, setPrevDeps] = useState(deps);

  const fetcherRef = useRef(fetcher);
  useEffect(() => {
    fetcherRef.current = fetcher;
  });

  const requestIdRef = useRef(0);
  const isMountedRef = useRef(true);

  if (!areDepsEqual(prevDeps, deps)) {
    setPrevDeps(deps);
    setDepKey((k) => k + 1);
    setLoading(true);
    setError(null);
  }

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const executeFetch = useCallback(async (isManual = false) => {
    const requestId = ++requestIdRef.current;
    if (isManual) {
      setLoading(true);
      setError(null);
    }

    try {
      const result = await fetcherRef.current();
      if (requestId !== requestIdRef.current || !isMountedRef.current) return;
      setData(result);
      setError(null);
      return result;
    } catch (err) {
      if (requestId !== requestIdRef.current || !isMountedRef.current) return;
      setError(err);
    } finally {
      if (requestId === requestIdRef.current && isMountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

  const refetch = useCallback(() => {
    return executeFetch(true);
  }, [executeFetch]);

  useEffect(() => {
    let ignore = false;
    const requestId = ++requestIdRef.current;

    (async () => {
      try {
        const result = await fetcherRef.current();
        if (ignore || requestId !== requestIdRef.current || !isMountedRef.current) return;
        setData(result);
        setError(null);
      } catch (err) {
        if (ignore || requestId !== requestIdRef.current || !isMountedRef.current) return;
        setError(err);
      } finally {
        if (!ignore && requestId === requestIdRef.current && isMountedRef.current) {
          setLoading(false);
        }
      }
    })();

    return () => {
      ignore = true;
    };
  }, [depKey]);

  return { data, loading, error, refetch };
};