# BuildSequence — Scroll Animation Storyboard

## Concept
A 600vh immersive scroll sequence that guides users through four stages of home construction (Foundation → Blueprint → Structure → Complete) using fluid, scroll-driven animations. Inspired by scfo.de's layered parallax and smooth transitions. No frame-by-frame video playback — every motion derives from continuous CSS transforms on SVG/DOM elements.

## Scene Breakdown

### Scene 1: Foundation (0% – 25%)
**Visual:**
- Ground plane extends outward from center (scaleX 0→1)
- Foundation slab rises from below with a subtle overshoot (translateY 40px→0, scale 0.8→1)
- Small anchor points at slab corners pulse in
- Soft blue accent glow emanates from beneath the slab

**Text:**
- Position: Right side of screen
- Elements: Tag pill → Title (line-by-line reveal) → Body → Sub-tags → Accent rule
- Ghost step number "01" fades in at low opacity on the far right

**Parallax:**
- Canvas translates up 0%→2% and scales 1→1.02
- Background glow remains anchored behind

**Transition:**
- All elements ease in with cubic-bezier(0.22, 1, 0.36, 1)
- Foundation "settles" with a slight scale dip (1→0.95) before end of stage

---

### Scene 2: Blueprint (25% – 50%)
**Visual:**
- Blueprint grid overlay fades in across the house footprint
- Room dividers (vertical + horizontal) draw themselves via stroke-dashoffset animation
- Dimension lines extend from edges with small tick marks
- Scan line moves top-to-bottom across the blueprint
- Foundation slab dims to 30% opacity to recede

**Text:**
- Position: Shifts 5% left from right edge
- Elements cross-fade out/in with directional movement (exit left, enter from left)
- Ghost number rotates slightly and changes opacity

**Parallax:**
- Canvas scales slightly larger (1.02→1.04) to emphasize the "zooming into plans" metaphor
- Text translates left -5%
- Background glow shifts 10% right and 10% up

**Transition:**
- Grid fades in during first 15% of stage
- Divider lines draw during 20%–60% of stage
- Grid fades out during last 20% of stage to reveal structure beneath

---

### Scene 3: Structure (50% – 75%)
**Visual:**
- Walls rise simultaneously from foundation (scaleY 0→1, transform-origin bottom)
- Roof slopes converge at peak (translateY -50px→0)
- Back wall renders first at reduced opacity for depth layering
- Construction extension lines project from corners
- Accent shifts to green

**Text:**
- Position: Moves to left side of screen (translateX -110%)
- This is the primary spatial shift — text and canvas swap dominance
- Elements enter from the left with staggered timing

**Parallax:**
- Canvas translates right 2% to balance the text on the left
- Canvas gets subtle perspective tilt (rotateX 1°→-1°)
- Background glow shifts 15% left and 5% down

**Transition:**
- Walls rise with staggered delays (left first, then right, then back)
- Roof settles with a gentle bounce (overshoot easing)
- Text and canvas exchange positions smoothly without overlapping

---

### Scene 4: Complete (75% – 100%)
**Visual:**
- Door appears with scale-up from center
- Windows materialize on all walls with subtle fade
- Chimney rises from roof ridge
- Final house "breathes" with a subtle vertical float (translateY 0→-8px→0 loop)
- Warm gold accent glow intensifies
- Soft drop-shadow appears under house

**Text:**
- Position: Returns to center-right (translateX -50%)
- This re-centers the composition for the final message
- Elements fade in sequentially with generous delays

**Parallax:**
- Canvas centers and scales to 1.03
- Background glow reaches final position (50% horizontal)
- Text settles at center-right with slight upward drift

**Transition:**
- Final elements appear with the slowest, most luxurious easing
- House completes a full "breathing" cycle
- Color fully transitions to gold
- Stage ticker fills completely

## Spatial Arrangement & Layering

### Desktop (≥1024px)
```
+------------------+-------------------+------------------+
|                  |                   |                  |
|   Step Rail      |   House Canvas    |   Text Block     |
|   (auto)         |   (1fr)           |   (1fr)          |
|                  |                   |                  |
|   [01]           |   [SVG House]     |   [StageCopy]    |
|   [02]           |                   |                  |
|   [03]           |   + parallax Y    |   + parallax X   |
|   [04]           |                   |                  |
|                  |                   |                  |
+------------------+-------------------+------------------+
|              Stage Ticker Bar                           |
+--------------------------------------------------------+
```

**Layering (z-index):**
1. Background glow (z-0)
2. Blueprint grid (z-10)
3. House SVG (z-20)
4. Construction lines (z-15)
5. Text block (z-30)
6. Step rail (z-30)
7. Stage ticker (z-40)
8. Data chip (z-40)

### Mobile (<1024px)
```
+---------------------+
|                     |
|   House Canvas      |
|   (60vh height)     |
|                     |
+---------------------+
|   Text Block        |
|   (auto height)     |
|                     |
+---------------------+
|   Step Dots         |
+---------------------+
|   Stage Ticker      |
+---------------------+
```

