'use client';

/**
 * apps/web/src/components/vendor/VendorWorkspaces.tsx
 *
 * Interactive client workspaces for the Vendor Portal:
 * - VendorProductWorkspace: Create product, edit product/stock/price, validate
 *   image uploads, submit product for moderation review, view rejection reasons.
 * - VendorOrdersWorkspace: View vendor-scoped order items and update shipment
 *   fulfilment status with carrier and tracking number.
 * - VendorProfileWorkspace: Update vendor business profile and bourse details.
 */
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { VendorOrderLineDto, VendorProductDto, VendorProfileDto } from '@maihan/db';

import { Badge } from '../ui/badge.js';
import { Button } from '../ui/button.js';
import { Input } from '../ui/input.js';
import { Label } from '../ui/label.js';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '../ui/sheet.js';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table.js';

export function VendorProductWorkspace({
  vendorStatus,
  initialProducts,
}: {
  vendorStatus: string;
  initialProducts: VendorProductDto[];
}) {
  const router = useRouter();
  const [products, setProducts] = useState<VendorProductDto[]>(initialProducts);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [sku, setSku] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [kind, setKind] = useState<'LOOSE_STONE' | 'STONE_PAIR' | 'READY_MADE'>('LOOSE_STONE');
  const [jewelleryType, setJewelleryType] = useState<'RING' | 'EARRINGS' | 'NECKLACE' | 'PENDANT' | 'BRACELET'>('RING');
  const [priceAmount, setPriceAmount] = useState('');
  const [inventoryQuantity, setInventoryQuantity] = useState('1');
  const [caratWeight, setCaratWeight] = useState('');
  const [stoneType, setStoneType] = useState('Sapphire');
  const [shape, setShape] = useState('OVAL');
  const [originCountry, setOriginCountry] = useState('Sri Lanka');
  const [treatmentStatus, setTreatmentStatus] = useState('No Enhancement (Unheated)');
  const [metalType, setMetalType] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const isApprovedVendor = vendorStatus === 'APPROVED';

  async function reloadProducts() {
    const res = await fetch('/api/v1/vendor/products');
    if (res.ok) {
      const body = (await res.json()) as { data?: { products?: VendorProductDto[] } };
      if (body.data?.products) setProducts(body.data.products);
    }
    router.refresh();
  }

  function startCreate() {
    setEditingId(null);
    setSku('');
    setTitle('');
    setDescription('');
    setKind('LOOSE_STONE');
    setJewelleryType('RING');
    setPriceAmount('');
    setInventoryQuantity('1');
    setCaratWeight('');
    setStoneType('Sapphire');
    setShape('OVAL');
    setOriginCountry('Sri Lanka');
    setTreatmentStatus('No Enhancement (Unheated)');
    setMetalType('');
    setImageUrl('');
    setShowForm(true);
    setError(null);
    setMessage(null);
  }

  function startEdit(p: VendorProductDto) {
    setEditingId(p.id);
    setSku(p.sku);
    setTitle(p.title);
    setDescription(p.description ?? '');
    setKind(p.kind);
    setJewelleryType(p.jewellery_type);
    setPriceAmount(p.price_amount);
    setInventoryQuantity(String(p.inventory_quantity));
    setCaratWeight(p.total_weight_ct ?? '');
    setStoneType(p.stone_type ?? '');
    setShape(p.shape ?? '');
    setOriginCountry(p.origin_country ?? '');
    setTreatmentStatus(p.treatment_status ?? '');
    setMetalType(p.metal_type ?? '');
    setImageUrl(p.images[0] ?? '');
    setShowForm(true);
    setError(null);
    setMessage(null);
  }

  async function handleSaveProduct(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const payload = {
        sku: sku.trim(),
        title: title.trim(),
        description: description.trim() || undefined,
        kind,
        jewellery_type: jewelleryType,
        price_amount: Number(priceAmount),
        inventory_quantity: Number(inventoryQuantity),
        total_weight_ct: caratWeight.trim() ? Number(caratWeight) : undefined,
        stone_type: stoneType.trim() || undefined,
        shape: shape.trim() || undefined,
        origin_country: originCountry.trim() || undefined,
        treatment_status: treatmentStatus.trim() || undefined,
        metal_type: metalType.trim() || undefined,
        images: imageUrl.trim()
          ? [{ url: imageUrl.trim(), mime_type: 'image/jpeg', bytes: 204800, alt_text: title.trim() }]
          : [],
      };
      const url = editingId
        ? `/api/v1/vendor/products/${encodeURIComponent(editingId)}`
        : '/api/v1/vendor/products';
      const method = editingId ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
      if (!res.ok) {
        setError(body?.error?.message ?? 'Product could not be saved.');
        return;
      }
      setMessage(
        editingId
          ? 'Product updated and returned to DRAFT for moderation review.'
          : 'Draft product created. Submit it for review when ready to publish.',
      );
      setShowForm(false);
      setEditingId(null);
      await reloadProducts();
    } catch {
      setError('Vendor product service is unreachable.');
    } finally {
      setBusy(false);
    }
  }

  async function handleSubmitForReview(productId: string) {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/v1/vendor/products/${encodeURIComponent(productId)}/submit`, {
        method: 'POST',
      });
      const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
      if (!res.ok) {
        setError(body?.error?.message ?? 'Product could not be submitted for review.');
        return;
      }
      setMessage('Product submitted to the Maihan Gems catalogue moderation queue.');
      await reloadProducts();
    } catch {
      setError('Vendor service is unreachable.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      {!isApprovedVendor ? (
        <div className="lx-account-error" style={{ marginBottom: '1.5rem' }} role="status">
          Your vendor account status is <strong>{vendorStatus}</strong>. Product creation and submission
          are unlocked once an administrator approves your vendor onboarding.
        </div>
      ) : null}

      {error ? (
        <p className="lx-account-error" role="alert" style={{ marginBottom: '1rem' }}>
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="lx-account-success" role="status" style={{ marginBottom: '1rem' }}>
          {message}
        </p>
      ) : null}

      {isApprovedVendor ? (
        <div style={{ marginBottom: '1.5rem' }}>
          <Button type="button" onClick={startCreate}>
            Create a product
          </Button>
        </div>
      ) : null}

      <Sheet
        open={showForm}
        onOpenChange={(open) => {
          if (!open) {
            setShowForm(false);
            setEditingId(null);
          }
        }}
      >
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{editingId ? 'Edit product' : 'New vault product'}</SheetTitle>
            <SheetDescription>Saved as a draft. It stays off the storefront until moderation publishes it.</SheetDescription>
          </SheetHeader>
          <form onSubmit={handleSaveProduct}>
          <div className="lx-account-form">
            <div className="lx-account-form__row lx-account-form__row--two">
              <div className="lx-account-field">
                <label htmlFor="vp-sku">SKU (Unique)</label>
                <input
                  id="vp-sku"
                  required
                  disabled={Boolean(editingId)}
                  value={sku}
                  onChange={(e) => setSku(e.target.value.toUpperCase())}
                />
              </div>
              <div className="lx-account-field">
                <label htmlFor="vp-title">Product Title</label>
                <input
                  id="vp-title"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
            </div>

            <div className="lx-account-form__row lx-account-form__row--two">
              <div className="lx-account-field">
                <label htmlFor="vp-kind">Product Kind</label>
                <select
                  id="vp-kind"
                  value={kind}
                  onChange={(e) => setKind(e.target.value as typeof kind)}
                >
                  <option value="LOOSE_STONE">Natural Loose Gemstone</option>
                  <option value="STONE_PAIR">Matched Gemstone Pair</option>
                  <option value="READY_MADE">Finished Fine Jewellery</option>
                </select>
              </div>
              <div className="lx-account-field">
                <label htmlFor="vp-jtype">Jewellery Category</label>
                <select
                  id="vp-jtype"
                  value={jewelleryType}
                  onChange={(e) => setJewelleryType(e.target.value as typeof jewelleryType)}
                >
                  <option value="RING">Ring</option>
                  <option value="EARRINGS">Earrings</option>
                  <option value="PENDANT">Pendant</option>
                  <option value="NECKLACE">Necklace</option>
                  <option value="BRACELET">Bracelet</option>
                </select>
              </div>
            </div>

            <div className="lx-account-form__row lx-account-form__row--two">
              <div className="lx-account-field">
                <label htmlFor="vp-price">Price (USD)</label>
                <input
                  id="vp-price"
                  type="number"
                  step="0.01"
                  min="1"
                  required
                  value={priceAmount}
                  onChange={(e) => setPriceAmount(e.target.value)}
                />
              </div>
              <div className="lx-account-field">
                <label htmlFor="vp-qty">Available Stock Quantity</label>
                <input
                  id="vp-qty"
                  type="number"
                  min="0"
                  max="10000"
                  required
                  value={inventoryQuantity}
                  onChange={(e) => setInventoryQuantity(e.target.value)}
                />
              </div>
            </div>

            <div className="lx-account-form__row lx-account-form__row--two">
              <div className="lx-account-field">
                <label htmlFor="vp-carat">Total Carat Weight (ct)</label>
                <input
                  id="vp-carat"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={caratWeight}
                  onChange={(e) => setCaratWeight(e.target.value)}
                />
              </div>
              <div className="lx-account-field">
                <label htmlFor="vp-stone">Gemstone Variety / Species</label>
                <input
                  id="vp-stone"
                  value={stoneType}
                  onChange={(e) => setStoneType(e.target.value)}
                />
              </div>
            </div>

            <div className="lx-account-form__row lx-account-form__row--two">
              <div className="lx-account-field">
                <label htmlFor="vp-shape">Shape / Cut</label>
                <input
                  id="vp-shape"
                  value={shape}
                  onChange={(e) => setShape(e.target.value)}
                />
              </div>
              <div className="lx-account-field">
                <label htmlFor="vp-origin">Geographic Origin</label>
                <input
                  id="vp-origin"
                  value={originCountry}
                  onChange={(e) => setOriginCountry(e.target.value)}
                />
              </div>
            </div>

            <div className="lx-account-form__row lx-account-form__row--two">
              <div className="lx-account-field">
                <label htmlFor="vp-treatment">Treatment Disclosure</label>
                <input
                  id="vp-treatment"
                  value={treatmentStatus}
                  onChange={(e) => setTreatmentStatus(e.target.value)}
                />
              </div>
              <div className="lx-account-field">
                <Label htmlFor="vp-image">Primary image</Label>
                <Input
                  id="vp-image"
                  placeholder="https://"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                />
                <p className="operator-upload">
                  <strong>
                    {imageUrl.trim() === ''
                      ? 'Awaiting a file address'
                      : /^https?:\/\/\S+$/.test(imageUrl.trim())
                        ? 'Address linked'
                        : 'Not a usable URL'}
                  </strong>
                  JPEG, PNG or WebP. The house does not upload bytes from this form — paste the hosted address.
                </p>
              </div>
            </div>

            <div className="lx-account-field">
              <label htmlFor="vp-desc">Gemmological Description</label>
              <input
                id="vp-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <button type="submit" className="lx-btn lx-btn--solid" disabled={busy}>
                {busy ? 'Saving…' : editingId ? 'Save Changes (Draft)' : 'Save Draft Product'}
              </button>
              <button
                type="button"
                className="lx-btn lx-btn--ghost"
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </form>
        </SheetContent>
      </Sheet>

      {products.length === 0 ? (
        <div className="admin-empty">No products created under your vendor account yet.</div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Kind</TableHead>
              <TableHead>Price (USD)</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead>Moderation</TableHead>
              <TableHead>Storefront</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((p) => (
              <TableRow key={p.id}>
                <TableCell>
                  <strong>{p.title}</strong>
                  {p.rejection_reason ? <div>Rejection note: {p.rejection_reason}</div> : null}
                </TableCell>
                <TableCell>
                  <code>{p.sku}</code>
                </TableCell>
                <TableCell>{p.kind}</TableCell>
                <TableCell>${p.price_amount}</TableCell>
                <TableCell>{p.inventory_quantity}</TableCell>
                <TableCell>
                  <Badge
                    variant={
                      p.moderation_status === 'PUBLISHED' || p.moderation_status === 'APPROVED'
                        ? 'default'
                        : p.moderation_status === 'REJECTED'
                          ? 'destructive'
                          : 'secondary'
                    }
                  >
                    {p.moderation_status}
                  </Badge>
                </TableCell>
                <TableCell>{p.state}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-2">
                    {isApprovedVendor ? (
                      <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => startEdit(p)}>
                        Edit
                      </Button>
                    ) : null}
                    {isApprovedVendor && (p.moderation_status === 'DRAFT' || p.moderation_status === 'REJECTED') ? (
                      <Button type="button" size="sm" disabled={busy} onClick={() => void handleSubmitForReview(p.id)}>
                        Submit for review
                      </Button>
                    ) : null}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

export function VendorOrdersWorkspace({
  initialOrders,
}: {
  initialOrders: VendorOrderLineDto[];
}) {
  const router = useRouter();
  const [orders, setOrders] = useState<VendorOrderLineDto[]>(initialOrders);
  const [activeItem, setActiveItem] = useState<string | null>(null);
  const [carrier, setCarrier] = useState('Malca-Amit Armored');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function reloadOrders() {
    const res = await fetch('/api/v1/vendor/orders');
    if (res.ok) {
      const body = (await res.json()) as { data?: { orders?: VendorOrderLineDto[] } };
      if (body.data?.orders) setOrders(body.data.orders);
    }
    router.refresh();
  }

  async function updateFulfillment(
    line: VendorOrderLineDto,
    nextState: 'IN_FULFILLMENT' | 'SHIPPED' | 'DELIVERED',
  ) {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(
        `/api/v1/vendor/orders/${encodeURIComponent(line.order_id)}/items/${encodeURIComponent(line.order_item_id)}/fulfill`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            state: nextState,
            carrier: nextState === 'SHIPPED' ? carrier.trim() : line.carrier ?? undefined,
            tracking_number:
              nextState === 'SHIPPED' ? trackingNumber.trim() : line.tracking_number ?? undefined,
          }),
        },
      );
      const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
      if (!res.ok) {
        setError(body?.error?.message ?? 'Fulfilment update failed.');
        return;
      }
      setMessage(`Order ${line.order_number} line updated to ${nextState}.`);
      setActiveItem(null);
      await reloadOrders();
    } catch {
      setError('Vendor fulfilment service is unreachable.');
    } finally {
      setBusy(false);
    }
  }

  if (orders.length === 0) {
    return <div className="admin-empty">No customer orders contain your products yet.</div>;
  }

  return (
    <div>
      {error ? (
        <p className="lx-account-error" role="alert" style={{ marginBottom: '1rem' }}>
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="lx-account-success" role="status" style={{ marginBottom: '1rem' }}>
          {message}
        </p>
      ) : null}

      <table className="admin-table">
        <thead>
          <tr>
            <th>Order</th>
            <th>Piece</th>
            <th>Qty</th>
            <th>Line Total</th>
            <th>Destination</th>
            <th>Fulfilment</th>
            <th>Tracking</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((line) => (
            <tr key={line.order_item_id}>
              <td>
                <code>{line.order_number}</code>
              </td>
              <td>{line.title_snapshot}</td>
              <td>×{line.quantity}</td>
              <td>USD {line.line_total}</td>
              <td>{[line.shipping_city, line.shipping_country].filter(Boolean).join(', ') || '—'}</td>
              <td>
                <span
                  className={`admin-badge ${
                    line.fulfillment_state === 'DELIVERED' || line.fulfillment_state === 'SHIPPED'
                      ? 'admin-badge--ok'
                      : ''
                  }`}
                >
                  {line.fulfillment_state}
                </span>
              </td>
              <td>
                {line.tracking_number ? `${line.carrier ?? ''} · ${line.tracking_number}` : '—'}
              </td>
              <td>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {line.fulfillment_state === 'PENDING' ? (
                    <button
                      type="button"
                      className="lx-text-btn"
                      disabled={busy}
                      onClick={() => void updateFulfillment(line, 'IN_FULFILLMENT')}
                    >
                      Start prep
                    </button>
                  ) : null}
                  {line.fulfillment_state !== 'SHIPPED' && line.fulfillment_state !== 'DELIVERED' ? (
                    <button
                      type="button"
                      className="lx-text-btn"
                      disabled={busy}
                      onClick={() => {
                        setActiveItem(line.order_item_id);
                        setTrackingNumber('');
                      }}
                    >
                      Mark shipped
                    </button>
                  ) : null}
                  {line.fulfillment_state === 'SHIPPED' ? (
                    <button
                      type="button"
                      className="lx-text-btn"
                      disabled={busy}
                      onClick={() => void updateFulfillment(line, 'DELIVERED')}
                    >
                      Mark delivered
                    </button>
                  ) : null}
                </div>
                {activeItem === line.order_item_id ? (
                  <div style={{ marginTop: '0.6rem', display: 'grid', gap: '0.4rem' }}>
                    <input
                      aria-label="Carrier"
                      placeholder="Carrier (e.g. Malca-Amit)"
                      value={carrier}
                      onChange={(e) => setCarrier(e.target.value)}
                      style={{ padding: '0.35rem 0.5rem', fontSize: '0.75rem' }}
                    />
                    <input
                      aria-label="Tracking number"
                      placeholder="Tracking number"
                      value={trackingNumber}
                      onChange={(e) => setTrackingNumber(e.target.value)}
                      style={{ padding: '0.35rem 0.5rem', fontSize: '0.75rem' }}
                    />
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        type="button"
                        className="lx-btn lx-btn--solid"
                        disabled={busy}
                        onClick={() => void updateFulfillment(line, 'SHIPPED')}
                      >
                        Confirm dispatch
                      </button>
                      <button
                        type="button"
                        className="lx-text-btn"
                        onClick={() => setActiveItem(null)}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function VendorProfileWorkspace({ profile }: { profile: VendorProfileDto }) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(profile.display_name);
  const [legalName, setLegalName] = useState(profile.legal_name);
  const [countryCode, setCountryCode] = useState(profile.country_code);
  const [city, setCity] = useState(profile.city);
  const [bourseMember, setBourseMember] = useState(profile.bourse_member);
  const [contactPhone, setContactPhone] = useState(profile.contact_phone ?? '');
  const [description, setDescription] = useState(profile.description ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch('/api/v1/vendor/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          display_name: displayName,
          legal_name: legalName,
          country_code: countryCode,
          city,
          bourse_member: bourseMember,
          contact_phone: contactPhone,
          description,
        }),
      });
      const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
      if (!res.ok) {
        setError(body?.error?.message ?? 'Profile could not be updated.');
        return;
      }
      setSaved(true);
      router.refresh();
    } catch {
      setError('Vendor profile service is unreachable.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="admin-panel" onSubmit={handleSubmit}>
      <h2>Trade Partner Profile</h2>
      <div className="lx-account-form">
        <div className="lx-account-form__row lx-account-form__row--two">
          <div className="lx-account-field">
            <label htmlFor="vf-display">Display Name</label>
            <input
              id="vf-display"
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </div>
          <div className="lx-account-field">
            <label htmlFor="vf-legal">Legal Entity Name</label>
            <input
              id="vf-legal"
              required
              value={legalName}
              onChange={(e) => setLegalName(e.target.value)}
            />
          </div>
        </div>
        <div className="lx-account-form__row lx-account-form__row--two">
          <div className="lx-account-field">
            <label htmlFor="vf-city">Bourse City</label>
            <input id="vf-city" required value={city} onChange={(e) => setCity(e.target.value)} />
          </div>
          <div className="lx-account-field">
            <label htmlFor="vf-country">Country Code (ISO-2)</label>
            <input
              id="vf-country"
              required
              maxLength={2}
              value={countryCode}
              onChange={(e) => setCountryCode(e.target.value.toUpperCase())}
            />
          </div>
        </div>
        <div className="lx-account-form__row lx-account-form__row--two">
          <div className="lx-account-field">
            <label htmlFor="vf-phone">Trade Desk Phone</label>
            <input
              id="vf-phone"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
            />
          </div>
          <div className="lx-account-field">
            <label htmlFor="vf-bourse">
              <input
                id="vf-bourse"
                type="checkbox"
                checked={bourseMember}
                onChange={(e) => setBourseMember(e.target.checked)}
              />{' '}
              Affiliated Bourse Member (WFDB / ICA / DMCC / BGL)
            </label>
          </div>
        </div>
        <div className="lx-account-field">
          <label htmlFor="vf-desc">House Specialisation &amp; Provenance Notes</label>
          <input
            id="vf-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        {error ? (
          <p className="lx-account-error" role="alert">
            {error}
          </p>
        ) : null}
        {saved ? (
          <p className="lx-account-success" role="status">
            Vendor profile saved.
          </p>
        ) : null}
        <button type="submit" className="lx-btn lx-btn--solid" disabled={busy}>
          {busy ? 'Saving…' : 'Save Vendor Profile'}
        </button>
      </div>
    </form>
  );
}
