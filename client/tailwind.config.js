/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          900: '#0B132B',
          800: '#1C2541',
          700: '#273458',
          600: '#3A506B'
        },
        accent: {
          primary: '#2563EB',
          hover: '#1D4ED8',
          emerald: '#10B981',
          amber: '#F59E0B'
        }
      }
    }
  },
  plugins: []
};