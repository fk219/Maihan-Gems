/**
 * apps/web/postcss.config.mjs
 *
 * Tailwind is loaded only from the operator stylesheets copied from develop
 * (`src/styles/mgh-applet.css`, `src/styles/portal-premium.css`). Neither
 * imports Preflight, so the storefront's own reset is left alone.
 */
const config = {
  plugins: {
    '@tailwindcss/postcss': {},
  },
};

export default config;
