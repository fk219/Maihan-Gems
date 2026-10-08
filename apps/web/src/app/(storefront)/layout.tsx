/**
 * apps/web/src/app/(storefront)/layout.tsx
 *
 * The storefront group layout.
 *
 * SoT 12.2 comment: "header, mega menu, footer, chat launcher" — implemented
 * by Phase 4 Tasks 2-9 (design-system primitives, mega menu, chat). The shell
 * structural boundary is established here in Task 1 so the route tree
 * underneath inherits the group; it renders children only.
 */
export default function StorefrontLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
