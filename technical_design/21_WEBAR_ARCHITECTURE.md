# 21 WEBAR ARCHITECTURE

**Package:** `technical_design/` doc 21 of 40
**Authority:** `PROJECT_SOURCE_OF_TRUTH.md` section 21, charter section 32.
**Evidence status:** entirely `[INFERRED / PROPOSED]`. This is the one capability in the platform with **no source precedent**.

---

## Purpose

Define an on-device AR try-on: runtime, asset pipeline, tracking and placement, performance budget, fallback matrix, QR handoff and privacy.

## 1. Evidence position, and why this doc is the cost risk

`[VERIFIED][DEFECT D4]` The source contains **no WebGL or GLB assets**. The `three_d` (6,923) and `three_sixty` (855) asset classes are Nuxt JavaScript bundles misclassified because hex filenames contained `3d` or `360`. Genuine 360-degree material exists as mp4 plus thumbnails at `phone-video.naturalgemstones.com`.

That correction removes a false assumption and creates the real one: the 3D asset pipeline is a from-scratch production problem. With 951 designs to model, retopologise, texture and compress, **WebAR is the single largest cost risk in this architecture**, and it must be scoped explicitly rather than discovered during implementation.

It is also the most deferrable capability on the list. Nothing else in the platform depends on it.

## 2. Runtime architecture

```text
Browser, client only, no SSR
  +-- getUserMedia({video: {facingMode: 'user'}})   frames stay on device
  +-- MediaPipe HandLandmarker (WASM + GPU delegate)
  |     -> 21 landmarks at 30-60fps: handedness, pinch distance, orientation
  +-- Three.js scene
  |     -> GLB from R2/CDN, Draco-compressed
  |     -> PBR materials, HDR environment
  |     -> anchored to the finger proximal phalanx segment
  +-- WebXR DeviceOrientation fallback for wrist and ear positioning
  v
Three.js WebGLRenderer
```

Everything runs client-side. No inference server, no frame upload, no per-session backend cost. That is both a privacy requirement (section 8) and the reason the unit economics work at all.

## 3. Asset pipeline

```text
Source geometry (CAD / scan / modelled)
  -> retopology and decimation to a per-jewellery-type budget
  -> UV unwrap; bake PBR maps (albedo, normal, roughness, metalness, AO)
  -> pack textures to KTX2/Basis, max 1024px
  -> Draco geometry compression
  -> validate poly count, texture size, draw calls, material count
  -> store in R2 at webar/{jewelleryType}/{settingSku}/{version}.glb
  -> webar_assets row: poly_count, vertex_count, file_bytes, fit_rule
  -> emit AssetProcessed
```

Budgets `[INFERRED]`, to be validated by measurement on real low-tier devices:

| Jewellery type | Target triangles | Target GLB | Max textures |
|---|---:|---:|---:|
| Ring | 60k | 1.8 MB | 4 x 1024 |
| Earrings | 50k | 1.5 MB | 4 x 1024 |
| Pendant | 40k | 1.2 MB | 3 x 1024 |
| Necklace | 90k | 2.6 MB | 4 x 1024 |
| Bracelet | 80k | 2.4 MB | 4 x 1024 |

`fit_rule` per asset stores anchor segment, base scale, rotation offset and the permitted user-adjustment range. Fit is data-driven per design rather than hard-coded, so a designer can correct a bad fit by editing a row rather than shipping code.

## 4. Tracking and placement

MediaPipe HandLandmarker supplies 21 landmarks. Placement sequence:

1. Detect handedness and choose the anchor side.
2. Select the finger explicitly; ring defaults to the ring finger, configurable.
3. Compute the ring axis from that finger's proximal and distal phalanx landmarks.
4. Position at the proximal-intermediate joint; orient so the ring encircles the phalanx.
5. Scale to the phalanx segment length, clamped per asset.
6. Smooth position, rotation and scale with a critically damped spring.
7. Render a depth-only pass of the hand proxy so the band passes behind the finger.

Step 7 is what separates try-on from a sticker. Without occlusion the ring reads as pasted on top of the finger, and no amount of model quality fixes it.

Earrings, pendants and necklaces do not attach to a hand; they use a different placement mode driven by the same landmark data or by device orientation, sharing the smoothing, clamping and fallback machinery.

## 5. Performance

| Technique | Purpose |
|---|---|
| Route-level code splitting | AR never enters the storefront bundle |
| `next/dynamic` with `ssr: false` | AR is client-only by construction |
| Intersection Observer | Load the AR bundle only when the launcher nears the viewport |
| CDN with immutable caching | GLB and KTX2 served with a one-year immutable cache |
| Warm cache on intent | Prefetch the GLB on hover or on AR button focus |
| Progressive texture loading | Low-res first, then full |
| `powerPreference: 'high-performance'`, antialias off on low tier | GPU budget |
| Frame-rate governor | Drop to 30fps or disable shadows on low tier |
| Model reuse | One GLB per setting variant serves every stone in that setting |

The last row is the economic argument. Because SKUs decompose to `setting x stone`, a single ring model serves every stone SKU in that setting. With 951 designs the asset count is bounded by **designs**, not by the 9,812 DYO configurations. Producing 951 assets is expensive; producing 9,812 would have been prohibitive.

## 6. Fallback matrix

| Condition | Fallback |
|---|---|
| No camera permission | Static 3D viewer with drag-to-rotate and zoom |
| No WebGL2 | Static gallery plus the 360 mp4 where one exists for the stone |
| No WebAssembly | Static gallery |
| Low-power or older mobile | Static gallery; AR hidden with an honest explanation |
| Hand not detected for 3s | Prompt to bring the hand into frame, then static viewer |
| Tracking lost | Freeze at the last good pose, fade the model, prompt |
| Asset still processing | AR button disabled, processing state shown |
| Slow network | Gallery while the GLB streams |

