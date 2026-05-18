/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fdf2f2',
          100: '#fde1e1',
          200: '#fbcbcb',
          300: '#f7abab',
          400: '#f27c7c',
          500: '#ea5454',
          600: '#d73939',
          700: '#b42b2b',
          800: '#952727',
          900: '#7c2525',
          950: '#430f0f',
        },
      },
    },
  },
  plugins: [],
}
