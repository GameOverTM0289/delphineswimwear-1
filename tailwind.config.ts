import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        paper: '#FAF8F3',
        cream: '#F2ECE1',
        sand: '#E6DECE',
        ink: '#1B1916',
        mute: '#7C766D',
        accent: '#1B1916',
      },
      fontFamily: {
        serif: ['var(--serif)', 'Georgia', 'serif'],
        sans: ['var(--sans)', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
