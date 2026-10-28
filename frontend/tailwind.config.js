/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Signature Reva Colors: Dark Green, Crisp White, and Rich Gold
        brandGreen: {
          50:  '#E8F5E9',
          100: '#C8E6C9',
          200: '#A5D6A7',
          300: '#81C784',
          400: '#4CAF50',
          500: '#2E7D32',
          600: '#1B5E20',
          700: '#144D1B',
          800: '#0F3B14',
          900: '#0B3D1B',
          950: '#062E12',
        },
        // Reva Gold
        gold: {
          50:  '#FDF8E7',
          100: '#F9EEC4',
          200: '#F3DC8A',
          300: '#ECC84F',
          400: '#E8B84B',
          500: '#D4AF37',
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
          600: '#1B5E20',
          700: '#144D1B',
          800: '#0F3B14',
          900: '#062E12',
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
