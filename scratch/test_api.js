async function test() {
    process.env.RATES_URL = 'https://script.google.com/macros/s/AKfycbxwLcOb1AeVbLdnaZ0OG6tncb91K5wCuneNk06fq_dQnAxlF4AYsbrq53mIGcO3lk27/exec';
    
    try {
        console.log('Fetching:', process.env.RATES_URL);
        const gResponse = await fetch(process.env.RATES_URL, { redirect: 'follow' });
        console.log('Response Status:', gResponse.status);
        if (gResponse.ok) {
            const data = await gResponse.json();
            console.log('Data:', JSON.stringify(data, null, 2));
        } else {
            const text = await gResponse.text();
            console.log('Response Error Text:', text);
        }
    } catch (e) {
        console.error('Error:', e);
    }
}

test();
