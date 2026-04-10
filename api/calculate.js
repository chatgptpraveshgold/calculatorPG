// Global variables to persist cache across warm lambda invocations
let cachedRates = null;
let lastFetchTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache

module.exports = async (req, res) => {
  // Add CDN Caching: Cache gold rates globally for 1 minute, allow stale data for up to 10 mins
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=600');

  // Support both GET and POST for simplicity in the hybrid model
  const forceRefresh = req.method === 'POST' ? req.body.forceRefresh : req.query?.forceRefresh === 'true';
  const API_URL = process.env.GSCRIPT_URL;

  if (!API_URL) {
    console.error('GSCRIPT_URL is missing');
    return res.status(500).json({ error: 'Server configuration error: GSCRIPT_URL is missing.' });
  }

  try {
    let rates;
    const now = Date.now();

    // Cache logic
    if (cachedRates && (now - lastFetchTime < CACHE_DURATION) && !forceRefresh) {
      console.log('Using cached gold rates...');
      rates = cachedRates;
    } else {
      console.log(forceRefresh ? 'Force refreshing from Google Sheets...' : 'Cache expired. Fetching from Google Sheets...');
      const response = await fetch(API_URL, { cache: 'no-store' });
      
      if (!response.ok) {
        throw new Error(`Google Sheets responded with ${response.status}`);
      }
      
      const data = await response.json();
      rates = {
        date: data.date || null,
        rate22: Number(data.rate22),
        rate24: Number(data.rate24),
        rate18: Number(data.rate18),
      };

      if (!rates.rate22 || !rates.rate24 || !rates.rate18) {
        throw new Error('Incomplete data from Google Sheets');
      }

      // Update cache
      cachedRates = rates;
      lastFetchTime = now;
      console.log('Cache updated successfully');
    }

    // Just return the rates. Calculation will be done on the user's phone for 0ms speed.
    return res.status(200).json(rates);

  } catch (error) {
    console.error('Fetch Error:', error);
    return res.status(500).json({ error: 'Failed to fetch rates. Please try again later.' });
  }
};
