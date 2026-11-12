import type { Config } from 'tailwindcss';
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#15183A',
        muted: '#5B607E',
        line: '#DCDFEC',
        canvas: '#F6F7FB',
        sunk: '#ECEEF7',
        indigo: { DEFAULT: '#2D2F8F', soft: '#E4E5F6' },
        saffron: { DEFAULT: '#F2A007', soft: '#FDF0D2', ink: '#8A5A00' },
        coral: { DEFAULT: '#E4572E', soft: '#FBE1D8', ink: '#B23C17' },
        teal: { DEFAULT: '#0F8B8D', soft: '#D8F0F0', ink: '#0A6466' },
      },
      fontFamily: {
        sans: ['var(--font-geist-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
};
export default config;
