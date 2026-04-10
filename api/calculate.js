const GST_RATE = 0.03;
const COIN_MAKING_RATE = 0.03;

const MAKING = {
  classic: { min: 0.09, max: 0.11 },
  antique: { min: 0.10, max: 0.13 },
  premium: { min: 0.13, max: 0.15 },
  italian: { min: 0.17, max: 0.19 },
};

// Global variables to persist cache across warm lambda invocations
let cachedRates = null;
let lastFetchTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { karat, weight, makingType, coinGrams, forceRefresh } = req.body;
  const API_URL = process.env.GSCRIPT_URL;

  if (!API_URL) {
    console.error('GSCRIPT_URL is missing');
    return res.status(500).json({ error: 'Server configuration error: GSCRIPT_URL is missing.' });
  }

  try {
    let rates;

    // Check cache: Use cache if it exists, is fresh, and refresh isn't forced
    const now = Date.now();
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

    let result = {
      date: rates.date,
      displayPrice: "",
    };

    if (karat === "24") {
      const grams = Number(coinGrams);
      if (grams) {
        const gold = grams * rates.rate24;
        const making = gold * COIN_MAKING_RATE;
        const subtotal = gold + making;
        const total = subtotal * (1 + GST_RATE);
        result.displayPrice = formatMoney(total);
      }
    } else if (karat === "22" || karat === "18") {
      const w = Number(weight);
      if (w && makingType && MAKING[makingType]) {
        const gramRate = (karat === "22") ? rates.rate22 : rates.rate18;
        const m = MAKING[makingType];
        
        const gold = w * gramRate;
        const low = (gold + gold * m.min) * (1 + GST_RATE);
        const high = (gold + gold * m.max) * (1 + GST_RATE);
        
        result.displayPrice = `${formatMoney(low)} – ${formatMoney(high)}`;
      }
    }

    return res.status(200).json(result);

  } catch (error) {
    console.error('Calculation Error:', error);
    return res.status(500).json({ error: 'Failed to calculate price. Please try again later.' });
  }
};

function formatMoney(n) {
  return "₹" + new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Math.round(n));
}
