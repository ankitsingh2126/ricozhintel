// Tiny data-fetch hook. Returns { data, loading, error, refetch }.
// Used to keep pages simple and consistent.

import { useCallback, useEffect, useState } from 'react';

export const useFetch = (fetcher, deps = []) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const memoFetcher = useCallback(fetcher, deps);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await memoFetcher();
      setData(result);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [memoFetcher]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error, refetch: load };
};
