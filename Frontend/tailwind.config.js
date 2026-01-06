import defaultTheme from 'tailwindcss/defaultTheme';
import colors from 'tailwindcss/colors';

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#2A64F6',
        'text-primary': '#1A202C',
        'text-secondary': '#718096',
        'border-light': '#E2E8F0',
        'surface': 'rgba(255, 255, 255, 0.7)',
        'gradient-start': '#E6E0FF',
        'gradient-end': '#D4F1F4',
        'light-bg-start': '#f8fafc',
        'light-bg-end': '#f1f5f9',
        blue: colors.blue,
        'dark-blue': '#0D1117',
      },
      fontFamily: {
        sans: ['system-ui', ...defaultTheme.fontFamily.sans],
      },
      borderRadius: {
        xl: '12px',
        lg: '8px',
      },
      boxShadow: {
        card: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        'card-hover': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
      },
    },
  },
  plugins: [],
};

