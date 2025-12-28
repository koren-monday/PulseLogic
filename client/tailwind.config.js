/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        garmin: {
          blue: '#007dcd',
          dark: '#1a1a2e',
          gray: '#16213e',
        },
      },
    },
  },
  plugins: [],
}

