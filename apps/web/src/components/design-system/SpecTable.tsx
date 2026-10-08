/**
 * apps/web/src/components/design-system/SpecTable.tsx
 *
 * Design-system primitive: SpecTable (doc 08 catalog inventory).
 *
 * Renders specification rows as a real definition table: <table> semantics
 * with <th scope="row"> labels so screen readers read "label: value" pairs.
 * Rows arrive as plain {label, value} view models; the primitive never
 * touches the catalogue. Server-compatible.
 *
 * Accessibility: a data table needs a caption (WCAG 1.3.1); the caller
 * supplies it (e.g. "Specifications").
 */
export interface SpecRow {
  readonly label: string;
  readonly value: string;
}

export interface SpecTableProps {
  readonly caption: string;
  readonly rows: readonly SpecRow[];
}

export function SpecTable({ caption, rows }: SpecTableProps) {
  if (rows.length === 0) return null;
  return (
    <table className="spec-table">
      <caption className="spec-table__caption">{caption}</caption>
      <tbody>
        {rows.map((row) => (
          <tr key={row.label}>
            <th scope="row">{row.label}</th>
            <td>{row.value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
