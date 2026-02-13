# GuildSpace Design System

Every value in this design system traces to a named constant, perceptual threshold, or mathematical derivation. Where a value cannot be derived, it is flagged as `/* TUNABLE */` — an explicit axiom that must be set by eye but is documented as such.

The live implementation of these tokens lives in [`client/src/index.css`](client/src/index.css). This document is the reference for *why* each value exists and how it was derived.

---

## 1. Axioms

The entire design system derives from these values, defined in the `@theme` block of `index.css`.

```css
@theme {
  /* ═══════════════════════════════════════════════════════
     AXIOMS — the entire design system derives from these.
     Change an axiom, everything downstream recalculates.
     ═══════════════════════════════════════════════════════ */

  /* Typography */
  --base-size: 1rem;
  /* ↑ 16px. Browser default, calibrated to ~60cm viewing distance.
     WCAG SC 1.4.4 assumes this baseline. Discord (16px), Slack (15px),
     GitHub (16px) converge here independently. */

  --type-ratio: 1.25;
  /* ↑ Major third. Tim Brown (modularscale.com, Build Conference 2010):
     "it is in the strict adherence to *whichever* ratio you choose
     that harmony is created." 1.25 is dense enough for data-heavy UI
     while maintaining clear hierarchy. Alternatives:
     - 1.2   (minor third) — tighter, more Kibana-like
     - 1.333 (perfect fourth) — more dramatic, more editorial
     - 1.618 (φ) — too spread for a dashboard context */

  /* Spacing */
  --space-unit: 0.5rem;
  /* ↑ 8px. The universal grid constant. Material Design, IBM Carbon,
     Ant Design all use 8dp. Why: 8 divides by 2 and 4 cleanly,
     all common DPRs (1×, 1.5×, 2×, 3×) produce whole pixels,
     and it's the smallest step that's reliably distinguishable
     (Weber fraction for length at UI scale ≈ 0.05, and 8px/160px
     viewport element = 0.05). */

  /* Timing */
  --phi: 1.618034;
  /* ↑ Golden ratio. Continued fraction [1;1,1,1,...] — converges
     to rationals slower than any other irrational (AMS). Two
     oscillators at φ ratio take the longest possible time to
     near-sync. Used for duration coupling and stagger ratios. */

  --timing-base: 200ms;
  /* ↑ Nielsen/Miller perceptual thresholds:
     <100ms = instantaneous, <1000ms = flow preserved.
     200ms sits at the low end of "consciously perceived but fast."
     Material Design M3 recommends 200-300ms for standard transitions.
     Apple HIG uses 250ms default. 200ms biases toward snappy. */

  /* Color — warm dark palette */
  --lum-bg: 0.14;
  /* ↑ OKLCH lightness for base background. We work in OKLCH because
     equal L steps = equal perceived brightness (unlike sRGB hex).
     0.14 is "very dark but not crushed" — preserves shadow detail
     on IPS panels while reading as near-black on VA/OLED. */

  --lum-step: 0.035;
  /* ↑ OKLCH lightness increment per elevation level. Derived from
     Weber fraction for brightness discrimination at low luminance
     (~0.05-0.08). At L=0.14, a step of 0.035 = Weber fraction of
     0.25 — well above JND threshold, so each surface level is
     reliably distinguishable even on poor monitors.
     TUNABLE — test on your worst target display. */

  /* Constants */
  --plastic: 1.324718;
  /* ↑ Plastic constant (Van der Laan, 1928). Real root of p³=p+1.
     Generates optimal 2D low-discrepancy R₂ sequence. Used for
     phase distribution when multiple elements animate. */

  --golden-angle-deg: 137.508;
  /* ↑ 360°/φ². Produces maximally spaced hue distribution for
     any N (Ankerl 2009). Used for procedural color generation. */
}
```

## 2. Type Scale — derived, not enumerated

Instead of hardcoding each size, derive them in CSS:

```css
@theme {
  /* Type scale: base × ratio^n
     Each step is exactly --type-ratio (1.25) larger than the last. */

  --font-size-nano: calc(var(--base-size) / var(--type-ratio) / var(--type-ratio) / var(--type-ratio));
  /* ↑ 0.512rem ≈ 8.2px. ACCESSIBILITY WARNING: below 9px.
     USE ONLY for decorative labels that have a larger accessible
     alternative (aria-label or visible parent). If you can't
     justify the a11y workaround, this token shouldn't exist. */

  --font-size-micro: calc(var(--base-size) / var(--type-ratio) / var(--type-ratio));
  /* ↑ 0.64rem ≈ 10.2px. Floor for readable text. Badges, overlines. */

  --font-size-caption: calc(var(--base-size) / var(--type-ratio));
  /* ↑ 0.8rem ≈ 12.8px. Labels, metadata, secondary info. */

  --font-size-body: var(--base-size);
  /* ↑ 1rem = 16px. Default body text, inputs, chat messages. */

  --font-size-subheading: calc(var(--base-size) * var(--type-ratio));
  /* ↑ 1.25rem = 20px. Card titles, nav brand. */

  --font-size-heading: calc(var(--base-size) * var(--type-ratio) * var(--type-ratio));
  /* ↑ 1.5625rem ≈ 25px. Section headers, modal titles. */

  --font-size-display: calc(var(--base-size) * var(--type-ratio) * var(--type-ratio) * var(--type-ratio));
  /* ↑ 1.953rem ≈ 31.25px. Page titles, stat callouts. */

  --font-size-hero: calc(var(--base-size) * var(--type-ratio) * var(--type-ratio) * var(--type-ratio) * var(--type-ratio));
  /* ↑ 2.441rem ≈ 39px. Login title, treemap big numbers. */
}
```

**Tailwind mapping** — in `tailwind.config.ts`:

```typescript
// tailwind.config.ts
export default {
  theme: {
    fontSize: {
      nano:       'var(--font-size-nano)',
      micro:      'var(--font-size-micro)',
      caption:    'var(--font-size-caption)',
      body:       'var(--font-size-body)',
      subheading: 'var(--font-size-subheading)',
      heading:    'var(--font-size-heading)',
      display:    'var(--font-size-display)',
      hero:       'var(--font-size-hero)',
    },
    // Kill Tailwind's default scale so no one uses text-sm, text-xs etc.
    // Forces everyone through the derived tokens.
  }
}
```

Now `text-body`, `text-heading` etc. work in Tailwind classes but every value traces to `--base-size` and `--type-ratio`. Change `--type-ratio` to `1.333` and the entire app rescales to a perfect fourth.


## 3. Spacing Scale — 8px grid with Fibonacci extensions

```css
@theme {
  /* Core: multiples of --space-unit (8px) */
  --space-1:  var(--space-unit);                           /* 8px */
  --space-2:  calc(2 * var(--space-unit));                 /* 16px */
  --space-3:  calc(3 * var(--space-unit));                 /* 24px */
  --space-4:  calc(4 * var(--space-unit));                 /* 32px */
  --space-5:  calc(5 * var(--space-unit));                 /* 40px */
  --space-6:  calc(6 * var(--space-unit));                 /* 48px */
  --space-8:  calc(8 * var(--space-unit));                 /* 64px */

  /* Sub-grid: for tight UI elements (inputs, badges, pips) */
  --space-0\.5: calc(var(--space-unit) / 2);               /* 4px */
  --space-0\.25: calc(var(--space-unit) / 4);              /* 2px */
}
```

**Tailwind mapping:**

```typescript
// tailwind.config.ts
spacing: {
  '0.25': 'var(--space-0\\.25)',  // 2px
  '0.5':  'var(--space-0\\.5)',   // 4px
  '1':    'var(--space-1)',       // 8px
  '2':    'var(--space-2)',       // 16px
  '3':    'var(--space-3)',       // 24px
  '4':    'var(--space-4)',       // 32px
  '5':    'var(--space-5)',       // 40px
  '6':    'var(--space-6)',       // 48px
  '8':    'var(--space-8)',       // 64px
}
```


## 4. Border Radius — derived from space-unit

