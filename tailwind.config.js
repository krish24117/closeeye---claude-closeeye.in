/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        green: {
          50:  '#f0f9f3',
          100: '#dcf0e3',
          200: '#a8d5b8',
          300: '#6db98a',
          400: '#4a9b6a',
          500: '#2d6b48',
          600: '#2d6b48',
          700: '#1f4a32',
          800: '#1a3a2a',
          900: '#0E2A1F',
        },
        gold: { 400: '#d4a853', 500: '#c9a84c' },
        cream: { DEFAULT: '#faf8f3' },
      },
      fontFamily: {
        serif: ['"DM Serif Display"', 'Georgia', 'serif'],
        sans:  ['Manrope', 'system-ui', 'sans-serif'],
      },
      borderRadius: { xl: '12px', '2xl': '16px', '3xl': '24px' },
      boxShadow: {
        card: '0 2px 16px rgba(14,42,31,.08)',
        'card-hover': '0 8px 32px rgba(14,42,31,.14)',
      },
    },
  },
  plugins: [],
}
