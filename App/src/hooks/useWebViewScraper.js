// hooks/useWebViewScraper.js
import { useRef, useState, useCallback } from 'react';

// JS injected into the WebView to extract all listing data
const INJECTED_JS = `
(function() {
  try {
    // 1. __NEXT_DATA__ (Zillow, Realtor.com)
    const nextEl = document.getElementById('__NEXT_DATA__');
    const nextData = nextEl ? nextEl.textContent : null;

    // 2. All JSON-LD scripts
    const jsonLdScripts = Array.from(
      document.querySelectorAll('script[type="application/ld+json"]')
    ).map(s => s.textContent);

    // 3. Meta tags
    const getMeta = (name) => {
      const el = document.querySelector('meta[property="' + name + '"]') ||
                 document.querySelector('meta[name="' + name + '"]');
      return el ? el.getAttribute('content') : '';
    };

    // 4. Images from page
    const images = Array.from(document.querySelectorAll('img[src]'))
      .map(img => img.src)
      .filter(src => src.startsWith('http') && !src.includes('logo') && 
                     !src.includes('icon') && src.match(/\.(jpg|jpeg|png|webp)/i))
      .slice(0, 9);

    window.ReactNativeWebView.postMessage(JSON.stringify({
      nextData,
      jsonLdScripts,
      title:         document.title,
      ogTitle:       getMeta('og:title'),
      ogDescription: getMeta('og:description'),
      ogImage:       getMeta('og:image'),
      images,
      url:           window.location.href,
    }));
  } catch(e) {
    window.ReactNativeWebView.postMessage(JSON.stringify({ error: e.message }));
  }
})();
true;
`;

export const useWebViewScraper = () => {
  const webViewRef = useRef(null);
  const [scrapeUrl,  setScrapeUrl]  = useState(null);
  const [scraping,   setScraping]   = useState(false);
  const resolveRef = useRef(null);
  const rejectRef  = useRef(null);

  // Call this to trigger a scrape — returns a Promise
  const scrapeUrl_fn = useCallback((url) => {
    return new Promise((resolve, reject) => {
      resolveRef.current = resolve;
      rejectRef.current  = reject;
      setScrapeUrl(url);
      setScraping(true);

      // Timeout after 20 seconds
      setTimeout(() => {
        if (rejectRef.current) {
          rejectRef.current(new Error('WebView scrape timed out'));
          setScraping(false);
          setScrapeUrl(null);
        }
      }, 20000);
    });
  }, []);

  // Called when WebView finishes loading
  const onLoadEnd = useCallback(() => {
    setTimeout(() => {
      webViewRef.current?.injectJavaScript(INJECTED_JS);
    }, 2000); // Wait 2s for JS-rendered content
  }, []);

  // Called when WebView sends data back
  const onMessage = useCallback((event) => {
    setScraping(false);
    setScrapeUrl(null);

    try {
      const raw = JSON.parse(event.nativeEvent.data);
      if (raw.error) {
        rejectRef.current?.(new Error(raw.error));
        return;
      }
      resolveRef.current?.(raw);
      resolveRef.current = null;
      rejectRef.current  = null;
    } catch (e) {
      rejectRef.current?.(e);
    }
  }, []);

  return {
    webViewRef,
    scrapeUrl,
    scraping,
    scrape: scrapeUrl_fn,
    onLoadEnd,
    onMessage,
  };
};
