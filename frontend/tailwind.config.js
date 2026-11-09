/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        shopee: {
          orange: '#EE4D2D',
          hover: '#d73211',
          light: '#FFF5F1'
        },
        whatsapp: {
          green: '#25D366',
          dark: '#075E54',
          light: '#DCF8C6'
        }
      }
    },
  },
  plugins: [],
}
