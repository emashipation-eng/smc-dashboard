/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: "#1a5276", light: "#2e86c1" },
        success: "#27ae60",
        warning: "#f39c12",
        danger:  "#e74c3c",
      },
      fontFamily: { sans: ["Inter", "Segoe UI", "sans-serif"] },
    },
  },
  plugins: [],
}

