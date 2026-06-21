const fs = require('fs');

const index = fs.readFileSync('index.html', 'utf8');
const css = fs.readFileSync('styles.css', 'utf8');
const js = fs.readFileSync('app.min.js', 'utf8');

let newIndex = index.replace('<link href="styles.css" rel="stylesheet">', `<style>${css}</style>`);
newIndex = newIndex.replace('<script src="app.min.js"></script>', `<script>${js}</script>`);

fs.writeFileSync('index.html', newIndex);
console.log('Successfully inlined CSS and JS into index.html');
