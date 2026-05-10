/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Lato', 'system-ui', 'sans-serif'],
        display: ['Raleway', 'system-ui', 'sans-serif'],
      },
      colors: {
        aiesec: {
          blue: '#037EF3',
          'blue-dark': '#0256B0',
          'blue-light': '#E8F4FE',
        },
        brand: {
          text: '#1A1A2E',
          muted: '#6B7280',
          bg: '#F4F6F9',
          surface: '#FFFFFF',
          success: '#00A94F',
          warning: '#F48024',
          error: '#E53E3E',
        },
      },
      fontSize: {
        '2xl': ['32px', { lineHeight: '1.2', fontWeight: '700' }],
        '3xl': ['40px', { lineHeight: '1.15', fontWeight: '800' }],
      },
      borderRadius: {
        xl: '16px',
        '2xl': '24px',
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)',
        elevated: '0 4px 16px rgba(3,126,243,0.12)',
        modal: '0 20px 60px rgba(0,0,0,0.15)',
      },
    },
  },
  plugins: [],
}
