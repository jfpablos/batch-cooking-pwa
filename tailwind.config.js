/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
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
        // Design tokens (Performance Kitchen palette)
        ink:    '#2A2318',
        cream:  '#FAF9F7',
        char:   '#322718',
        cobalt: '#2E5FA8',
        lime:   '#7FCB4A',
        amber:  '#D4A42A',
        plum:   '#7E3A7A',
        teal:   '#3BA89A',
        success: '#06A77D',
        warning: '#F59E0B',
        error:   '#EF4444',
        bg:      '#F8F9FA',
        card:    '#FFFFFF',
      },
      fontFamily: {
        sans:    ['Manrope', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['Bricolage Grotesque', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono:    ['JetBrains Mono', 'ui-monospace', 'monospace'],
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
