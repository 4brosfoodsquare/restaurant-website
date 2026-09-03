import { useEffect } from 'react';

/**
 * Sets (and cleans up) a <meta name="robots"> tag for the current page.
 * Used by the admin shell to keep the dashboard out of search results —
 * the customer site has no need for this and never calls it.
 */
export function useRobotsMeta(content) {
  useEffect(() => {
    let tag = document.querySelector('meta[name="robots"]');
    const created = !tag;
    if (!tag) {
      tag = document.createElement('meta');
      tag.setAttribute('name', 'robots');
      document.head.appendChild(tag);
    }
    const previous = tag.getAttribute('content');
    tag.setAttribute('content', content);

    return () => {
      if (created) {
        tag.remove();
      } else if (previous !== null) {
        tag.setAttribute('content', previous);
      }
    };
  }, [content]);
}