**No WebAR failure may block navigation or degrade the product page.** The AR launcher degrades; the page never does. Every fallback is a shipped, tested path rather than an error state.

## 7. QR handoff

Desktop to mobile, `[INFERRED]` per charter 32:

```text
Desktop: POST /api/v1/ar/handoff -> raw token returned, token_hash stored, expires_at 10 min
QR encodes /ar/handoff/{token}
Mobile:  GET  /ar/handoff/{token} -> validate hash, issue session, 302 to /ar/{assetId}
                          -> one-time use recorded, replay rejected
```

Only the hash is stored, so a database leak cannot be replayed. Tokens carry no customer data, no parameters beyond the opaque token, and expire in 10 minutes. No camera image is ever uploaded, so the handoff transfers no imagery.

## 8. Privacy

| Rule | Detail |
|---|---|
| Frames stay on device | Processed in a `<video>` element; never uploaded, stored or sent to analytics |
| Permission on demand only | Requested on an explicit user action, never on page load |
| Page works without it | No functional dependency on camera access |
| Analytics | Session duration, device tier, tracked/not-tracked outcome. Nothing else |
| Consent and dismissal | The prompt states frames are not uploaded or recorded, and remembers the dismissal |

## 9. Validation rules

1. GLB budgets are enforced in the pipeline; an over-budget asset is rejected, not published.
2. `fit_rule` is present and valid before an asset becomes `READY`.
3. An asset that is not `READY` never renders an enabled AR button.
4. Handoff tokens are single-use, hash-only at rest, 10-minute expiry.
5. No frame leaves the device; enforced by an absence-of-upload code review plus a network assertion test.
6. Every device-capability failure resolves to a defined fallback, never an unhandled error.

## 10. Error handling

| Code | Status | Behaviour |
|---|---|---|
| `AR_CAMERA_DENIED` | client | Static 3D viewer |
| `AR_UNSUPPORTED` | client | Static gallery, AR launcher hidden with an explanation |
| `AR_ASSET_NOT_READY` | 404 | Button disabled with a processing state |
| `AR_ASSET_OVER_BUDGET` | pipeline | Rejected at build; never served |
| `AR_HANDOFF_INVALID` | 400 | Expired or unknown token |
| `AR_HANDOFF_REPLAYED` | 409 | Single-use token already consumed |
| `AR_TRACKING_LOST` | client | Freeze, fade, prompt |

## 11. Security boundaries

- No camera frame is transmitted, stored or logged, in any path.
- Handoff tokens are opaque, hash-only at rest, single-use and short-lived.
- GLB assets are public, content-addressed and immutable; they contain no user data.
- Rate limiting on handoff issuance prevents token-flooding.

## 12. Observability

Metrics: AR launcher impressions, permission grant rate, tracking success rate, session duration by device tier, fallback frequency per cause, GLB load latency and byte size, handoff issuance and redemption rate. All client-side, aggregate only, no imagery. Alerts on tracking-success regression (a landmark or Three.js change) and on GLB load latency growth.

## 13. Testing requirements

| Test | Proves |
|---|---|
| Budget enforcement | Over-budget assets rejected at build |
| Fallback matrix | Every condition in section 6 resolves to its defined fallback |
| Page integrity | With AR entirely broken, navigation and the product page are unaffected |
| No upload | A network assertion test proves no frame leaves the device |
| Placement | Synthetic landmark fixtures produce a stable, correctly scaled pose |
| Occlusion | Depth pass renders; the band disappears behind the finger |
| Smoothing | Critically damped spring removes jitter without visible lag |
| Handoff | Expiry, single-use and replay rejection all behave correctly |
| Low tier | Frame-rate governor holds a target frame rate on a low-tier device profile |
| Model reuse | One GLB serves every stone SKU for a setting |

## 14. Failure modes

| Failure | Behaviour |
|---|---|
| Camera denied | Static 3D viewer; page unaffected |
| WebGL2 absent | Gallery plus 360 mp4 |
| Tracking lost | Freeze and fade, then prompt |
| Asset missing or unprocessed | Button disabled with a state, not a broken experience |
| Slow network | Gallery first, GLB streams in |
| Bad fit for a design | `fit_rule` correction without a code change |
| Bundle regression | CI budget check fails the build |

## 15. Implementation constraints

1. Client-side only; no frame ever leaves the device.
2. AR never enters the storefront bundle.
3. One model per setting variant, not per SKU.
4. Every capability failure has a shipped fallback; the page never depends on AR.
5. Asset budgets are enforced in the pipeline.

## 16. Scoping guidance

Because this is the largest cost risk and the only capability with no source precedent:

| Phase | Scope |
|---|---|
| 1 | Rings only, top 20 designs, measured on real low-tier devices |
| 2 | Extend by measured demand, one jewellery type at a time |
| 3 | Earrings and pendants, with non-hand placement modes |
| Deferrable | Necklaces and bracelets are the heaviest assets and the least requested |

Nothing else in this architecture depends on WebAR. If the budget is cut, this is the document to defer, and section 6 guarantees that a deferral costs a feature rather than a page.

## Evidence status

Entirely `[INFERRED / PROPOSED]`. `[VERIFIED]` only the negative finding (D4: no GLB assets; `three_d` and `three_sixty` are misclassified Nuxt bundles) and the existence of 360 mp4 material. No runtime, asset or tracking behaviour is reconstructible from the source.