/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,ts}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#7C3AED',
          light: '#A855F7',
          dark: '#6D28D9',
        },
      },
    },
  },
  plugins: [],
  corePlugins: {
    preflight: false,
  },
};
