/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0F0F11',
        text: '#ECECEC',
        subtext: '#9C9C9C',
        line: 'rgba(255,255,255,0.10)',
        surface: 'rgba(23, 23, 26, 0.75)',
        surface2: 'rgba(255,255,255,0.06)',
        accent: '#E6C46A',
        spring1: '#0B2B24',
        spring2: '#0E3A2F',
        spring3: '#1A5A41'
      },
      boxShadow: {
        soft: '0 10px 30px rgba(0,0,0,0.35)'
      }
    }
  },
  plugins: []
}
