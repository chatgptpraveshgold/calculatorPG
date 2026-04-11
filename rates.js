// Vercel Serverless Function: api/rates.js
export default async function handler(request, response) {
  // 1. SECURITY: Add basic headers to prevent clickjacking and sniffing
  response.setHeader('X-Frame-Options', 'DENY');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  const gsheetUrl = process.env.GSHEET_WEB_APP_URL;
  
  try {
    // 2. Fetch live data from the private environment variable
    if (!gsheetUrl || gsheetUrl.includes('xxxxxxxxxxxx') || gsheetUrl.length < 20) {
      return response.status(200).json({
        date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }),
        time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
        rates: { rate_22k: 6500, rate_24k: 7100, rate_18k: 5300 },
        isLive: false
      });
    }

    const gResponse = await fetch(gsheetUrl);
    if (!gResponse.ok) throw new Error('Fetch failed');
    const data = await gResponse.json();

    // 3. SECURITY: Your Google Sheet URL is NEVER returned to the client
    return response.status(200).json({
      date: data.sheet_date || new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }),
      time: data.sheet_time || new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
      rates: {
        rate_22k: Number(data.rate_22k),
        rate_24k: Number(data.rate_24k),
        rate_18k: Number(data.rate_18k)
      }
    });
  } catch (error) {
    console.error('API Error:', error);
    return response.status(500).json({ error: 'Internal Server Error' });
  }
}
