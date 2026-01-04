module.exports = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
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
        // Industrial Pro Design System - Dark Navy Theme
        border: "hsl(215, 25%, 27%)", // Subtle border on dark backgrounds
        input: "hsl(215, 28%, 17%)", // Input background
        ring: "hsl(345, 65%, 35%)", // Focus ring - maroon accent
        background: "hsl(218, 35%, 12%)", // Dark navy primary background
        foreground: "hsl(210, 20%, 85%)", // Light gray body text
        primary: {
          DEFAULT: "hsl(345, 65%, 30%)", // Dark maroon - company brand
          foreground: "hsl(0, 0%, 100%)",
        },
        secondary: {
          DEFAULT: "hsl(215, 25%, 23%)", // Muted blue-gray for secondary actions
          foreground: "hsl(210, 20%, 85%)",
        },
        tertiary: {
          DEFAULT: "hsl(215, 20%, 35%)", // Lighter slate for tertiary elements
          foreground: "hsl(210, 20%, 90%)",
        },
        neutral: {
          DEFAULT: "hsl(215, 28%, 17%)", // Dark slate neutral
          foreground: "hsl(210, 20%, 85%)",
        },
        destructive: {
          DEFAULT: "hsl(0, 65%, 50%)", // Red for danger/error - NOT maroon
          foreground: "hsl(0, 0%, 100%)",
        },
        success: {
          DEFAULT: "hsl(142, 50%, 40%)", // Professional green
          foreground: "hsl(0, 0%, 100%)",
        },
        warning: {
          DEFAULT: "hsl(38, 80%, 50%)", // Amber warning
          foreground: "hsl(0, 0%, 10%)",
        },
        muted: {
          DEFAULT: "hsl(215, 25%, 20%)", // Muted dark slate
          foreground: "hsl(215, 15%, 55%)", // Muted text
        },
        accent: {
          DEFAULT: "hsl(215, 25%, 25%)", // Accent background for hover states
          foreground: "hsl(210, 20%, 90%)",
        },
        popover: {
          DEFAULT: "hsl(218, 32%, 15%)", // Popover/dropdown background
          foreground: "hsl(210, 20%, 85%)",
        },
        card: {
          DEFAULT: "hsl(217, 30%, 16%)", // Card/surface - slightly lighter slate-blue
          foreground: "hsl(210, 20%, 85%)",
        },
        // Sidebar specific colors
        sidebar: {
          DEFAULT: "hsl(218, 35%, 10%)", // Dark navy sidebar background
          foreground: "hsl(210, 20%, 70%)", // Light gray sidebar text
          border: "hsl(215, 25%, 20%)",
          accent: "hsl(345, 65%, 30%)", // Maroon accent
          "accent-foreground": "hsl(0, 0%, 100%)",
          hover: "hsl(217, 30%, 18%)", // Hover state
          active: "hsl(217, 30%, 20%)", // Active item background
        },
        // Gray scale for Industrial Pro
        gray: {
          50: "hsl(210, 20%, 95%)",
          100: "hsl(210, 18%, 90%)",
          200: "hsl(210, 16%, 80%)",
          300: "hsl(210, 14%, 65%)",
          400: "hsl(210, 12%, 50%)",
          500: "hsl(215, 15%, 40%)",
          600: "hsl(215, 18%, 30%)",
          700: "hsl(215, 22%, 22%)",
          800: "hsl(217, 28%, 15%)",
          900: "hsl(218, 35%, 10%)",
        },
      },
      backgroundImage: {
        'gradient-industrial': 'linear-gradient(135deg, hsl(218, 35%, 12%), hsl(217, 30%, 16%))',
        'gradient-maroon': 'linear-gradient(135deg, hsl(345, 65%, 30%), hsl(345, 55%, 25%))',
        'gradient-card': 'linear-gradient(180deg, hsl(217, 30%, 17%), hsl(217, 30%, 15%))',
      },
      borderRadius: {
        lg: "10px",
        md: "8px",
        sm: "4px",
      },
      fontFamily: {
        sans: ['"Inter"', 'sans-serif'],
        headline: ['"Poppins"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      spacing: {
        '4': '1rem',
        '8': '2rem',
        '12': '3rem',
        '16': '4rem',
        '24': '6rem',
        '32': '8rem',
        '48': '12rem',
        '64': '16rem',
      },
      boxShadow: {
        'industrial': '0 2px 8px rgba(0, 0, 0, 0.3)',
        'industrial-md': '0 4px 12px rgba(0, 0, 0, 0.35)',
        'industrial-lg': '0 8px 24px rgba(0, 0, 0, 0.4)',
        'card': '0 1px 3px rgba(0, 0, 0, 0.25)',
        'card-hover': '0 4px 12px rgba(0, 0, 0, 0.3)',
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
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