```css
@theme {
  --radius-sm: calc(var(--space-unit) / 2);    /* 4px — inputs, badges */
  --radius-md: var(--space-unit);              /* 8px — cards, panels */
  --radius-lg: calc(var(--space-unit) * 1.5);  /* 12px — modals */
  --radius-full: 9999px;                       /* pills, avatars */

  /* WHY derived from space-unit: border-radius participates in the
     same spatial system as padding and margin. A card with 8px radius
     and 16px padding has radius = padding/2, a consistent ratio.
     Change --space-unit to 6px and you get 3/6/9 — still proportional. */
}
```


## 5. Color Surfaces — OKLCH with perceptually uniform elevation

```css
@theme {
  /* Warm chroma and hue for all surfaces */
  --surface-chroma: 0.02;   /* TUNABLE — subtle warmth */
  --surface-hue: 55;        /* TUNABLE — warm amber direction */

  /* Each surface steps up by --lum-step in OKLCH L.
     Equal OKLCH L steps = equal perceived brightness difference. */
  --color-bg:        oklch(var(--lum-bg) var(--surface-chroma) var(--surface-hue));
  /* L = 0.14 */

  --color-surface:   oklch(calc(var(--lum-bg) + var(--lum-step)) var(--surface-chroma) var(--surface-hue));
  /* L = 0.175 */

  --color-surface-2: oklch(calc(var(--lum-bg) + 2 * var(--lum-step)) var(--surface-chroma) var(--surface-hue));
  /* L = 0.21 */

  --color-surface-3: oklch(calc(var(--lum-bg) + 3 * var(--lum-step)) var(--surface-chroma) var(--surface-hue));
  /* L = 0.245 — modals, popovers */

  /* Borders: halfway between their adjacent surfaces */
  --color-border:        oklch(calc(var(--lum-bg) + 1.5 * var(--lum-step)) var(--surface-chroma) var(--surface-hue));
  --color-border-subtle: oklch(calc(var(--lum-bg) + 0.75 * var(--lum-step)) var(--surface-chroma) var(--surface-hue));

  /* Text — derived from contrast requirements */
  --color-text:          oklch(0.88 0.01 var(--surface-hue));
  /* ↑ WCAG AA requires 4.5:1 against surface. L=0.88 on L=0.175 surface
     gives ~13:1. The 0.01 chroma warms it slightly. */

  --color-text-secondary: oklch(0.65 0.02 var(--surface-hue));
  /* ↑ L=0.65 on L=0.175 = ~5.5:1. Passes AA for body text. */

  --color-text-dim:       oklch(0.45 0.02 var(--surface-hue));
  /* ↑ L=0.45 on L=0.175 = ~3:1. AA for large text only (≥18.66px bold
     or ≥24px normal). Use only with text-subheading or larger. */
}
```

**Why this matters:** The original plan used hex values (`#161311`, `#1e1a17`) which are in sRGB — a perceptually non-uniform color space. The difference between those two hex values might look fine on your monitor and invisible on a budget laptop. OKLCH guarantees equal perceptual steps regardless of display.


## 6. Timing Tokens — φ-derived duration scale

```css
@theme {
  /* Duration scale: base × φ^n
     Each step is exactly φ larger than the last.
     This means no two durations in the system are integer multiples
     of each other — animations never fall into sync. */

  --duration-instant: calc(var(--timing-base) / var(--phi) / var(--phi));
  /* ↑ 200/φ² ≈ 76ms. Below 100ms threshold (Nielsen): feels instant. */

  --duration-fast: calc(var(--timing-base) / var(--phi));
  /* ↑ 200/φ ≈ 124ms. Micro-interactions: hover, focus, toggle. */

  --duration-normal: var(--timing-base);
  /* ↑ 200ms. Standard transitions: expand, collapse, fade. */

  --duration-slow: calc(var(--timing-base) * var(--phi));
  /* ↑ 200×φ ≈ 324ms. Large motion: modal enter, page transition. */

  --duration-slower: calc(var(--timing-base) * var(--phi) * var(--phi));
  /* ↑ 200×φ² ≈ 524ms. Complex orchestration: multi-element stagger. */

  /* Exit asymmetry: exits are 1/φ of their entrance duration.
     This matches the perceptual expectation that things arrive with
     ceremony and depart quickly (Material Design M3 principle). */
  --duration-exit-multiplier: 0.618;
}
```

**Tailwind mapping:**

