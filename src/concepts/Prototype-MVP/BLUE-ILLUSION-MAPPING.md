# Blue Illusion context → Segment V1 — fit analysis & import plan

How the items in `blue-illusion-context.md` map onto the prototype's data model
(`src/data/definitions-mock.ts` + `def-registry.ts`, consumed by `segment-v1`).

## The prototype's five "slots"

| Slot | Array | What belongs here |
|---|---|---|
| **Attribute** (`attr-*`) | `MOCK_ATTRIBUTES` | Raw columns — Country, State, Channel, Store Name, Subscription Status |
| **Metric** (`met-*`) | `MOCK_METRICS` | Aggregations / derived measures — Total Spend, L12M Spend, Spend Decile, Last Order Date |
| **Term** (`def-*`) | `MOCK_DEFINITIONS` | Semantic concepts in prose — High-value, Active, Churned |
| **Segment** (`seg-*`) | `MOCK_SEGMENTS` | Named audiences = filters + SQL + population + activations |
| **Playbook** (`pb-*`) | `MOCK_PLAYBOOK` | Rules, calendars, guidelines (interpretation logic) |

The context file mostly produces **Segments**, sitting on a thin layer of new
**Metrics/Attributes**, governed by a set of **Playbook** interpretation rules.

---

## ✅ Fits well (drop straight into existing primitives)

| Context section | Slot | Backing primitives | Notes |
|---|---|---|---|
| **Loyalty Tiers** (Normals → Pinnacles) | Segments | `met-2 L12M Spend` + `attr-1 Country` | Pinnacle, High Vitals already exist. Add Normals, Value, Vitals. "$500+ members" = a group of the top 3. |
| **Customer Value** (Top 40%, Top 10% Active, High Value Lapsed…) | Segments | `met-5 Spend Decile`, `met-6 Last Order Date` | Top 10% Active & High Value Lapsed already exist. Rest are decile/percentile bands + recency. |
| **Lifecycle / Recency** (New, Returning, Lapsed 6/12/24) | Segments | `met-6 Last Order Date`, `met-7 First Order Date`, `met-3 Order Count` | New Customers, Lapsed 6mo already exist. ⚠️ thresholds conflict (below). |
| **Frequency — lifetime** (Single / 2-3 / Multiple) | Segments | `met-3 Order Count` | Clean fit. |
| **Returns** (Has Returned, High Returner) | Segments | `met-8 Return Rate` | Clean fit. |
| **Geographic** (AU/NZ, US, NZ, State-level) | Segments | `attr-1 Country`, `attr-2 State` | Clean. US split-by-lifecycle just layers recency on Country. |
| **Email & Engagement** (Subscribed, Opt-out, Email Engaged) | Segments | `attr-16 Opt-in`, `attr-17 Subscription Status`, `met-10 Email Open Rate` | Compound ones (Disengaged, Opted-out+Lapsed) are just AND-stacks. |
| **Acquisition cohorts** ("Acquired in 2023") | Segments / 1 new attr | `met-7 First Order Date` | Fits; nicer as a derived "Acquisition Year" attribute. |
| **Birthday** | Segments | `attr-4 Birth Month` | Fits. "No DOB on file" = null handling only. |
| **Event-specific** (Black Friday new vs returning) | Segments | `pb-4 Black Friday` already exists | Scope a segment to the event window + new/returning. |

---

## 🟡 Partial fit (needs a new metric/attribute first)

| Context section | Gap | What to add |
|---|---|---|
| **Discount behaviour** (Full Price → High Discount tiers) | No discount metric exists | New `met Average Discount Level`, derivable from `attr-12 Price Paid` / `attr-13 Full Price`. Then tier segments hang off it. |
| **Frequency — time-windowed** (Frequent Purchaser = 2+ in L12M) | `met-3 Order Count` is lifetime only | New `met L12M Order Count` (windowed). |
| **Channel preference** (Online Only / Offline Only / Omnichannel, First/Last Order Channel) | `attr-8 Channel` is at *order* grain, not rolled up per customer | New derived customer attributes: Channel Mix, First Order Channel, Last Order Channel. |
| **David Jones concessions** | `attr-7 Store Name` exists but `possibleValues` are placeholders (Melbourne CBD…) | Expand `possibleValues` to real BI stores; add derived `attr Store Type` (Own Retail / DJ Concession / Online). |
| **Offline loyalists / Online repeat buyers** | Needs First Order Channel (above) + `met-3` | Once channel attrs exist, these are simple AND-stacks. |
| **Category Returns / Product-based** ("customers who bought knits") | No customer×product-category join | Needs a "purchased category = X" condition; product groups exist separately but aren't linked to customer segments yet. |
| **Trade reporting** (Trade Week, New/Returning) | Rolling 7-day reporting window | Mostly a **Playbook** calendar rule + a reporting concept; segments scoped to "current trade week" are thin. |

