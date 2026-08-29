# Use Cases — Guest via QR (Unauthenticated) v2.0 Exhaustive

**Actor:** Guest (no account, scans QR poster) — ephemeral CUSTOMER after `POST /api/auth/guest` idempotent guard `guestTried+tokens.access`
**Source:** `QrScan.tsx` `ShopPrint.tsx` `Upload.tsx` `Configure.tsx` `QrController` `AuthService.createGuestSession` `SecurityConfig` permitAll, `PrintCalc`, `FUNCTIONALITY.md §2`
**Language:** English — Frontend + Backend per row incl smallest UI details (badge tono, icon size, color, placeholder, button text).

> Every row = one testable use case. Covers happy, alternate, error + smallest UI details. Prefix `UC-G-`.

---

## UC-G-01 — Scan Valid QR Code (ACTIVE)

- **Goal:** Reach correct shop upload in one scan.
- **Pre:** Poster codeValue ACTIVE UNIQUE 64 backend up, client at `/qr/:code`.
- **Trigger:** `GET /qr/:code` route mount useEffect.
- **Main Flow:** 1 `GET /api/qr/:code/resolve` → 200 {shopId, status ACTIVE, shopSnapshot} 2 `POST /api/qr/:code/scan` fireAndForget insert qr_scan_events ip ua 200 3 `GET /api/shops/:shopId` permitAll fetch name city status 4 `localStorage set inko.qrShop JSON {shopId,name,code}` 5 if !inko.access_token → `POST /api/auth/guest` {} → 201 {accessToken 15m, refreshToken 7d, user guest-UUID@guest.inko.local ROLE_CUSTOMER} tokens.set + setSessionArea customer + GET /users/me refreshMe 6 `nav /upload?shopId=xxx&src=qr replace`.
- **Alt:** if access exists skip mint, keep existing token.
- **Error:** 404 not found → `AlertTriangle amber h10 w10 QR not found + Invalid or expired + Button Continue without QR → /upload` (no shopId).
- **UI Details:** Loading mesh-gradient Store icon h12 w12 pulse animate-pulse brand-gradient + text Opening print dashboard… + Skeleton h2 w40 + Resolving QR…; Error card max-w-xl p6 center AlertTriangle amber, Link text-sm font-medium oklch Hover underline.
- **Post:** inko.qrShop set, ephemeral CUSTOMER JWT usable for upload/order.
- **Related:** UC-G-02, UC-G-08.

## UC-G-02 — Scan REPLACED/EXPIRED QR

- **Goal:** Inform replaced/expired but allow continue.
- **Pre:** QR status REPLACED (replacedById) or EXPIRED.
- **Flow:** `GET /resolve` 200 status REPLACED → UI Banner amber QR replaced Old→New chain arrow + Button Continue without QR; EXPIRED similar Expired banner.
- **Backend:** QrService resolve returns status REPLACED but should block? Currently allows — P1.
- **Error:** If REPLACED still resolves → old QR works (should be 404).
- **UI:** Banner border amber bg amber-50 px4 py3.

## UC-G-03 — Scan Invalid / Unknown Code 404

- **Goal:** Graceful not-found.
- **Flow:** GET /resolve 404 → catch (e) setErr apiErrorMessage 400→QR not found.
- **UI:** Card max-w-xl AlertTriangle h10 amber title QR not found mt2 text-xl bold + p mt1 text-sm slate-500 + Link /upload Continue without QR.
- **Post:** No shopId assumed, Configure must require select.

## UC-G-04 — Shop Landing After Scan (ShopPrint)

- **Goal:** Confirm shop identity before upload.
- **Pre:** resolve succeeded shop fetched.
- **Flow:** ShopPrint shows shop card name–city Badge OPEN success, city, supportsColor, address if present.
- **UI:** Card rounded-2xl border slate200 p6 Store icon.

## UC-G-05 — Guest Name Card Save & Remember

- **Goal:** Shop knows owner, appear in queue 👤.
- **Pre:** isGuest true (user email ends @guest.inko.local or no user), fromQr && preselectedShop.
- **Flow:** Card Label Your name — so shop knows whose print it is Input guestName max120 placeholder Priya Sharma + Button Save & remember secondary loading + if !user POST /auth/guest then PATCH /users/me {fullName} → refreshMe else PATCH directly → localStorage inko.guestName trim → toast Thanks! We'll remember.
- **Error:** 401 if not authed → mint again; empty trim disabled button.
- **UI:** Input h10 rounded-xl border slate200 + Button secondary; success text emerald-700 Printing as {fullName} ✓.
- **Post:** fullName visible in queueManage 👤.

