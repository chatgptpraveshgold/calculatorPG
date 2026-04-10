const GST_RATE = 0.03;
const COIN_MAKING_RATE = 0.03;

const MAKING = {
  classic: { min: 0.09, max: 0.11 },
  antique: { min: 0.10, max: 0.13 },
  premium: { min: 0.13, max: 0.15 },
  italian: { min: 0.17, max: 0.19 },
};

export default async function handler(req, res) {
  // Only allow POST requests for calculation
  if (req.method !== 'POST') {
    // If it's a GET, we might just want to return the date/status or an error
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { karat, weight, makingType, coinGrams } = req.body;
  const API_URL = process.env.GSCRIPT_URL;

  if (!API_URL) {
    return res.status(500).json({ error: 'Server configuration error (Missing API URL)' });
  }

  try {
    // 1. Fetch current rates from Google Sheet
    const response = await fetch(API_URL, { cache: 'no-store' });
    if (!response.ok) throw new Error('Failed to fetch rates from Google Sheets');
    const data = await response.json();

    const rates = {
      date: data.date || null,
      rate22: Number(data.rate22),
      rate24: Number(data.rate24),
      rate18: Number(data.rate18),
    };

    if (!rates.rate22 || !rates.rate24 || !rates.rate18) {
      throw new Error('Incomplete data from gold rates source');
    }

    let result = {
      date: rates.date,
      displayPrice: "",
    };

    // 2. Perform Calculations (Hiding logic from user)
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
}

function formatMoney(n) {
  return "₹" + new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Math.round(n));
}
