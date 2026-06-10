/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        safety: {
          green: '#22c55e',
          amber: '#f59e0b',
          red: '#ef4444',
        },
        map: {
          bg: '#1a1f2e',
          panel: '#1e2433',
          card: '#252d3d',
          border: '#2e3a52',
        },
      },
    },
  },
  plugins: [],
}
