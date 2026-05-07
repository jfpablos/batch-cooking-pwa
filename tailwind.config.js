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
          DEFAULT: '#FF6B35',
          50: '#FFF3EE',
          100: '#FFE4D6',
          200: '#FFC9AD',
          300: '#FFAE85',
          400: '#FF8F5C',
          500: '#FF6B35',
          600: '#E8531C',
          700: '#C44116',
          800: '#9E3311',
          900: '#7A270D',
        },
        secondary: {
          DEFAULT: '#004E89',
          50: '#E6F0F9',
          100: '#CCE1F3',
          200: '#99C3E7',
          300: '#66A5DB',
          400: '#3387CF',
          500: '#004E89',
          600: '#003E6E',
          700: '#002F53',
          800: '#001F38',
          900: '#000F1D',
        },
        success: '#06A77D',
        warning: '#F59E0B',
        error: '#EF4444',
        bg: '#F8F9FA',
        card: '#FFFFFF',
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
      },
      minHeight: {
        touch: '44px',
      },
      minWidth: {
        touch: '44px',
      },
    },
  },
  plugins: [],
}
