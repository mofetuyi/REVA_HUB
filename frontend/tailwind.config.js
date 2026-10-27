/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Reva Gold (from logo)
        gold: {
          50:  '#FDF8E7',
          100: '#F9EEC4',
          200: '#F3DC8A',
          300: '#ECC84F',
          400: '#E8B84B',
          500: '#C9A227',
          600: '#A07818',
          700: '#7A570F',
          800: '#543B09',
          900: '#2E2005',
        },
        // Deep dark surface
        dark: {
          700: '#2A2A2A',
          800: '#1A1A1A',
          900: '#0F0F0F',
        },
        // Warm cream
        cream: {
          50:  '#F5F0E8',
          100: '#E8E0CC',
          200: '#D4C9A8',
        },
        // Sustainable green
        forest: {
          600: '#4A7C28',
          700: '#3A6420',
          800: '#2D5016',
          900: '#1E3610',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['"Playfair Display"', 'Georgia', 'serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
