/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'bg-primary': '#0d1117',
        'bg-secondary': '#161b22',
        'bg-tertiary': '#1c2128',
        'bg-input': '#21262d',
        border: { DEFAULT: '#30363d', subtle: '#21262d' },
        'text-primary': '#c9d1d9',
        'text-secondary': '#8b949e',
        'text-muted': '#484f58',
        'accent-red': '#f85149',
        'accent-yellow': '#d29922',
        'accent-blue': '#58a6ff',
        'accent-green': '#238636',
        'accent-purple': '#cba6f7',
      },
    },
  },
  plugins: [],
};
