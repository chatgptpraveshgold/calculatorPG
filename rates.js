// Vercel Serverless Function: api/rates.js
export default async function handler(request, response) {
  // SECURITY: Standard protection headers
  response.setHeader('X-Frame-Options', 'DENY');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  // REAL-TIME: Ensure rates are fresh (max 1 second old)
  response.setHeader('Cache-Control', 's-maxage=1, stale-while-revalidate=59');

  const gsheetUrl = process.env.GSHEET_WEB_APP_URL;

  if (!gsheetUrl || gsheetUrl.length < 20) {
    return response.status(400).json({ error: 'Google Sheet URL not configured in Vercel.' });
  }

  try {
    const gResponse = await fetch(gsheetUrl);
    if (!gResponse.ok) throw new Error('Google Sheet connection failed');
    const data = await gResponse.json();

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
    return response.status(500).json({ error: 'Real-time sync failed. Please check your Google Sheet.' });
  }
}
