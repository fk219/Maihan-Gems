/**
 * apps/web/src/app/layout.tsx
 *
 * The root layout: every route group below it inherits <html>/<body>.
 * Deliberately contains NO chrome — header/main/footer and the mega menu are
 * the (storefront) group's layouts (SoT 12.2 note: "(storefront)/ layout.tsx
 * header, mega menu, footer, chat launcher"), which lands with later Phase 4
 * tasks. Admin does not inherit storefront chrome; each group contributes
 * its own layout over this base.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
