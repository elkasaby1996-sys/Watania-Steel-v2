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
        border: "hsl(240, 4%, 80%)",
        input: "hsl(240, 5%, 96%)",
        ring: "hsl(232, 90%, 62%)",
        background: "hsl(0, 0%, 97%)", // Clean light grey background
        foreground: "hsl(0, 0%, 15%)", // Dark grey text
        primary: {
          DEFAULT: "hsl(340, 80%, 30%)", // Rich burgundy/maroon matching logo
          foreground: "hsl(0, 0%, 100%)",
        },
        secondary: {
          DEFAULT: "hsl(0, 0%, 85%)", // Light grey
          foreground: "hsl(0, 0%, 25%)",
        },
        tertiary: {
          DEFAULT: "hsl(0, 0%, 65%)", // Medium grey
          foreground: "hsl(0, 0%, 20%)",
        },
        neutral: {
          DEFAULT: "hsl(0, 0%, 96%)", // Off-white
          foreground: "hsl(0, 0%, 20%)",
        },
        destructive: {
          DEFAULT: "hsl(0, 70%, 50%)", // Bright red
          foreground: "hsl(0, 0%, 100%)",
        },
        success: {
          DEFAULT: "hsl(120, 40%, 45%)", // Green
          foreground: "hsl(0, 0%, 100%)",
        },
        warning: {
          DEFAULT: "hsl(40, 80%, 55%)", // Amber
          foreground: "hsl(0, 0%, 20%)",
        },
        muted: {
          DEFAULT: "hsl(0, 0%, 92%)", // Light grey
          foreground: "hsl(0, 0%, 50%)", // Medium grey
        },
        accent: {
          DEFAULT: "hsl(0, 0%, 90%)", // Very light grey
          foreground: "hsl(0, 0%, 25%)",
        },
        popover: {
          DEFAULT: "hsl(0, 0%, 100%)",
          foreground: "hsl(0, 0%, 15%)",
        },
        card: {
          DEFAULT: "hsl(0, 0%, 100%)",
          foreground: "hsl(0, 0%, 15%)",
        },
        gray: {
          50: "hsl(0, 0%, 98%)",
          100: "hsl(240, 5%, 96%)",
          200: "hsl(240, 5%, 90%)",
          300: "hsl(240, 4%, 80%)",
          400: "hsl(240, 4%, 65%)",
          500: "hsl(240, 4%, 52%)",
          600: "hsl(240, 4%, 40%)",
          700: "hsl(240, 4%, 28%)",
          800: "hsl(240, 4%, 18%)",
          900: "hsl(240, 4%, 10%)",
        },
      },
      backgroundImage: {
        'gradient-1': 'linear-gradient(135deg, hsl(232, 90%, 62%), hsl(268, 75%, 58%))',
        'gradient-2': 'linear-gradient(135deg, hsl(205, 72%, 72%), hsl(210, 80%, 54%))',
        'button-border-gradient': 'linear-gradient(135deg, hsl(232, 90%, 62%), hsl(205, 64%, 72%))',
      },
      borderRadius: {
        lg: "12px",
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
