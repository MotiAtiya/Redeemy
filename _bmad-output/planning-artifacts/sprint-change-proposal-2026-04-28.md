# Sprint Change Proposal — Warranty Product Identity Redesign
**Date:** 2026-04-28 | **Project:** Redeemy | **Scope:** Moderate

---

## Section 1: Issue Summary

**Problem:** The current `productName` field in Add Warranty is a single free-text input. Users type everything together ("תנור אפייה Bosch HBF154"), which loses structured data — no filtering by brand, no grouping by product type, no smart display in the detail screen.

Additionally, the store autocomplete for warranties pulls from `ISRAELI_STORES` — a 250+ entry list that includes supermarkets, restaurants, cafes, banks, and gas stations. None of these have warranty-relevant products.

**Discovered:** During full project retrospective (2026-04-28).

---

## Section 2: Impact Analysis

| Artifact | Impact |
|----------|--------|
| `src/types/warrantyTypes.ts` | Add 3 new fields; deprecate `productName` + `category` |
| `src/app/add-warranty.tsx` | Replace `productName` step + conditional `category` step with new structured steps |
| `src/app/warranty/[id].tsx` | Update display to show new structured fields with old-record fallback |
| `src/app/(tabs)/warranties.tsx` | Minor — display `productType` Hebrew label (fallback to `productName`) |
| `src/data/israeliStores.ts` | No change — remains for credits only |
| **NEW** `src/data/warrantyStores.ts` | Warranty-specific store list (~150 entries) |
| **NEW** `src/data/warrantyProductTypes.ts` | Product type list (~120 entries, Hebrew+English) |
| **NEW** `src/data/warrantyBrands.ts` | Brand list (~250 entries) |
| `src/components/redeemy/StoreAutocomplete.tsx` | Add optional `storeList` prop |
| `src/locales/he.json` + `en.json` | New step i18n keys |
| `src/lib/firestoreWarranties.ts` | Minor — pass new fields in create/update |

**No impact on:** notifications, family sharing, Firestore rules/indexes, other features.

---

## Section 3: Detailed Change Proposals

### Change A — `warrantyTypes.ts`

**OLD:**
```typescript
export interface Warranty {
  storeName: string;
  productName: string;
  category: string;
  // ...
}
```

**NEW:**
```typescript
export interface Warranty {
  storeName: string;

  // v2 product identity (new records)
  productType?: string;    // e.g. 'oven' — id from WARRANTY_PRODUCT_TYPES
  brand?: string;          // e.g. 'Bosch' — from WARRANTY_BRANDS, optional
  model?: string;          // e.g. 'HBF154' — free text, optional

  /** @deprecated v1 — kept for backward compat with existing records */
  productName?: string;
  /** @deprecated v1 — kept for backward compat */
  category?: string;
  // ...
}
```

**Rationale:** Non-breaking. Existing records still render via `productName` fallback. New records use structured fields.

---

### Change B — `src/data/warrantyStores.ts` (NEW)

New file: warranty-relevant retailers only. Excludes: supermarkets, restaurants/cafes, banks, insurance, gyms, travel, gas stations.

Includes:
- אלקטרוניקה: KSP, Bug, iDigital, Ivory, Apple Store, Samsung Store, מחסני חשמל, שקם אלקטריק, אלקטרה, iStore, LastPrice, Bug Outlet
- טלפוניה (מוכרים מכשירים): פרטנר, סלקום, פלאפון, HOT Mobile, גולן טלקום
- לבית וריהוט: IKEA, Home Center, ACE, Fox Home, שילב, ביתילי, כתר, Castro Home, מחסני תאורה
- אופנה (פריטים עם אחריות): ZARA, H&M, פוקס, Castro, Golf, Terminal X
- ספורט: Nike, Adidas, Decathlon, New Balance, Skechers, Under Armour, Puma, Reebok, The North Face, Columbia, Salomon
- תכשיטים: Swarovski, Pandora, Daniel Wellington, Fossil, Michael Hill
- אופטיקה: Opticana, Carolina Lemke
- צעצועים ותינוקות: Toys R Us, Segal Baby, Baby Star, Dr Baby
- אונליין: Amazon, AliExpress, eBay, Shein, Asos, Temu, Banggood, Etsy
- כלי עבודה: Office Depot, ACE Hardware

---

### Change C — `src/data/warrantyProductTypes.ts` (NEW)

~65 product types organized by category. Each has:
- `id: string` — stored in Firestore
- `heLabel: string` — Hebrew display label
- `enLabel: string` — English display label
- `icon: IoniconsName`

