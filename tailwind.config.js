/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#e6f0f5',
          100: '#b3d1e0',
          200: '#80b3cc',
          300: '#4d94b8',
          400: '#2675a3',
          500: '#003B5C',
          600: '#00324f',
          700: '#002942',
          800: '#002035',
          900: '#001728',
        },
        aiesec: {
          blue: '#003B5C',
          yellow: '#FFD100',
          light: '#F5F7FA',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
