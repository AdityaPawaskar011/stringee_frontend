import { useSyncExternalStore } from 'react';
import { getBranding, subscribeBranding } from './branding';

/** The current client's branding (logo, names, colours); re-renders when it changes. */
export function useBranding() {
  return useSyncExternalStore(subscribeBranding, getBranding, getBranding);
}
