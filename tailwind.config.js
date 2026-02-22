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
        // Theme tokens (driven by CSS variables in src/index.css)
        border: "var(--color-border)",
        input: "var(--color-input)",
        ring: "var(--color-ring)",
        background: "var(--color-background)",
        foreground: "var(--color-foreground)",
        primary: {
          DEFAULT: "var(--color-primary)",
          foreground: "var(--color-primary-foreground)",
        },
        secondary: {
          DEFAULT: "var(--color-secondary)",
          foreground: "var(--color-secondary-foreground)",
        },
        tertiary: {
          DEFAULT: "var(--color-tertiary)",
          foreground: "var(--color-tertiary-foreground)",
        },
        neutral: {
          DEFAULT: "var(--color-neutral)",
          foreground: "var(--color-neutral-foreground)",
        },
        destructive: {
          DEFAULT: "var(--color-destructive)",
          foreground: "var(--color-destructive-foreground)",
        },
        success: {
          DEFAULT: "var(--color-success)",
          foreground: "var(--color-success-foreground)",
        },
        warning: {
          DEFAULT: "var(--color-warning)",
          foreground: "var(--color-warning-foreground)",
        },
        muted: {
          DEFAULT: "var(--color-muted)",
          foreground: "var(--color-muted-foreground)",
        },
        accent: {
          DEFAULT: "var(--color-accent)",
          foreground: "var(--color-accent-foreground)",
        },
        popover: {
          DEFAULT: "var(--color-popover)",
          foreground: "var(--color-popover-foreground)",
        },
        card: {
          DEFAULT: "var(--color-card)",
          foreground: "var(--color-card-foreground)",
        },
        // Sidebar specific colors
        sidebar: {
          DEFAULT: "var(--color-sidebar)",
          foreground: "var(--color-sidebar-foreground)",
          border: "var(--color-sidebar-border)",
          accent: "var(--color-sidebar-accent)",
          "accent-foreground": "var(--color-primary-foreground)",
          hover: "var(--color-sidebar-hover)",
          active: "var(--color-sidebar-active)",
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
