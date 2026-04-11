// Vercel Serverless Function: api/rates.js
export default async function handler(request, response) {
  response.setHeader('X-Frame-Options', 'DENY');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.setHeader('Cache-Control', 's-maxage=1, stale-while-revalidate=59');

  const gsheetUrl = process.env.RATES_URL;
  if (!gsheetUrl || gsheetUrl.length < 20) {
    return response.status(400).json({ error: 'RATES_URL not configured' });
  }

  try {
    const gResponse = await fetch(gsheetUrl);
    const data = await gResponse.json();

    // Cleaning function to handle commas, ₹, and spaces
    const clean = (val) => {
      if (!val) return 0;
      return parseFloat(val.toString().replace(/[^\d.]/g, '')) || 0;
    };

    return response.status(200).json({
      date: data.sheet_date || new Date().toLocaleDateString('en-IN'),
      time: data.sheet_time || new Date().toLocaleTimeString('en-IN'),
      rates: {
        rate_22k: clean(data.rate_22k),
        rate_24k: clean(data.rate_24k),
        rate_18k: clean(data.rate_18k)
      }
    });
  } catch (error) {
    return response.status(500).json({ error: 'Sync Failed' });
  }
}
