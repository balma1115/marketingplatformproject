import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // LEVER-Inspired Professional Navy Theme
        'brand-navy': '#1A1F3F',
        'accent-blue': '#556AF9',
        'secondary-blue': '#8896FF',
        
        // Custom Gray Scale
        gray: {
          50: '#FAFAFA',
          100: '#F5F5F5',
          200: '#E5E5E5',
          300: '#DDDDDD',
          400: '#BDBDBD',
          500: '#9E9E9E',
          600: '#757575',
          700: '#555555',
          800: '#424242',
          900: '#212121',
        }
      },
      fontFamily: {
        sans: ['"Noto Sans KR"', 'system-ui', '-apple-system', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
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
        slideDown: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
export default config