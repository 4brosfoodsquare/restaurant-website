import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../lib/apiClient.js';

/**
 * Minimal data-fetching hook: GET `path`, expose { data, status, error, refetch }.
 * `deps` re-runs the fetch (e.g. when a filter query string changes).
 */
export function useApiQuery(path, deps = []) {
  const [data, setData] = useState(null);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);
  const requestId = useRef(0);

  const run = useCallback(() => {
    const id = ++requestId.current;
    setStatus('loading');
    api
      .get(path)
      .then((result) => {
        if (id !== requestId.current) return;
        setData(result);
        setStatus('success');
      })
      .catch((err) => {
        if (id !== requestId.current) return;
        setError(err);
        setStatus('error');
      });
  }, [path]);

  useEffect(() => {
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, status, error, refetch: run };
}
