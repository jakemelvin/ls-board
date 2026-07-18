'use client';

import { useCallback, useEffect, useRef } from 'react';

/** Prevents an older async response from overwriting state owned by a newer request. */
export function useLatestRequest() {
  const latestRequestId = useRef(0);

  const beginRequest = useCallback(() => {
    latestRequestId.current += 1;
    return latestRequestId.current;
  }, []);

  const isLatestRequest = useCallback(
    (requestId: number) => latestRequestId.current === requestId,
    [],
  );

  useEffect(
    () => () => {
      latestRequestId.current += 1;
    },
    [],
  );

  return { beginRequest, isLatestRequest };
}
