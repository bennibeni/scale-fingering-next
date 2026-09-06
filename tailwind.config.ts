import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{js,ts,jsx,tsx,mdx}', './components/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-geist-sans)', 'Arial', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'Courier New', 'monospace'],
        serif: ['var(--font-geist-sans)', 'Arial', 'sans-serif'],
      },
      colors: {
        ink: '#1c2520',
        paper: '#f4f0e8',
        moss: { 50: '#f1f6f2', 100: '#dfece2', 500: '#4d765c', 700: '#2f5540', 900: '#173122' },
        brass: { 100: '#f8edcf', 500: '#b88732', 700: '#785719' },
      },
      boxShadow: { panel: '0 24px 70px rgba(32, 42, 35, 0.10)' },
    },
  },
  plugins: [],
};

export default config;
