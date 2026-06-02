/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // KKA Design System
        parchment:  '#FAF7F2',
        charcoal:   '#1C1410',
        gold:       '#B8944A',
        'gold-light': '#D4AA6A',
        'gold-muted': 'rgba(184,148,74,0.15)',
        // Legacy tokens kept for backward compat
        primary: { DEFAULT: '#10b981', light: '#34d399', dark: '#059669' },
        surface: { DEFAULT: '#111827', light: '#1f2937', lighter: '#374151' },
        accent:  { DEFAULT: '#f59e0b', light: '#fbbf24' },
      },
      fontFamily: {
        display: ['"Playfair Display"', 'Georgia', 'serif'],
        ui:      ['"DM Sans"', 'system-ui', 'sans-serif'],
        arabic:  ['Amiri', 'serif'],
        sans:    ['"DM Sans"', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        shell: '40px',
        card:  '20px',
        pill:  '999px',
      },
      backdropBlur: {
        nav: '20px',
      },
      boxShadow: {
        shell: '0 32px 80px rgba(0,0,0,0.7), 0 8px 24px rgba(0,0,0,0.4)',
      },
    },
  },
  plugins: [],
};