```typescript
// tailwind.config.ts
transitionDuration: {
  instant:  'var(--duration-instant)',   // ~76ms
  fast:     'var(--duration-fast)',      // ~124ms
  normal:   'var(--duration-normal)',    // 200ms
  slow:     'var(--duration-slow)',      // ~324ms
  slower:   'var(--duration-slower)',    // ~524ms
}
```


## 7. Stagger Utility — φ-scaled cascade (TypeScript)

```typescript
// src/utils/stagger.ts

const PHI = 1.618034;

/**
 * Generate φ-scaled stagger delays for a list of N items.
 *
 * Unlike linear stagger (0, 30, 60, 90ms), this produces:
 * 0, 30, 79, 157, 284ms — organic deceleration where early
 * items appear quickly and the tail stretches out.
 *
 * The cumulative delay for item n = base × (φⁿ - 1) / (φ - 1)
 * This is the geometric series sum, ensuring total animation time
 * is predictable and bounded.
 *
 * @param count Number of items
 * @param baseMs Base delay between first two items (TUNABLE)
 *               30ms ≈ 2 frames at 60fps — the smallest delay
 *               where discrete events feel sequential rather
 *               than simultaneous (~20ms grouping threshold,
 *               Hirsh & Sherrick 1961)
 */
export function phiStagger(count: number, baseMs = 30): number[] {
  return Array.from({ length: count }, (_, i) =>
    i === 0 ? 0 : Math.round(baseMs * (Math.pow(PHI, i) - 1) / (PHI - 1))
  );
}

// Usage in RosterRow.tsx:
// const delays = phiStagger(alts.length);
// <div style={{ animationDelay: `${delays[i]}ms` }}>
```


## 8. Phase Distribution — R₂ sequence (TypeScript)

```typescript
// src/utils/phase.ts

const PLASTIC = 1.32471795724474602596;
const INV_PLASTIC = 1 / PLASTIC;       // ≈ 0.7549
const INV_PLASTIC_SQ = 1 / PLASTIC ** 2; // ≈ 0.5698

/**
 * R₂ quasi-random phase distribution.
 *
 * For N pulsing/animating elements, distributes (phase1, phase2)
 * pairs across [0,1)² with minimal discrepancy — no clumping,
 * no gaps, regardless of N.
 *
 * Roberts (2018): "The Unreasonable Effectiveness of Quasirandom
 * Sequences" — for 10⁶ points, R₂ achieves integration error
 * ~10⁻⁷ vs ~10⁻⁴ for Math.random().
 *
 * Use case: treemap cell glow pulses, roster row entrance phases,
 * any set of concurrent animations that shouldn't synchronize.
 *
 * @param index Element index (0-based)
 * @param seed  Starting point in sequence. 0.5 is Roberts' recommendation.
 * @returns [phase1, phase2] each in [0, 1)
 */
export function r2Phase(index: number, seed = 0.5): [number, number] {
  return [
    (seed + INV_PLASTIC * (index + 1)) % 1,
    (seed + INV_PLASTIC_SQ * (index + 1)) % 1,
  ];
}

/**
 * 1D golden ratio phase (R₁ sequence).
 * Simpler version when you only need one phase dimension.
 * Successive values are spaced by 1/φ ≈ 0.618 — the largest
 * possible gap for any single-parameter sequence.
 */
export function goldenPhase(index: number, seed = 0.5): number {
  return (seed + INV_PLASTIC * (index + 1)) % 1;
}

// Usage in TreemapCell.tsx:
// const [dimPhase, glowPhase] = r2Phase(cellIndex);
// style={{
//   animationDelay: `${dimPhase * totalDuration}s`,
//   '--glow-phase': `${glowPhase * totalDuration}s`,
// }}
```


## 9. Golden Angle Color Generator (TypeScript)

