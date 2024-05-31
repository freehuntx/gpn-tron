import { useEffect, useRef } from 'react';

export function useOnMount(callback) {
  const hasRunRef = useRef(false);

  useEffect(() => {
    let cleanup;
    if (!hasRunRef.current) {
      cleanup = callback;
      hasRunRef.current = true;
    }
    return cleanup;
  }, [callback]);
}
