# Lexi activation flow — prototype spec

Implement this as a flow inside the existing chat feature. Before writing
anything, explore that feature and reuse its components and styling
conventions. All data is mocked — no real APIs. The flow is a simulated
Lexi chat thread that progresses as the user confirms each card; earlier
steps collapse to a confirmed state and remain visible.

## Flow overview
1. Client message → 2. Resolve (interpretation card) → 2a. Playbook prompt
(conditional) → 3. Field mapping card → 4. Schedule card → 5. Confirmation
card → 6. Sent + segment offer.
Each Lexi step renders as: short Lexi message + card + action button(s).
On confirm, action buttons are replaced by a quiet confirmed line
(checkmark + summary text) and the next step appears below.

## Step 1 — Client message
Right-aligned user bubble: "Send my lapsed VIPs to Meta as a custom
audience".

## Step 2 — Resolve card (interpretation)
Lexi message: both terms are in the playbook; the lapsed window is
adjustable.
Card rows:
- "VIP" — Lifetime spend of $1,000 or more. Badge: "Playbook definition"
  (purple/library styling, book icon).
- "Lapsed" — "No orders in the last [select: 90 / 120 / 180 (default) /
  365] days". Sub-note: "Playbook default: 180 days". Badge: "Playbook
definition".
- "Customers matching right now" — large count, updates live with the
  window: 90→6,412 · 120→5,530 · 180→4,218 · 365→2,940.
Actions: "Looks right" (primary) and a secondary "That's not what I meant"
(stub is fine).

## Step 2a — Playbook prompt (only if window ≠ 180)
Lexi message: "You set lapsed to {n} days instead of your playbook default
of 180. How should I treat that?" Three buttons:
1. Just for this audience → confirmed: "Kept as a one-off adjustment —
   playbook default stays at 180 days."
2. Update playbook definition → confirmed: "Playbook definition for lapsed
   updated to {n} days. Your other audiences using lapsed keep 180 unless
   you tell me otherwise."
3. Add new playbook definition → naming card: text input (placeholder
   "Recently lapsed"), logic line "no orders in the last {n} days", live
   uniqueness validation against ["lapsed", "vip", "churn risk",
   "first-time buyers"] — taken names show "That name's already in your
   playbook. Try another."; available names show a success hint and enable
   Save. On save, confirmed line: "\"{name}\" added to your playbook — no
   orders in the last {n} days"; the audience label downstream uses the
   new name.
If window = 180, skip 2a entirely.

## Step 3 — Field mapping card
Lexi message: "I checked your data against what Meta accepts. Here's what
I suggest sending — everything is hashed before it leaves. You can swap
any field, search your full field list, or change which field is the
primary identifier."
Card header: Meta custom audiences (Meta icon).

Row model — each row: left = field label (+ "Primary identifier" badge if
primary) and a why line: "Using your field {field} — {coverage}%
populated" (+ optional note e.g. "3 phone-like fields found"). Right = controls:
- Dropdown listing that row's candidate fields as "{field} — {coverage}%",
  plus a final option "Search another field…". Selecting it opens an
  inline search panel (input + filtered list of the full field catalog
  with name + coverage; cancel button). Picking a result adds it to the
  row's candidates and selects it. Every row gets the search option, even
  single-candidate rows like email (e.g. surfacing optin_email_2026).
- "Set primary" button — only on identifier-capable rows (email, phone)
  that aren't currently primary. Clicking moves the primary badge; exactly
  one primary at all times.
- X (remove) button — on every non-primary row. Removes the row entirely.
  The primary row never shows an X.

Initial rows:
- Email — candidates: email_address (99%). Primary by default.
- Phone — candidates: mobile (92%, default), phone (61%), cell (12%).
  Note: "3 phone-like fields found".

Field catalog (for search): email_address 99, optin_email_2026 41,
contact_email 12, mobile 92, phone 61, cell 12, dob_dd_mm_yyyy 78,
birth_year 33, first_name 97, last_name 96, suburb 88, postcode 91,
state 90, gender 54.

Plain-language add — input beneath the rows: "Want to send anything else?
Just ask." Keyword resolution:
- dob/birth → Date of birth (dob_dd_mm_yyyy, 78%)
- last name/surname → Last name (last_name, 96%)
- first name → First name (first_name, 97%)
- city/suburb → City (suburb, 88% — note: "your field is named suburb,
  Meta calls it city")
- postcode/zip → Postcode (91%) · gender → Gender (54%)
- phone/mobile/cell or email → re-adds those rows with full candidates if
  previously removed
- Already mapped → warning: "{Field} is already in the mapping — use its
  dropdown to change the field."
- Unresolvable → warning listing what Meta accepts: email, phone, first
  name, last name, date of birth, city, state, postcode, gender.

Consent banner (success styling): "{consented} of {audience} customers
have marketing consent and will be sent" — consented = round(audience ×
0.972), recalculates with the lapsed window.
Action: "Confirm mapping".

## Step 4 — Schedule card
Lexi message: "When should this go?"
- Frequency radios: One-off (default) / Recurring — daily.
- One-off: radios Send now (default) / Schedule for later → date input
  (min today) + time input (default 09:00).
- Recurring: Starts date (default today) + Time (default 06:00) + Ends
  select: "No end date" (default) / "On date" → end date input.
- Live preview line at card bottom (calendar icon): plain-language
  restatement, always suffixed "· All times AEST". Examples: "Sends now,
  once" / "Once on 10 Jul 2026 at 3:00 pm" / "Daily at 6:00 am, starting
  3 Jul 2026, ending 31 Jul 2026".
Action: "Confirm schedule" → confirmed line: "Schedule confirmed —
{schedule text} (AEST)".

## Step 5 — Confirmation card
Lexi message: "Here's everything, updated with your schedule. Ready to
go?"
Summary table reflecting current state: Audience ("{name} — {count}
customers"), Definition ("No orders in {n} days + $1,000 lifetime spend"),
Sent to Meta ("{consented} consented customers"), Fields (comma list:
"email (email_address) — primary, phone (mobile), date of birth
(dob_dd_mm_yyyy)"), Schedule ("{schedule text} (AEST)").
Action button label adapts: "Send to Meta now" when send-now, otherwise
"Schedule activation". On click, confirmed line: "Activation sent to Meta"
or "Activation scheduled — {schedule text} (AEST)".

## Step 6 — Segment offer
Lexi message: "All done. One more thing — want me to save this audience as
a reusable segment? It keeps this exact definition so you can use it for
other channels, campaigns, or reporting without rebuilding it."
Buttons: Create segment → confirmed: "Segment \"{name}\" created — no
orders in {n} days + $1,000 lifetime spend. You'll find it in your
segments and can reuse it anywhere." / Not now → confirmed: "No segment
created — you can always ask me to save it later."

## Copy and styling rules
- Sentence case throughout; no exclamation marks in system copy;
  contractions fine.
- Confirmed lines are quiet: small success-coloured text with a check
  icon, not banners.
- Badges: playbook = library/purple treatment; primary identifier =
  accent/blue; adjustments and warnings = amber.
- Match the existing chat feature's design tokens — do not introduce a
  new palette.

## Out of scope
Rejection path at resolve, live-edit of an existing activation,
destination auth errors, and the monitor/sync-health view — stubs or
TODOs are fine.
