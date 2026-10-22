/** Tailwind is loaded only from operator.css (admin and vendor). Preflight is omitted there. */
const config = {
  plugins: {
    '@tailwindcss/postcss': {},
  },
};

export default config;
