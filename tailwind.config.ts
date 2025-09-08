import type { Config } from "tailwindcss"

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
    "*.{js,ts,jsx,tsx,mdx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // Mystical color palette with purple base
        sage: {
          50: "hsl(270, 25%, 95%)",
          100: "hsl(270, 25%, 90%)",
          200: "hsl(270, 25%, 80%)",
          300: "hsl(270, 25%, 70%)",
          400: "hsl(270, 25%, 60%)",
          500: "hsl(270, 25%, 50%)",
          600: "hsl(270, 25%, 40%)",
          700: "hsl(270, 25%, 30%)",
          800: "hsl(270, 25%, 20%)",
          900: "hsl(270, 25%, 10%)",
        },
        terracotta: {
          50: "hsl(280, 40%, 95%)",
          100: "hsl(280, 40%, 90%)",
          200: "hsl(280, 40%, 80%)",
          300: "hsl(280, 40%, 70%)",
          400: "hsl(280, 40%, 60%)",
          500: "hsl(280, 40%, 50%)",
          600: "hsl(280, 40%, 40%)",
          700: "hsl(280, 40%, 30%)",
          800: "hsl(280, 40%, 20%)",
          900: "hsl(280, 40%, 10%)",
        },
        earth: {
          50: "hsl(260, 20%, 95%)",
          100: "hsl(260, 20%, 90%)",
          200: "hsl(260, 20%, 80%)",
          300: "hsl(260, 20%, 70%)",
          400: "hsl(260, 20%, 60%)",
          500: "hsl(260, 20%, 50%)",
          600: "hsl(260, 20%, 40%)",
          700: "hsl(260, 20%, 30%)",
          800: "hsl(260, 20%, 20%)",
          900: "hsl(260, 20%, 10%)",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-20px)" },
        },
        "pulse-glow": {
          "0%, 100%": { boxShadow: "0 0 20px rgba(168, 85, 247, 0.5)" },
          "50%": { boxShadow: "0 0 40px rgba(168, 85, 247, 0.8)" },
        },
        "spin-slow": {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.6s ease-out",
        float: "float 3s ease-in-out infinite",
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
        "spin-slow": "spin-slow 8s linear infinite",
      },
      fontFamily: {
        playfair: ["Playfair Display", "Georgia", "Times New Roman", "serif"],
        inter: ["Inter", "system-ui", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
      },
      backgroundImage: {
        "gradient-conic": "conic-gradient(var(--tw-gradient-stops))",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config

export default config