Categories covered:
- אלקטרוני��ה וטכנולוגיה (smartphone, laptop, desktop, tablet, TV, headphones, speaker, camera, smartwatch, gaming console, printer, monitor, router, earbuds, drone)
- מוצרי חשמל ביתיים (refrigerator, washing machine, dryer, oven, microwave, dishwasher, AC, water heater, vacuum, coffee machine, kettle, blender, iron, fan, heater, air purifier, freezer)
- ריהוט (sofa, bed/mattress, wardrobe, dining table, office chair, bookcase)
- כלי עבודה (drill, circular saw, angle grinder, pressure washer)
- אופנה והנעלה (shoes, jacket/coat, bag, watch, glasses, sunglasses)
- ספורט וחוץ (bicycle, scooter, treadmill, tent)
- רכב (car battery, tires, car part)
- בריאות ורפואה (hearing aid, medical device)
- מוזיקה (guitar, piano/keyboard)
- שונות (toy, stroller, other)

---

### Change D — `src/data/warrantyBrands.ts` (NEW)

~250 brands organized by category:
- Tech & Electronics: Apple, Samsung, LG, Sony, Panasonic, Philips, Sharp, Toshiba, Lenovo, HP, Dell, ASUS, Acer, Microsoft, Google, Huawei, Xiaomi, OnePlus, Oppo, TCL, Hisense, JVC
- Home Appliances: Bosch, Siemens, Miele, Electrolux, Whirlpool, Indesit, Ariston, Candy, Hotpoint, Beko, Zanussi, AEG, Smeg, Gorenje, Fisher & Paykel, Haier, Midea, Daewoo
- Israeli Brands: עמינח/Aminach, Keter/כתר, Tambour/טמבור, Elco
- Tools: Bosch Tools, DeWalt, Makita, Milwaukee, Black & Decker, Ryobi, Metabo, Hilti, Stanley, Festool
- Fashion & Footwear: Nike, Adidas, Puma, Reebok, New Balance, Under Armour, Skechers, Timberland, Dr. Martens, Converse, Vans, Zara, H&M, Tommy Hilfiger, Levis, Calvin Klein, Guess, Diesel, Lacoste, Ralph Lauren, Hugo Boss
- Watches & Jewelry: Casio, Citizen, Seiko, Fossil, Daniel Wellington, Swatch, Tissot, Pandora, Swarovski
- Optics: Ray-Ban, Oakley, Silhouette, Carolina Lemke
- Automotive: Toyota, Hyundai, Kia, Mazda, Honda, Volkswagen, Skoda, Renault, Ford, Chevrolet, Suzuki, Mitsubishi
- Baby & Kids: Graco, Chicco, Maxi-Cosi, Cybex, Bugaboo, Stokke, LEGO, Hasbro, Mattel, Fisher-Price
- Audio: Bose, JBL, Sonos, Harman Kardon, Marshall, Sennheiser, Audio-Technica, Jabra
- Sports Equipment: Trek, Giant, Specialized, Scott, Cannondale, Decathlon, Technogym
- אחר / Other (always last)

---

### Change E — `add-warranty.tsx` step restructure

**OLD steps:** `storeName` → `[category]` → `productName` → `expiryDate` → `photo` → `summary`

**NEW steps:** `storeName` → `productType` → `productDetails` → `expiryDate` → `photo` → `summary`

```typescript
type StepId =
  | 'storeName'
  | 'productType'
  | 'productDetails'   // brand (autocomplete, optional) + model (free text, optional)
  | 'expiryDate'
  | 'photo'
  | 'summary';

function getSteps(): StepId[] {
  return ['storeName', 'productType', 'productDetails', 'expiryDate', 'photo', 'summary'];
}
```

**New form state (replaces `productName`, `category`, `categoryChosen`):**
```typescript
const [productType, setProductType] = useState('');   // required — stores product type id
const [brand, setBrand] = useState('');               // optional
const [model, setModel] = useState('');               // optional
```

**`canContinue` update:**
```typescript
case 'productType':    return productType.trim().length > 0;
case 'productDetails': return true;  // always optional — skip via Continue
```

**`productType` step:**
- Autocomplete from `WARRANTY_PRODUCT_TYPES` — shows `heLabel`, stores `id`
- Falls back to free text if user types something not in the list
- Step title: `t('addWarranty.step.productType')` → "מה המוצר?"

**`productDetails` step:**
- Two stacked fields: Brand (autocomplete from `WARRANTY_BRANDS`) + Model (free text)
- Both show gray "(אופציונלי)" helper text
- "דלג" skip button calls `goNext()` directly
- Continue button also works
- Step title: `t('addWarranty.step.productDetails')` → "מותג וד��ם"

