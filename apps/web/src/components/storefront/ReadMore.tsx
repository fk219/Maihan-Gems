'use client';

import { useState } from 'react';

export function ReadMore({ html }: { html: string }) {
  const [open, setOpen] = useState(false);
  const plain = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const long = plain.length > 380;

  return (
    <div className={open || !long ? 'salon-read is-open' : 'salon-read'}>
      <div className="ngc-copy__body salon-read__body" dangerouslySetInnerHTML={{ __html: html }} />
      {long ? (
        <button type="button" className="lx-text-btn" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
          {open ? 'Show less' : 'Read the full description'}
        </button>
      ) : null}
    </div>
  );
}
