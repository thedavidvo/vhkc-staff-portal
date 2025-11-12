import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        primary: {
          DEFAULT: '#1a6aff',
          50: '#e6f0ff',
          100: '#b3d5ff',
          200: '#80baff',
          300: '#4d9fff',
          400: '#1a84ff',
          500: '#1a6aff',
          600: '#0052e6',
          700: '#003db3',
          800: '#002880',
          900: '#00134d',
        },
      },
    },
  },
  plugins: [],
}
export default config

