export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif']
      },
      colors: {
        surface: {
          DEFAULT: '#0b0d12',
          raised: '#12151d',
          overlay: '#171b25'
        }
      },
      boxShadow: {
        glow: '0 0 40px -12px rgba(99,102,241,0.45)',
        card: '0 8px 30px rgba(0,0,0,0.35)'
      },
      keyframes: {
        fadeIn: { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp: { from: { opacity: '0', transform: 'translateY(12px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        pulseRing: {
          '0%': { transform: 'scale(1)', opacity: '0.6' },
          '100%': { transform: 'scale(1.6)', opacity: '0' }
        }
      },
      animation: {
        fadeIn: 'fadeIn .25s ease-out',
        slideUp: 'slideUp .3s ease-out',
        pulseRing: 'pulseRing 1.4s ease-out infinite'
      }
    }
  },
  plugins: []
};
