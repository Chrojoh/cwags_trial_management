/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        'fall-gold': '#D99A2B',
        'fall-orange': '#C96A2B',
        'fall-red': '#A63D33',
        'fall-purple': '#5C3B2E',   // ✅ FIXED — no broken string
        'fall-tan': '#F2E2C4',
      },
      backgroundImage: {
        'gradient-cwags': 'linear-gradient(to br, #F2E2C4, #D99A2B, #C96A2B)',
      }
    }
  },
  plugins: [],
}
