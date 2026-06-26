/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Refined forest ramp — drives the whole app via existing `green-*` utilities.
        // Light end maps to warm cream, mid to sage, dark to forest (new design system).
        green: {
          50:  '#FAF7F2', // cream — light section backgrounds
          100: '#EDE8E0', // cream-dark — subtle borders / fills
          200: '#A8D5B5', // sage — accents, dots, rings
          300: '#7FC59B',
          400: '#4E9E72',
          500: '#2D6A4F',
          600: '#1F5137', // accent text (eyebrows, links)
          700: '#163D2A', // button hover
          800: '#0E2A1F', // forest — primary buttons / headings
          900: '#0A1F14', // forest-dark — dark sections / footer
        },
        gold:   { 400: '#D4A853', 500: '#C9A84C' },
        cream:  { DEFAULT: '#FAF7F2', dark: '#EDE8E0' },
        forest: { DEFAULT: '#0E2A1F', mid: '#1B4332', dark: '#0A1F14' },
        sage:   { DEFAULT: '#A8D5B5' },
      },
      fontFamily: {
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
        sans:  ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: { xl: '12px', '2xl': '16px', '3xl': '24px' },
      boxShadow: {
        card: '0 2px 16px rgba(0,0,0,.06)',
        'card-hover': '0 8px 32px rgba(0,0,0,.12)',
        btn: '0 4px 12px rgba(14,42,31,.20)',
      },
    },
  },
  plugins: [],
}
