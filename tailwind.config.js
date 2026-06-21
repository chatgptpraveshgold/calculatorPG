/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./*.html", "./**/*.html"],
  theme: {
    extend: {
      colors: { maroon: '#4d1616', cream: '#fdf8f0' },
      fontFamily: { sans: ['Inter', 'sans-serif'] }
    }
  },
  plugins: [],
}
