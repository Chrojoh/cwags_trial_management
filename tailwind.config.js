/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        'cwags-blue': '#2563eb',
        'cwags-light-blue': '#dbeafe', 
        'cwags-dark-blue': '#1e40af'
      },
      backgroundImage: {
        'gradient-cwags': 'linear-gradient(to br, #eff6ff, #e0e7ff)',
      }
    }
  },
  plugins: [],
}