/**
 * Vercel Serverless Function: Superfast Secure Proxy
 * Optimized for Reliability: No more "Stuck Syncing"
 */
let cachedData = null;
let lastFetchTime = 0;
const INTERNAL_CACHE_DURATION = 30 * 1000; // 30 seconds for internal memory

module.exports = async (req, res) => {
  // 1. HIGH-SPEED CDN HEADERS
  // s-maxage=1: Vercel CDN caches for 1s
  // stale-while-revalidate: Serve old data instantly while fetching new data in background
  res.setHeader('Cache-Control', 'public, s-maxage=1, stale-while-revalidate=86400');
  res.setHeader('Access-Control-Allow-Origin', '*');

  const API_URL = process.env.GSCRIPT_URL;
  if (!API_URL) return res.status(500).json({ error: 'System Config Error: Missing URL' });

  // 2. HELPER: Fetch with Timeout
  async function fetchWithTimeout(url, timeout = 4000) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    try {
      const response = await fetch(url, { 
        signal: controller.signal,
        cache: 'no-store'
      });
      clearTimeout(id);
      return response;
    } catch (e) {
      clearTimeout(id);
      throw e;
    }
  }

  try {
    const now = Date.now();
    const forceRefresh = req.body?.forceRefresh || req.query?.forceRefresh === 'true';

    // 3. INSTANT CACHE FAILOVER
    // If we have data and it's fresh (and refresh not forced), return it immediately
    if (cachedData && (now - lastFetchTime < INTERNAL_CACHE_DURATION) && !forceRefresh) {
      console.log('Returning fresh memory cache');
      return res.status(200).json(cachedData);
    }

    // 4. ATTEMPT LIVE FETCH (with 4s safety timeout)
    try {
      console.log('Fetching live rates from Google...');
      const response = await fetchWithTimeout(API_URL);
      
      if (response.ok) {
        const data = await response.json();
        const freshRates = {
          date: data.date || null,
          rate22: Number(data.rate22),
          rate24: Number(data.rate24),
          rate18: Number(data.rate18)
        };

        if (freshRates.rate22 && freshRates.rate24) {
          cachedData = freshRates;
          lastFetchTime = now;
          console.log('Cache updated with live rates');
          return res.status(200).json(freshRates);
        }
      }
    } catch (fetchErr) {
      console.warn('Live fetch failed or timed out:', fetchErr.message);
    }

    // 5. EMERGENCY RECOVERY
    // If live fetch failed OR took too long, return whatever we have in memory
    if (cachedData) {
      console.log('Emergency Failover: Returning stale cache');
      return res.status(200).json(cachedData);
    }

    // 6. ABSOLUTE FALLBACK (Should only happen on 1st ever run with no internet)
    return res.status(500).json({ error: 'Google Sheets is currently unreachable. Please refresh.' });

  } catch (error) {
    console.error('Core Logic Error:', error);
    return res.status(500).json({ error: 'System Error. Please try again later.' });
  }
};
