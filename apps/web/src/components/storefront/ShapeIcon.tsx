export function ShapeIcon({ shape }: { shape: string }) {
  const key = shape.toLowerCase();
  if (key.includes('round')) {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="7" /></svg>;
  }
  if (key.includes('oval')) {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><ellipse cx="12" cy="12" rx="5" ry="8" /></svg>;
  }
  if (key.includes('cushion')) {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="5" width="14" height="14" rx="4" /></svg>;
  }
  if (key.includes('emerald')) {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 6h10l3 6-3 6H7l-3-6 3-6z" /></svg>;
  }
  if (key.includes('pear') || key.includes('drop')) {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4c4 5 6 8 6 11a6 6 0 1 1-12 0c0-3 2-6 6-11z" /></svg>;
  }
  if (key.includes('heart')) {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19s-7-4.4-7-9a4 4 0 0 1 7-2 4 4 0 0 1 7 2c0 4.6-7 9-7 9z" /></svg>;
  }
  if (key.includes('marquise')) {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3c4 5 7 7 7 9s-3 4-7 9c-4-5-7-7-7-9s3-4 7-9z" /></svg>;
  }
  if (key.includes('princess') || key.includes('radiant') || key.includes('asscher')) {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="6" width="12" height="12" transform="rotate(45 12 12)" /></svg>;
  }
  if (key.includes('trillion') || key.includes('triangle')) {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5 20 19H4z" /></svg>;
  }
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12c2-5 5-8 7-8s5 3 7 8-3 8-7 8-5-3-7-8z" /></svg>;
}
