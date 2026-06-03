/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        serif: ['"DM Serif Display"', 'Georgia', 'serif'],
        sans: ['"DM Sans"', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      colors: {
        primary: {
          50:  '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
        },
        warm: {
          50:  '#faf8f5',
          100: '#f2ede6',
          200: '#e8ddd0',
          300: '#d6c9b8',
          400: '#b8a898',
          700: '#4a4540',
          800: '#2e2a25',
          850: '#251f1a',
          900: '#1c1815',
          950: '#100f0d',
        },
      },
    },
  },
  plugins: [],
}
