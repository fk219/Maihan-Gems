/**
 * Public storefront placeholders. These are not NGC source details and are
 * not secrets — replace with live Maihan values when the house publishes them.
 */
export const STOREFRONT_CONTACT = {
  brand: 'Maihan Gems',
  phoneDisplay: '+971 4 000 0000',
  phoneHref: 'tel:+97140000000',
  email: 'hello@maihan.example',
  hours: 'Mon–Fri 10:00–18:00',
  appointmentLabel: 'Showroom by appointment',
  city: 'Dubai',
  region: 'United Arab Emirates',
  addressLine: 'Atelier by appointment · Dubai',
} as const;

const PLACEHOLDER_CONTACT = /000\s*0000|example\.(com|test)/i;

/** A configured phone, or null when the value is still a placeholder. */
export function publishedPhone(): { display: string; href: string } | null {
  if (PLACEHOLDER_CONTACT.test(STOREFRONT_CONTACT.phoneDisplay)) return null;
  return { display: STOREFRONT_CONTACT.phoneDisplay, href: STOREFRONT_CONTACT.phoneHref };
}

/** A configured inbox, or null when the value is still a placeholder. */
export function publishedEmail(): string | null {
  if (PLACEHOLDER_CONTACT.test(STOREFRONT_CONTACT.email)) return null;
  return STOREFRONT_CONTACT.email;
}