---

## ❌ Doesn't fit the current model

| Context section | Why it doesn't fit |
|---|---|
| **Store-radius** (postcode clusters within N km of a store) | No spatial/geo-distance capability. `attr-3 Postcode` exists but radius logic is out of scope. |
| **Store closure / migration** (pre-closure shoppers, post-closure migration) | Temporal *movement* analysis between stores — not a static filter. The segment model can't express "moved from store A to store B". |
| **Acquisition cohort frequency / Returning-vs-New-by-year** | These are cross-tab *analyses*, not audiences. Belong in an insight/scorecard artifact, not a segment. |
| **Tier + Returns** | A cross-tab (returns *within* each tier), not a single audience. |

---

## ⚠️ Conflicts to reconcile before import

These already exist in the prototype with **different definitions** — importing
Blue Illusion's meaning will silently change behaviour unless reconciled:

1. **`def-2 Active`** = purchased in last **90 days** → context says **last 12 months**.
2. **`def-3 Churned`** = no purchase in **180 days** → context uses banded lapse (6 / 12 / 24 months) with no single "churned".
3. **`def-5 Loyalty Tier`** = **Gold / Silver / Bronze** on annual spend → context = **Normals / Value / Vitals / High Vitals / Pinnacles** on L12M spend. (Segments `seg-1`/`seg-2` already use the BI names, so the term and the segments currently disagree.)
4. **`attr-7 Store Name`** `possibleValues` are placeholder cities, not BI's real store list.
5. **Employee Flag** is referenced in `seg-1`'s SQL (`employee_flag IS NULL`) but is **not a defined attribute** — the "exclude employees" common filter has no backing primitive.

---

## How I'd import it

**Phase 1 — new primitives (unblocks everything else)**
- Metrics: `Average Discount Level`, `L12M Order Count`, `Spend Percentile`.
- Attributes: `Employee Flag` (boolean), `Store Type` (Own Retail / DJ Concession / Online), derived `Channel Mix` + `First/Last Order Channel`, `Acquisition Year`. Expand `attr-7 Store Name` `possibleValues` to the real store list.

**Phase 2 — reconcile the conflicts**
- Replace `def-5 Loyalty Tier` logic with the 5-tier L12M-spend model.
- Decide `Active` / `Churned`: either retune to BI's L12M / banded-lapse thresholds, or keep both and tag the BI variants `(L12M)` so prose stays unambiguous.

**Phase 3 — Playbook (interpretation rules)**
Add the *Query Interpretation Rules* and *Common Filters* as `pb-*` entries:
default-to-lifetime, Active = L12M, tier = L12M spend, exclude employees,
key-sale-period (Nov–Dec) calendar, Trade Week (rolling Mon–Sun).

**Phase 4 — Segments (the bulk)**
Add `seg-*` entries category-by-category using the `category` field already in
the model: Loyalty Tiers, Value, Lifecycle, Frequency, Channel, Discount,
Returns, Geographic, Email, Acquisition, Events. Each gets filters + SQL +
population + (optional) activations, following the `seg-1`…`seg-6` shape.

**Phase 5 — terms & wiring**
- Register semantic terms: `Customer` (≥1 purchase), `Prospect` (0 purchases),
  `Record`, banded `Lapsed`, `New` / `Returning`.
- Scope choice: add to the shared `MOCK_*` arrays in `definitions-mock.ts` for
  global use, **or** register only inside segment-v1 via `registerDefs([...])`
  (as `ChatPanel.tsx` / `index.tsx` already do with `SEGMENT_REFS` / `DEMO_DEFS`)
  if you want to keep Blue Illusion isolated to this concept.

**Skip / defer:** store-radius, store-closure migration, cross-tab analyses
(cohort-frequency, tier+returns) — these aren't audiences and need a different
artifact type (insight/scorecard) than a segment.
