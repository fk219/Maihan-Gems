'use client';

import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '../ui/button.js';
import { Field, FieldGroup, FieldLabel } from '../ui/field.js';
import { Input } from '../ui/input.js';
import { Textarea } from '../ui/textarea.js';

/** Writes a viewing note to the atelier inbox. It does not invent a booking. */
export function ViewingRequest({ email }: { email: string }) {
  const [name, setName] = useState('');
  const [note, setNote] = useState('');
  if (!email || /example\.(com|test)/i.test(email)) {
    return (
      <section className="salon-note">
        <h2>Request a viewing</h2>
        <p>A public inbox is not published yet. Visits stay by appointment.</p>
      </section>
    );
  }

  return (
    <form
      className="salon-note"
      onSubmit={(event) => {
        event.preventDefault();
        const subject = encodeURIComponent('Private viewing');
        const body = encodeURIComponent(`${name}\n\n${note}`);
        window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
        toast('Opening your mail to the atelier');
      }}
    >
      <h2>Request a viewing</h2>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="view-name">Name</FieldLabel>
          <Input id="view-name" required value={name} onChange={(event) => setName(event.target.value)} />
        </Field>
        <Field>
          <FieldLabel htmlFor="view-note">What you want to see</FieldLabel>
          <Textarea id="view-note" required value={note} onChange={(event) => setNote(event.target.value)} />
        </Field>
      </FieldGroup>
      <Button type="submit">Write to the atelier</Button>
    </form>
  );
}
