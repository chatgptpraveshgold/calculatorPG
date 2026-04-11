// Vercel Serverless Function: api/rates.js
export default async function handler(request, response) {
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Cache-Control', 's-maxage=1, stale-while-revalidate=59');

  const gsheetUrl = process.env.RATES_URL;
  if (!gsheetUrl) return response.status(400).json({ error: 'RATES_URL missing' });

  try {
    // Explicitly follow redirects and handle Google Web App behavior
    const gResponse = await fetch(gsheetUrl, { redirect: 'follow' });
    const text = await gResponse.text();
    
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      // If Google returns HTML (login page), this will catch it
      return response.status(500).json({ error: 'Google returned HTML. Check permissions (set to Anyone).', raw: text.substring(0, 100) });
    }

    const clean = (val) => {
      if (val === undefined || val === null) return 0;
      let c = val.toString().replace(/[^\d.]/g, '');
      return parseFloat(c) || 0;
    };

    const payload = {
      date: data.sheet_date || new Date().toLocaleDateString('en-IN'),
      time: data.sheet_time || new Date().toLocaleTimeString('en-IN'),
      rates: {
        rate_22k: clean(data.rate_22k),
        rate_24k: clean(data.rate_24k),
        rate_18k: clean(data.rate_18k)
      },
      debug_raw: data // Send raw data for debugging
    };

    return response.status(200).json(payload);
  } catch (error) {
    return response.status(500).json({ error: 'Sync Failed: ' + error.message });
  }
}
