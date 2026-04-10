/**
 * Vercel Serverless Function: Secure Proxy for Gold Rates
 * This function handles fetching from Google Sheets and caching at the Edge for maximum speed.
 */
let cachedRates = null;
let lastFetchTime = 0;
const CACHE_DURATION = 30 * 1000; // 30 Seconds for near-real-time accuracy

module.exports = async (req, res) => {
  // Global CDN Caching (Edge): Serve instant stale data while fetching new data in background
  res.setHeader('Cache-Control', 's-maxage=1, stale-while-revalidate');
  res.setHeader('Access-Control-Allow-Origin', '*');

  const API_URL = process.env.GSCRIPT_URL;
  if (!API_URL) return res.status(500).json({ error: 'GSCRIPT_URL missing' });

  try {
    const now = Date.now();
    // Check internal memory cache
    if (cachedRates && (now - lastFetchTime < CACHE_DURATION)) {
      return res.status(200).json(cachedRates);
    }

    // Fetch from Google Sheets
    const response = await fetch(API_URL, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Google responded with ${response.status}`);
    
    const data = await response.json();
    const rates = {
      date: data.date || null,
      rate22: Number(data.rate22),
      rate24: Number(data.rate24),
      rate18: Number(data.rate18),
    };

    if (!rates.rate22 || !rates.rate24 || !rates.rate18) throw new Error('Incomplete data');

    // Update internal cache
    cachedRates = rates;
    lastFetchTime = now;

    return res.status(200).json(rates);
  } catch (error) {
    console.error('Fetch Error:', error);
    // If fetch fails, try to return expired cache as fallback
    if (cachedRates) return res.status(200).json(cachedRates);
    return res.status(500).json({ error: 'Failed to sync gold rates' });
  }
};
