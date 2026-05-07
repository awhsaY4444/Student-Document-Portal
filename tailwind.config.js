export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontSize: {
        xs: ['0.8rem', { lineHeight: '1.2rem' }],
        sm: ['0.94rem', { lineHeight: '1.45rem' }],
        base: ['1rem', { lineHeight: '1.55rem' }],
        lg: ['1.18rem', { lineHeight: '1.75rem' }],
        xl: ['1.3rem', { lineHeight: '1.9rem' }],
        '2xl': ['1.65rem', { lineHeight: '2.1rem' }],
        '3xl': ['2rem', { lineHeight: '2.45rem' }]
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui']
      },
      colors: {
        college: {
          navy: '#17335c',
          navyDark: '#0f2749',
          line: '#d8dee8',
          panel: '#f7f9fc'
        }
      }
    }
  },
  plugins: []
};
