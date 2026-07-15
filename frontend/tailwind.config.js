/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        wa: {
          bg: '#0B141A',
          panel: '#111B21',
          hover: '#202C33',
          accent: '#25D366',
          'accent-2': '#00A884',
          incoming: '#202C33',
          outgoing: '#005C4B',
          text: '#E9EDEF',
          muted: '#8696A0',
          border: '#2A3942',
          confirmed: '#25D366',
          cancelled: '#F15C6D',
          pending: '#FFB020',
          ai: '#54656F'
        }
      },
      fontFamily: {
        sans: ['"Segoe UI"', '"Helvetica Neue"', 'Helvetica', 'Arial', 'sans-serif']
      },
      keyframes: {
        pulseDot: {
          '0%, 100%': { transform: 'scale(1)', opacity: '1' },
          '50%': { transform: 'scale(1.3)', opacity: '.6' }
        },
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        }
      },
      animation: {
        pulseDot: 'pulseDot 1.6s ease-in-out infinite',
        fadeIn: 'fadeIn 180ms ease-out'
      }
    }
  },
  plugins: []
}