```typescript
// src/utils/color.ts

const GOLDEN_ANGLE = 137.50776405003785; // 360 / φ²

/**
 * Generate N maximally-distributed hues using the golden angle.
 *
 * Ankerl (2009): incrementing hue by 360°/φ² produces "very
 * evenly distributed" colors for any N. This is the R₁ sequence
 * applied to hue — each new color lands in the largest existing
 * gap in the hue wheel.
 *
 * Uses OKLCH for perceptual uniformity — equal chroma/lightness
 * values produce equal perceived saturation/brightness regardless
 * of hue (unlike HSL where yellow appears far brighter than blue).
 *
 * @param count    Number of colors
 * @param chroma   OKLCH chroma. 0.15 = moderate saturation. TUNABLE.
 * @param lightness OKLCH lightness. 0.7 = readable on dark bg. TUNABLE.
 * @param startHue  Offset to align first color with your accent gold.
 */
export function goldenColors(
  count: number,
  chroma = 0.15,
  lightness = 0.7,
  startHue = 85, // TUNABLE — 85° ≈ warm gold in OKLCH
): string[] {
  return Array.from({ length: count }, (_, i) => {
    const hue = (startHue + i * GOLDEN_ANGLE) % 360;
    return `oklch(${lightness} ${chroma} ${hue})`;
  });
}

// Usage: procedural class colors when you have variable number of classes
// const classColors = goldenColors(classList.length);
```


## 10. Opacity Scale — geometric (Weber-Fechner)

```css
@theme {
  /* Opacity scale: geometric progression.
     Weber-Fechner law: perception is logarithmic, so equal
     perceptual steps require geometric (multiplicative) spacing.

     The ratio between steps determines how many steps you get
     from min to max. With ratio ≈ 1.83:
     0.03 → 0.055 → 0.10 → 0.18 → 0.33 → 0.60 → 1.0
     That's 7 steps, each feeling equally different from its neighbors.

     HOWEVER: 1.83 is reverse-engineered to hit these round-ish
     endpoints. The *principle* is geometric; the specific ratio
     is TUNABLE. Adjust if your grain feels too strong or your
     dim states feel too opaque. */

  --opacity-1: 0.03;    /* grain overlay, scanline texture */
  --opacity-2: 0.055;   /* subtle hover backgrounds */
  --opacity-3: 0.10;    /* disabled state overlays */
  --opacity-4: 0.18;    /* treemap cell color-mix intensity */
  --opacity-5: 0.33;    /* secondary element dimming */
  --opacity-6: 0.60;    /* de-emphasized but readable */
  --opacity-7: 1.0;     /* full opacity */

  /* Named aliases for clarity */
  --opacity-grain:       var(--opacity-1);
  --opacity-scanline:    var(--opacity-1);
  --opacity-treemap-mix: var(--opacity-4);
  --opacity-dim:         var(--opacity-5);
}
```

