/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#e6f5f0',
          100: '#c8e8dd',
          200: '#91d1ba',
          300: '#5aba97',
          400: '#2aa374',
          500: '#009975',
          600: '#008566',
          700: '#006e54',
          800: '#005843',
          900: '#004233',
          950: '#002920',
        },
        gold: {
          50: '#fdf8e8',
          100: '#faedc6',
          200: '#f5db8d',
          300: '#efc954',
          400: '#eab720',
          500: '#eac102',
          600: '#d4a800',
          700: '#a88300',
          800: '#7c6100',
          900: '#504000',
          950: '#2a2100',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        shimmer: 'shimmer 1.5s infinite',
      },
    },
  },
  plugins: [],
};
