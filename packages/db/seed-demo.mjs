/**
 * tools/seed-demo.mjs
 *
 * Demo identities for a review environment. Idempotent: re-running promotes
 * nothing and overwrites no password.
 *
 *   ADMIN    admin@maihan.local      ADMIN_SUPER
 *   CUSTOMER customer@maihan.local   (admin_role NULL)
 *   VENDOR   vendor@maihan.local     OWNER of "Atelier North"
 *   + one PENDING vendor for the approval flow
 *
 * Passwords are demo defaults and must be changed before any real use.
 * Usage: DATABASE_URL=... node tools/seed-demo.mjs
 */
import { randomBytes, scryptSync } from 'node:crypto';
import { Client } from 'pg';

const PASSWORD = process.env.DEMO_PASSWORD ?? 'MaihanDemo!2026';
const Scrypt = { N: 16384, r: 8, p: 1, keylen: 64 };

function hash(password) {
  const salt = randomBytes(16);
  const derived = scryptSync(password, salt, Scrypt.keylen, {
    N: Scrypt.N,
    r: Scrypt.r,
    p: Scrypt.p,
    maxmem: 64 * 1024 * 1024,
  });
  return ['scrypt', Scrypt.N, Scrypt.r, Scrypt.p, salt.toString('base64'), derived.toString('base64')].join('$');
}

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL missing');
const db = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await db.connect();

async function user(email, displayName, adminRole) {
  const existing = await db.query('select id from users where email = $1', [email]);
  if (existing.rowCount > 0) return existing.rows[0].id;
  const r = await db.query(
    'insert into users (email, password_hash, display_name, admin_role) values ($1,$2,$3,$4) returning id',
    [email, hash(PASSWORD), displayName, adminRole],
  );
  return r.rows[0].id;
}

const adminId = await user('admin@maihan.local', 'Maihan Admin', 'ADMIN_SUPER');
const customerId = await user('customer@maihan.local', 'Demo Client', null);
const vendorUserId = await user('vendor@maihan.local', 'Atelier North', null);

async function vendor(slug, display, email, state) {
  const existing = await db.query('select id from vendors where slug = $1', [slug]);
  if (existing.rowCount > 0) return existing.rows[0].id;
  const r = await db.query(
    'insert into vendors (slug, display_name, email, state, commission_bps, approved_at, approved_by) values ($1,$2,$3,$4,1500,$5,$6) returning id',
    [slug, display, email, state, state === 'APPROVED' ? new Date().toISOString() : null, state === 'APPROVED' ? adminId : null],
  );
  return r.rows[0].id;
}

const approvedVendorId = await vendor('atelier-north', 'Atelier North', 'vendor@maihan.local', 'APPROVED');
await vendor('gems-of-ceylon', 'Gems of Ceylon', 'ceylon@maihan.local', 'PENDING');

await db.query(
  `insert into vendor_members (vendor_id, user_id, role) values ($1,$2,'OWNER')
   on conflict (vendor_id, user_id) do update set role = excluded.role`,
  [approvedVendorId, vendorUserId],
);

const counts = await db.query(
  'select (select count(*)::int from users) users, (select count(*)::int from vendors) vendors, (select count(*)::int from vendor_members) members',
);
console.log(JSON.stringify({ ok: true, password: PASSWORD, adminId, customerId, vendorUserId, ...counts.rows[0] }));
await db.end();