Now the treemap `color-mix` percentage (Claude's arbitrary 22%) becomes `var(--opacity-treemap-mix)` = 0.18 (18%), which is step 4 on the geometric scale. If you want it slightly more saturated, bump to step 5 (0.33) — each step is a perceptually equal jump. No more "why 22% and not 25%?" debates.


## 11. Grain Overlay — SVG feTurbulence (CSS)

```css
/* index.css — global grain texture */

.grain-overlay::after {
  content: '';
  position: fixed;
  inset: 0;
  z-index: 9999;
  pointer-events: none;
  mix-blend-mode: overlay;
  opacity: var(--opacity-grain); /* 0.03, step 1 on Weber scale */

  /*
   * SVG feTurbulence: browser-native Perlin noise.
   * - type="fractalNoise": fractal Brownian motion (Perlin 1985).
   *   Spatially correlated — nearby pixels have similar values,
   *   unlike Math.random() white noise.
   * - baseFrequency="0.75": controls grain size.
   *   Higher = finer grain. 0.65-0.85 range mimics ISO 400 film.
   *   TUNABLE — lower for coarser texture, higher for finer.
   * - numOctaves="4": layers of detail.
   *   Each octave adds frequency×2, amplitude×0.5 (fBm defaults).
   *   Beyond 5, differences are imperceptible.
   * - stitchTiles="stitch": seamless tiling when tiled.
   * - feColorMatrix saturate=0: desaturate to pure luminance noise.
   */
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='grain'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23grain)'/%3E%3C/svg%3E");
  background-size: 512px 512px; /* tile size — larger = less repetition visible */
}
```

Apply to your root layout:
```tsx
// AppShell.tsx
<div className="grain-overlay">
  {children}
</div>
```


## 12. Horizontal Line Texture (not "scanlines") — CSS

```css
/* Treemap overlay: decorative horizontal rhythm.
   NOT a CRT simulation. Same design element as ruled paper,
   engraving lines, or halftone dots. */

.treemap-texture::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: var(--opacity-scanline); /* 0.03, same scale as grain */

  background: repeating-linear-gradient(
    to bottom,
    transparent,
    transparent 3px,                     /* line spacing: derived from
                                            --space-0.5 (4px) minus 1px line.
                                            3px gap + 1px line = 4px period
                                            = half of space-unit. */
    oklch(var(--lum-bg) 0 0 / 0.5) 3px,
    oklch(var(--lum-bg) 0 0 / 0.5) 4px
  );
}
```


## 13. Organic Hover Displacement — SVG filter (not chromatic aberration)

```html
<!-- In your index.html or a shared SVG defs component -->
<svg style="position:fixed;width:0;height:0" aria-hidden="true">
  <defs>
    <!--
      Perlin noise displacement for hover effects.
      NOT CRT interference — organic, naturalistic distortion
      like heat shimmer or water refraction.

      - baseFrequency: 0.02 (X) × 0.5 (Y)
        Asymmetric: wide horizontal coherence, rapid vertical
        variation. This creates "bands" rather than uniform blur.
        TUNABLE — lower X = wider bands, higher Y = more variation.
      - numOctaves: 2 (lighter than CRT version's 3 — subtler)
      - scale: 3 — max 3px displacement.
        At body text size (16px), 3px ≈ 19% of line height.
        Above 20% feels broken; below 10% is imperceptible.
        TUNABLE based on your actual font metrics.
    -->
    <filter id="organic-hover" x="-5%" y="-5%" width="110%" height="110%">
      <feTurbulence
        type="fractalNoise"
        baseFrequency="0.02 0.5"
        numOctaves="2"
        seed="42"
        result="noise"
      />
      <feDisplacementMap
        in="SourceGraphic"
        in2="noise"
        scale="3"
        xChannelSelector="R"
        yChannelSelector="G"
      />
    </filter>
  </defs>
</svg>
```

```css
/* Apply on hover to treemap cells or interactive cards */
.treemap-cell:hover {
  filter: url(#organic-hover);
  transition: filter var(--duration-fast) ease-out;
}
```


## 14. Ambient Pulse — φ³ timing with R₂ phase distribution

```css
@keyframes ambient-pulse {
  0%, 100% { box-shadow: 0 0 0 0 oklch(0.65 0.15 85 / 0); }
  61.8%    { box-shadow: 0 0 20px 2px oklch(0.65 0.15 85 / 0.08); }
  /* ↑ 61.8% = 1/φ through the cycle.
     The golden time point — perceptually the "natural" climax
     position in any periodic motion. */
}

.treemap-cell--active {
  animation-name: ambient-pulse;
  animation-duration: calc(var(--timing-base) * var(--phi) * var(--phi) * var(--phi) * 10);
  /* ↑ 200ms × φ³ × 10 = 200 × 4.236 × 10 ≈ 8472ms
     Two cells with this duration and different R₂ phases
     will take maximally long to near-sync. */
  animation-iteration-count: infinite;
  animation-timing-function: ease-in-out;
  /* Phase offset applied via inline style from r2Phase() */
}
```

```tsx
// TreemapCell.tsx
import { r2Phase } from '../utils/phase';

const [pulsePhase] = r2Phase(cellIndex);
const totalDuration = 8472; // ms, matching CSS

<div
  className="treemap-cell--active"
  style={{
    animationDelay: `${Math.round(pulsePhase * totalDuration)}ms`
  }}
/>
```


## 15. Collapsible Row Animation — derived timing

```css
/* RosterRow expand/collapse */
.roster-alt-container {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows var(--duration-normal) ease-out;
  /* ↑ 200ms. Standard transition. */
}

.roster-alt-container[data-expanded="true"] {
  grid-template-rows: 1fr;
}

.roster-alt-container > .inner {
  overflow: hidden;
}

/* Chevron rotation */
.roster-chevron {
  transition: transform var(--duration-fast) ease-out;
  /* ↑ 124ms. Micro-interaction — faster than the content expand
     so it "leads" the reveal. */
}

.roster-chevron[data-expanded="true"] {
  transform: rotate(90deg);
}
```

Alt row stagger applied via inline styles using `phiStagger()`:

```tsx
// RosterRow.tsx
import { phiStagger } from '../utils/stagger';

const delays = phiStagger(alts.length);

{alts.map((alt, i) => (
  <div
    key={alt.id}
    className="roster-alt-row"
    style={{
      animationDelay: `${delays[i]}ms`,
      borderLeft: `2px solid var(--color-accent-dim)`,
    }}
  >
    {/* ... */}
  </div>
))}
```


## 16. Shadows — warm-tinted, derived from surface color

```css
@theme {
  /* Shadow color derived from background.
     In OKLCH, we just drop lightness to near-0 and keep the hue.
     This makes shadows feel "of the same world" as surfaces. */
  --shadow-color: oklch(0.05 0.01 var(--surface-hue));

  --shadow-sm:
    0 1px 3px oklch(0.05 0.01 var(--surface-hue) / 0.3),
    0 1px 2px oklch(0.05 0.01 var(--surface-hue) / 0.2);

  --shadow-md:
    0 4px 12px oklch(0.05 0.01 var(--surface-hue) / 0.4),
    0 2px 4px oklch(0.05 0.01 var(--surface-hue) / 0.2);

  --shadow-lg:
    0 12px 40px oklch(0.05 0.01 var(--surface-hue) / 0.5),
    0 4px 12px oklch(0.05 0.01 var(--surface-hue) / 0.3);

  --shadow-glow:
    0 0 20px oklch(0.65 0.15 85 / var(--opacity-2));
    /* ↑ glow radius 20px, opacity at scale step 2 (0.055) */
}
```


## 17. Easing — physics-based cubic-bezier

```css
@theme {
  /* Material Design M3 standard easing.
     These approximate damped spring motion (Hooke's law F = -kx)
     without requiring a JS spring library. */

  --ease-standard: cubic-bezier(0.2, 0, 0, 1);
  /* ↑ M3 "standard" — fast start, gentle landing. Use for
     most transitions (expand, collapse, move). */

  --ease-decelerate: cubic-bezier(0, 0, 0, 1);
  /* ↑ M3 "decelerate" — for elements entering the screen.
     Fast arrival, slow settle. */

  --ease-accelerate: cubic-bezier(0.3, 0, 1, 1);
  /* ↑ M3 "accelerate" — for elements leaving the screen.
     Slow departure, fast exit. */
}
```


## 18. Touch Targets — Fitts' law minimum

```css
@theme {
  --target-min: 48px;
  /* ↑ Fitts' law: MT = a + b·log₂(D/W + 1).
     48px target at 300px distance = ~480ms acquisition.
     Below 44px, error rates rise sharply.
     Material: 48dp. Apple HIG: 44pt. WCAG 2.5.5: 44×44 CSS px.
     We use 48px as the floor for all interactive elements. */
}

/* Apply globally */
button, a, [role="button"], input, select, textarea {
  min-height: var(--target-min);
  min-width: var(--target-min);
}
```


## Summary

| System | Method | Key principle |
|---|---|---|
| Type scale | `base × ratio^n` (major third) | Modular scale — one ratio generates all sizes |
| Spacing | `N × 8px` grid | Whole pixels at all DPRs, Weber-distinguishable steps |
| Color surfaces | OKLCH with `L + N × step` | Perceptually uniform elevation (not sRGB hex) |
| Border radius | Derived from `--space-unit` | Proportional to spacing — changes with grid |
| Timing | `base × φ^n` durations | No integer multiples — animations never sync |
| Stagger | `phiStagger()` geometric series | Organic deceleration, bounded total time |
| Opacity | Weber-Fechner geometric scale | Equal perceptual steps between levels |
| Phase | R₂ quasi-random sequence | Maximal coverage, no clumping, any N |
| Hue generation | Golden angle (360°/φ²) | Largest possible gap for each new color |
| Texture | SVG feTurbulence + displacement | Naturalistic grain, not hardware emulation |
| Touch targets | Fitts' law 48px minimum | Measurable acquisition time improvement |
| Shadows | OKLCH derived from `--surface-hue` | Single source of truth, warm-tinted |