## UC-G-06 — Guest Upsell Login/Create Account

- **Goal:** Convert guest to registered keep history.
- **Flow:** Card indigo 50/70 border indigo200 px4 py3 flex flex-wrap gap3 text Want to keep order history & payment receipts? LogIn → /login?next=%2Fupload%3FshopId… Create account → /register?next=…
- **UI:** Buttons LogIn slate900 Calendar UserPlus white border slate300 h4 w4.

## UC-G-07 — Shop Pre-selected Chip (QR locked)

- **Goal:** Show QR locked, allow clear.
- **Flow:** if fromQr && preselectedShop Chip rounded-xl border emerald200 bg-emerald-50 px4 py3 flex gap3 emerald text Scanned at shop #slice8 + Badge QR emerald ml-auto + Link Clear X→/upload.
- **UI:** QrCode h5 emerald600.

## UC-G-08 — Dropzone Upload (≤50MB ≤10 files)

- **Goal:** Select files for analyze.
- **Flow:** Dropzone m1 rounded-2xl dashed-2 p8 border slate200 bg-slate50/50 dragover oklch bg oklch/0.12, Icon UploadCloud h7, title Drop files here or browse h15 font-semibold, Button Browse files accept .pdf/.jpg/.jpeg/.png/.doc/.docx/.ppt/.pptx/.xls/.xlsx/.txt hidden input multiple, FileChips grid2 h10 w10 slate50 border icon File/JPG/PDF + name truncate + bytes formatBytes + X remove rounded-lg hover slate100.
- **Validation:** over 50MB Alert N file(s) exceed 50MB, slice 0-10.
- **Error:** no files → Select at least one file Alert.

## UC-G-09 — Upload & Analyze Progress

- **Goal:** Analyze pages.
- **Flow:** Button primary Upload & analyze ArrowRight h4 FormData files[] POST /api/documents/upload multipart onUploadProgress e.loaded/total*95 → Progress h2 value clamped 0-100 oklch + spinner border-slate200 border-t oklch animate-spin Uploading & analyzing … + 95% text.
- **Error:** 413 too large, 400 ext invalid → Alert network friendly.
- **Post:** result array docs normalized length documents/data flat.

## UC-G-10 — Analyzed Result Cards

- **Goal:** Show analysis.
- **Flow:** Header CheckCircle2 h8 w8 bg-emerald500 text white Analysis complete + Badge Ready success + grid cards per doc thumbnail 20x14 + filename truncate + text-xs pages size mime Badge neutral mime + Badge brand pages + Badge warning blank amber AlertTriangle, blankPages array join bg-amber50.
- **Fallback:** Raw JSON pre slate900 if shape unknown.

## UC-G-11 — Continue to Configure (Guest)

- **Goal:** Go configure with docs.
- **Flow:** Button secondary Continue to configure → nav /configure?shopId state docs normalized (Array.isArray(result)?result:result.documents ?? data).
- **Post:** Configure docs length >0 else No documents found Card FileText h10 slate300 Go to upload.

## UC-G-12 — Guest Track Queue

- **Goal:** Guest can track via guest customerId.
- **Flow:** After order PAID/COD → token A001 WAITING → Customer Queue /queue/:shopId?order= GET /shops/:id/queue + GET /tokens/:id/wait waitingAhead estimate 0.4*pages+1*job Mine Card 5xl tokenNumber Badge Position Est wait.
- **Post:** Guest JWT still valid 15m refresh 7d.

## UC-G-13 — Continue without QR from Error

- **Goal:** Guest without QR path works.
- **Flow:** Click Continue without QR → /upload no shopId → Configure Select shop dropdown required error Select a shop → POST /orders 400 shopId is required block — frontend + backend double validate.
- **UI:** Select shop placeholder Select shop + helper Shop {name} — {city} visible when selected.

## UC-G-14 — Guest Docs Not Migrated on Register (Deferred)

- **Goal:** Document note deferred not failure.
- **Flow:** Guest uploads → later Register CUSTOMER → documents remain linked to guest UUID not migrated to new userId — known deferred, not failure. Guest history not carried.
- **UI:** History empty after register — Upload again.

---

*All guest use cases verified code-static; live PG BLOCKED re-verify after Docker fix.*


