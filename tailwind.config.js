/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          blue: '#065689',      // Deep Corporate Trust Blue
          cyan: '#4BE6E0',      // Vibrant highlight / CTA button
          mint: '#D7FFFB',      // Light minty badge/pill background
          sky: '#6EC1E4',       // Sky blue link hover
          dark: '#28303D',      // Heading text
          slate: '#39414D',     // Body text
          muted: '#54595F',     // Subtitle / helper gray
          light: '#F8FAFC',     // Light background
        },
        cream: {
          50: '#FDFBF7',
          100: '#FAF7F0',       // Soft neutral cream background from video reference
          200: '#F4EFE6',
          300: '#E8DFC8'
        },
        navy: {
          800: '#1E293B',
          900: '#0F172A',       // Dark navy headings from video reference
          950: '#0A0F1D'
        },
        accent: {
          green: '#10B981',     // Green accent from video reference
          darkGreen: '#047857',
          lightGreen: '#E6F4EA'
        }
      },
      fontFamily: {
        serif: ['"Roboto Slab"', 'Georgia', 'serif'],
        sans: ['Roboto', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