## Animation Timing & Easing

### Easing Curves
- **Entrance/Reveal**: `cubic-bezier(0.22, 1, 0.36, 1)` — smooth deceleration, elegant
- **Overshoot/Spring**: `cubic-bezier(0.16, 1, 0.3, 1)` — subtle bounce for organic feel
- **Exit**: `cubic-bezier(0.55, 0, 1, 0.45)` — gentle acceleration out

### Timing per Stage
- **Entrance window**: First 15% of stage duration
- **Hold window**: 15%–75% of stage duration
- **Exit window**: 75%–100% of stage duration
- **Stagger between text elements**: 40ms–80ms increments

### Scroll Spring Physics
```ts
useSpring(scrollYProgress, {
  stiffness: 55,
  damping: 17,
  mass: 0.45,
})
```
This creates a smooth, weighty scroll feel with slight momentum.

## Text Choreography

### StageCopy Component
Each stage's text block is rendered as an absolute-positioned `motion.div` that animates between show/hide states.

**Show variants:**
- Tag pill: opacity 1, x 0, delay 40ms
- Title lines: y 0%, opacity 1, delay 100ms + lineIndex * 90ms
- Body: y 0, opacity 1, delay 260ms
- Sub-tags: opacity 1, delay 380ms
- Accent rule: scaleX 1, delay 320ms
- Ghost number: opacity 0.055, delay 50ms

**Hide variants:**
- All elements animate out in 250ms–350ms with x/y shifts and opacity 0
- Direction alternates by stage (even stages exit right, odd stages exit left)

### Position Choreography
```ts
const textX = useTransform(smoothProgress, [
  0, 0.25, 0.5, 0.75, 1
], ["0%", "0%", "-105%", "-50%", "-50%"]);

const textY = useTransform(smoothProgress, [
  0, 0.25, 0.5, 0.75, 1
], ["-10%", "-15%", "-10%", "-10%", "-5%"]);
```

This creates the "spatial shift" where text moves between screen regions as the story progresses.

## Color Transitions

### Stage Accent Colors
- Foundation: `oklch(0.72 0.11 250)` — drafting blue
- Blueprint: `oklch(0.76 0.14 195)` — cyan
- Structure: `oklch(0.78 0.12 150)` — teal/green
- Complete: `oklch(0.82 0.09 85)` — warm gold

### Background Blending
Background layers interpolate between accent colors using linear interpolation of RGB values:

```ts
const curr = STAGES[stage];
const next = STAGES[stage + 1];
const r = lerp(curr.accentRaw[0], next.accentRaw[0], blend);
const g = lerp(curr.accentRaw[1], next.accentRaw[1], blend);
const b = lerp(curr.accentRaw[2], next.accentRaw[2], blend);
```

Applied to:
1. Deep radial gradient tint
2. Top-left glow anchor
3. Bottom-right glow anchor

## Technical Implementation Notes

### Core Architecture
- **Single progress value**: One `smoothProgress` (0→1) drives all animations
- **Stage-local progress**: `useStageRange(progress, stage, start, end)` maps global progress to 0→1 within each stage
- **No frame-by-frame**: All motion derives from continuous CSS transforms on DOM/SVG elements
- **60fps target**: All animations use `transform` and `opacity` only (GPU-accelerated)

### Parallax Implementation
```tsx
const canvasY = useTransform(smoothProgress, [0, 1], ["0%", "6%"]);
const canvasScale = useTransform(smoothProgress, [0, 0.5, 1], [1, 1.04, 1.02]);
const textX = useTransform(smoothProgress, [0, 0.25, 0.5, 0.75, 1], ["0%", "0%", "-105%", "-50%", "-50%"]);
const bgX = useTransform(smoothProgress, [0, 0.5, 1], ["50%", "30%", "50%"]);
const bgY = useTransform(smoothProgress, [0, 0.5, 1], ["60%", "40%", "55%"]);
```

### Scroll-Triggered Responsiveness
- Use `useScroll` with `offset: ["start start", "end end"]` so progress starts at 0 when section enters viewport and reaches 1 when it leaves
- Wrap in `useSpring` for smooth interpolation
- Use `useTransform` for all derived values — never store scroll position in state

### SVG Drawing Effects
For blueprint line animations:
```tsx
const lineLength = 100;
const dashArray = useTransform(p1, [0, 0.5], [lineLength, 0]);
// style={{ strokeDasharray: `${dashArray} ${lineLength}` }}
```

### Performance Considerations
- Limit concurrent `useTransform` calls to < 30 per component
- Use `will-change: transform, opacity` on animated containers
- Avoid layout-triggering properties (width, height, top, left) in animations
- Use `transform-style: preserve-3d` only on direct children of 3D containers

### Responsive Behavior
- Desktop: 3-column grid with full parallax
- Tablet (768px–1023px): 2-column, reduced parallax intensity by 40%
- Mobile (<768px): Stacked layout, parallax Y reduced by 60%, text X parallax disabled
