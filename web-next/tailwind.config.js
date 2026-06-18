/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],
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
        serif: ['var(--font-dm-serif)', 'Georgia', 'serif'],
        sans:  ['var(--font-manrope)', 'system-ui', 'sans-serif'],
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
