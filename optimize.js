const sharp = require('sharp');
const fs = require('fs');

async function processImage() {
  const meta = await sharp('Logo.png').metadata();
  console.log(`Dimensions: ${meta.width}x${meta.height}`);
  
  await sharp('Logo.png')
    .webp({ quality: 80 })
    .toFile('Logo.webp');
    
  console.log('Successfully created Logo.webp');
}

processImage().catch(console.error);
