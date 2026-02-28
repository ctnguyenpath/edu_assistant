/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class', // <-- Enables manual dark mode toggling via class
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}