**`storeName` step:** `StoreAutocomplete` receives `storeList={WARRANTY_STORES}` prop instead of the default `ISRAELI_STORES`.

**`handleSave` update:** replace `productName` / `category` with `productType` / `brand` / `model`.

**Edit mode (`warrantyId` param):** pre-fill `productType`, `brand`, `model` from existing warranty. For old records with only `productName`, pre-fill `productType` as free text value of `productName` (best-effort).

---

### Change F — `StoreAutocomplete.tsx`

Add optional prop:
```typescript
interface Props {
  value: string;
  onChange: (value: string) => void;
  onSelectSuggestion?: (value: string) => void;
  autoFocus?: boolean;
  storeList?: string[];   // NEW — defaults to ISRAELI_STORES if not provided
}
```

Credits continue to use default `ISRAELI_STORES`. Warranties pass `WARRANTY_STORES`.

---

### Change G — `warranty/[id].tsx` display

Add display helper:
```typescript
function getProductDisplay(w: Warranty): { type: string; brand?: string; model?: string } {
  if (w.productType) {
    const typeEntry = WARRANTY_PRODUCT_TYPES.find(p => p.id === w.productType);
    return {
      type: typeEntry ? typeEntry.heLabel : w.productType,
      brand: w.brand || undefined,
      model: w.model || undefined,
    };
  }
  // Backward compat: old record
  return { type: w.productName ?? '—' };
}
```

Detail screen shows:
- **מוצר:** `תנור אפייה` (primary label, large)
- **מותג:** `Bosch` (if set)
- **דגם:** `HBF154` (if set)
- Old records: single **מוצר:** `תנור אפייה Bosch HBF154` line (unchanged)

---

### Change H — `warranties.tsx` (list screen, minor)

Warranty card title: show `WARRANTY_PRODUCT_TYPES.find(p => p.id === w.productType)?.heLabel ?? w.productType ?? w.productName` as the primary product label.

---

### Change I — i18n additions (`he.json` / `en.json`)

```json
// he.json additions under "addWarranty"
"step": {
  "productType": "מה המוצר?",
  "productDetails": "מותג ודגם"
},
"productType": {
  "placeholder": "לדוגמה: תנור אפייה, טלוויזיה",
  "notFound": "לא מצאת? כתוב בחופשיות"
},
"brand": {
  "label": "מותג",
  "placeholder": "לדוגמה: Bosch, Samsung"
},
"model": {
  "label": "דגם",
  "placeholder": "לדוגמה: HBF154"
},
"optional": "אופציונלי",
"skip": "דלג"
```

---

## Section 4: Recommended Approach

**Direct Adjustment** — modify existing `add-warranty.tsx` and related files. No epic restructuring or PRD changes needed.

**Risk:** Low. All changes are additive:
- New fields are optional on the data model → existing records unaffected
- `warrantyStores.ts` is a new file → `israeliStores.ts` untouched
- Step restructure is isolated to `add-warranty.tsx`

**Backward compatibility:** Full. Any warranty created before this change displays its `productName` normally. No Firestore migration needed.

---

## Section 5: Files Summary

| Action | File |
|--------|------|
| MODIFY | `src/types/warrantyTypes.ts` |
| MODIFY | `src/app/add-warranty.tsx` |
| MODIFY | `src/app/warranty/[id].tsx` |
| MODIFY | `src/app/(tabs)/warranties.tsx` (minor) |
| MODIFY | `src/components/redeemy/StoreAutocomplete.tsx` (add `storeList` prop) |
| MODIFY | `src/lib/firestoreWarranties.ts` (pass new fields) |
| MODIFY | `src/locales/he.json` + `en.json` |
| CREATE | `src/data/warrantyStores.ts` |
| CREATE | `src/data/warrantyProductTypes.ts` |
| CREATE | `src/data/warrantyBrands.ts` |

## Section 6: Implementation Handoff

**Scope classification:** Moderate — requires story creation before dev implementation.

**Next step:** Run `bmad-create-story` or `bmad-dev-story` in a fresh context to implement this as Epic 17, Story 17.1.

**Success criteria:**
- Add Warranty flow has 6 steps: storeName → productType → productDetails → expiryDate → photo → summary
- Store autocomplete shows only warranty-relevant stores
- Product type autocomplete shows ~65 types with Hebrew labels
- Brand autocomplete shows ~250 brands
- Model is free-text, optional
- Existing warranty records display correctly (no regression)
- TypeScript compiles with zero errors
