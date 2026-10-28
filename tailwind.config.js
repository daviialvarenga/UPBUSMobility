/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          500: '#0284c7',
          600: '#0369a1',
          700: '#075985',
          800: '#0c4a6e',
          900: '#082f49',
          950: '#041c2c',
        },
        transit: {
          bus: '#0284c7',
          metro: '#7c3aed',
          express: '#ea580c',
          active: '#16a34a',
          delayed: '#dc2626',
          warning: '#f59e0b',
        }
      },
    },
  },
  plugins: [],
}
