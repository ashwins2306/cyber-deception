/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        cyber: {
          dark: '#0a0f1d',
          darker: '#060913',
          card: '#0f172a',
          cardBorder: '#1e293b',
          blue: '#3b82f6',
          cyan: '#06b6d4',
          red: '#ef4444',
          emerald: '#10b981',
          amber: '#f59e0b',
          purple: '#8b5cf6',
          honeypot: '#a855f7'
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Courier New', 'monospace']
      }
    },
  },
  plugins: [],
}
