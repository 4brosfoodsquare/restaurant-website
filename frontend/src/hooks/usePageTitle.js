import { useEffect } from 'react';

const SITE_NAME = '4 Bros Food Square';

export function usePageTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} | ${SITE_NAME}` : `${SITE_NAME} — Biriyani, Kabab & Chilli Chicken`;
  }, [title]);
}
