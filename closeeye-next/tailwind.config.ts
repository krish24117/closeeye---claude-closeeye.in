import type { Config } from 'tailwindcss'

/**
 * Close Eye Design System — Tailwind theme.
 * Semantic tokens resolve through the CSS variables in styles/globals.css.
 * There are intentionally FEW knobs here — the constraint is the point.
 */
const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './features/**/*.{ts,tsx}',
    './hooks/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: { DEFAULT: '1.25rem', sm: '1.5rem', lg: '2rem' },
      screens: { '2xl': '1280px' }, // Design Authority: 1280px max content width
    },
    extend: {
      colors: {
        ink: 'hsl(var(--ink) / <alpha-value>)',
        green: {
          DEFAULT: 'hsl(var(--green) / <alpha-value>)',
          hover: 'hsl(var(--green-hover) / <alpha-value>)',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent) / <alpha-value>)',
          soft: 'hsl(var(--accent-soft) / <alpha-value>)',
        },
        ivory: 'hsl(var(--ivory) / <alpha-value>)',
        card: 'hsl(var(--card) / <alpha-value>)',
        line: 'hsl(var(--line) / <alpha-value>)',
        muted: 'hsl(var(--muted) / <alpha-value>)',
        disabled: 'hsl(var(--disabled) / <alpha-value>)',
        // NB: no `body` colour token — `text-body` is the type-size step. Body text
        // colour is applied globally on <body>; override with text-ink / text-muted.
        success: 'hsl(var(--success) / <alpha-value>)',
        warning: 'hsl(var(--warning) / <alpha-value>)',
        error: 'hsl(var(--error) / <alpha-value>)',
        // ── Ch.2 Color — semantic roles (design-tokens.css). Values are identical to the legacy
        // tokens above (surface=ivory, content=ink, brand=green, edge=line, …) so migrating a class
        // onto them changes nothing — EXCEPT content-inverse, the ratified warm-ivory on-dark text.
        surface: {
          DEFAULT: 'hsl(var(--color-surface) / <alpha-value>)',
          raised: 'hsl(var(--color-surface-raised) / <alpha-value>)',
          inverse: 'hsl(var(--color-surface-inverse) / <alpha-value>)',
          accent: 'hsl(var(--color-surface-accent) / <alpha-value>)',
        },
        content: {
          DEFAULT: 'hsl(var(--color-text) / <alpha-value>)',
          muted: 'hsl(var(--color-text-secondary) / <alpha-value>)',
          inverse: 'hsl(var(--color-text-inverse) / <alpha-value>)',
          disabled: 'hsl(var(--color-text-disabled) / <alpha-value>)',
        },
        brand: {
          DEFAULT: 'hsl(var(--color-brand) / <alpha-value>)',
          hover: 'hsl(var(--color-brand-hover) / <alpha-value>)',
        },
        edge: 'hsl(var(--color-border) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        // The display serif (Newsreader) as a first-class utility — `font-display`. This is the
        // ONE way to apply the heading serif; it replaces the hand-copied inline
        // `style={{ fontFamily: 'var(--font-newsreader)…' }}` const that used to drift page to page
        // (e.g. the /join funnel shipped in sans). --font-display already carries the fallbacks.
        display: ['var(--font-display)', 'Georgia', 'serif'],
      },
      fontSize: {
        // THE type scale — the only steps allowed.
        h1: ['clamp(2.75rem, 5.6vw, 4.25rem)', { lineHeight: '1.03', letterSpacing: '-0.03em', fontWeight: '700' }],
        h2: ['clamp(2rem, 3.8vw, 3rem)', { lineHeight: '1.08', letterSpacing: '-0.025em', fontWeight: '700' }],
        h3: ['clamp(1.5rem, 2.4vw, 2rem)', { lineHeight: '1.16', letterSpacing: '-0.02em', fontWeight: '600' }],
        h4: ['1.25rem', { lineHeight: '1.3', letterSpacing: '-0.015em', fontWeight: '600' }],
        lead: ['1.1875rem', { lineHeight: '1.65', fontWeight: '400' }],
        body: ['1.0625rem', { lineHeight: '1.7', fontWeight: '400' }],
        'body-sm': ['0.9375rem', { lineHeight: '1.6', fontWeight: '400' }],
        caption: ['0.8125rem', { lineHeight: '1.5', fontWeight: '500' }],
      },
      spacing: {
        // 8-point rhythm helpers (base Tailwind scale is already 4px-based)
        18: '4.5rem',
        22: '5.5rem',
        30: '7.5rem',
      },
      maxWidth: {
        content: '1280px',
        prose: '38rem',
        measure: '44rem',
      },
      borderRadius: {
        // Design Authority radius set: 12 / 20 / 28 / 32
        sm: 'var(--r-sm)', // 12
        md: 'var(--r-md)', // 20
        lg: 'var(--r-lg)', // 28
        xl: 'var(--r-xl)', // 32
      },
      boxShadow: {
        sm: 'var(--shadow-sm)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)',
      },
      transitionTimingFunction: {
        premium: 'var(--ease)', // legacy alias — kept during migration; == ease-standard
        // Ch.4 Motion tokens (design-tokens.css). One signature ease + linear for loops only.
        standard: 'var(--ease-standard)',
      },
      transitionDuration: {
        // Ch.4 Motion — durations by meaning (design-tokens.css). Identical values to the
        // legacy 200/300/600 utilities, so consuming these changes nothing visually.
        feedback: 'var(--duration-feedback)',
        transition: 'var(--duration-transition)',
        arrival: 'var(--duration-arrival)',
      },
      keyframes: {
        'accordion-down': { from: { height: '0' }, to: { height: 'var(--radix-accordion-content-height)' } },
        'accordion-up': { from: { height: 'var(--radix-accordion-content-height)' }, to: { height: '0' } },
      },
      animation: {
        'accordion-down': 'accordion-down 0.28s var(--ease)',
        'accordion-up': 'accordion-up 0.28s var(--ease)',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}

export default config
