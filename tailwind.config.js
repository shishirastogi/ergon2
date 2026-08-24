/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        page: 'rgb(var(--bg-page) / <alpha-value>)',
        card: {
          DEFAULT: 'rgb(var(--bg-card) / <alpha-value>)',
          alt: 'rgb(var(--bg-card-alt) / <alpha-value>)',
        },
        border: {
          DEFAULT: 'rgb(var(--border-subtle) / <alpha-value>)',
          subtle: 'rgb(var(--border-subtle) / <alpha-value>)',
        },
        'border-subtle': 'rgb(var(--border-subtle) / <alpha-value>)',
        text: {
          primary: 'rgb(var(--text-primary) / <alpha-value>)',
          secondary: 'rgb(var(--text-secondary) / <alpha-value>)',
          inverse: 'rgb(var(--text-inverse) / <alpha-value>)',
        },
        accent: {
          blue: 'rgb(var(--accent-blue) / <alpha-value>)',
          green: 'rgb(var(--accent-green) / <alpha-value>)',
          pink: 'rgb(var(--accent-pink) / <alpha-value>)',
          orange: 'rgb(var(--accent-orange) / <alpha-value>)',
          red: 'rgb(var(--status-overdue) / <alpha-value>)',
        },
        status: {
          paid: 'rgb(var(--accent-green) / <alpha-value>)',
          pending: 'rgb(var(--accent-blue) / <alpha-value>)',
          partial: 'rgb(var(--accent-orange) / <alpha-value>)',
          overdue: 'rgb(var(--status-overdue) / <alpha-value>)',
        }
      },
      borderColor: {
        DEFAULT: 'rgb(var(--border-subtle) / <alpha-value>)',
        subtle: 'rgb(var(--border-subtle) / <alpha-value>)',
      },
      borderRadius: {
        'card': '24px',
        'card-sm': '20px',
        'input': '14px',
        'pill': '9999px',
      },
      boxShadow: {
        'card': 'var(--shadow-card)',
        'card-hover': 'var(--shadow-card-hover)',
        'pill': '0 2px 8px rgba(0, 0, 0, 0.08)',
        'float': 'var(--shadow-float)',
        'ergon-card': 'var(--shadow-card)',
        'ergon-card-hover': 'var(--shadow-card-hover)',
        'ergon-pill': '0 2px 8px rgba(0, 0, 0, 0.08)',
        'ergon-float': 'var(--shadow-float)',
        'ergon-modal': '0 16px 40px rgba(0, 0, 0, 0.2)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      backgroundImage: {
        'hero-gradient': 'linear-gradient(135deg, #F2994A 0%, #3B6FE0 100%)',
      }
    },
  },
  plugins: [],
}
