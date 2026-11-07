# Find Myself — Forest Art Style

**Version:** 2.0 — aligned to the two approved Forest gameplay screenshots  
**Primary visual references:** `forest0.png`, `forest1.png` (attached 2026-11-07)  
**Source of truth:** The actual appearance of these two screenshots. If a descriptive rule below produces a visibly different result, follow the screenshots.

This guide separates **Part A (asset production and general game-art constraints)** from **Part B (the Forest visual style)**. Part B controls the appearance of all Forest assets and scenes. Do not automatically apply its colors, light, or environmental composition to other levels.

---

# Part A — Asset production and shared game-art requirements

## 1. What to make
- Make original, coherent **2D side-view game art** that reads at its actual in-game size.
- Use supplied screenshots as references for **visual language** (shape, color, texture, depth, light, scale), not for copying their exact arrangement unless explicitly requested.
- **Match the requested object and scope.** Do not add a character, UI, scenery, text, decorative frame, or additional objects that were not requested.
- Keep useful silhouettes and important interactable surfaces readable against the world.

## 2. Standalone asset export — mandatory
- Standalone sprites and isolated environmental assets must be **PNG with a real transparent RGBA background**; pixels outside the artwork must have alpha = 0.
- Do not paint a backdrop, ground plane, gradient, vignette, opaque black background, or fake checkerboard into a **standalone asset**. Full backgrounds or complete scenes are exceptions **only when requested**.
- Use smooth alpha-antialiased edges; avoid color fringes, stray opaque pixels, baked-in halos, and excessive empty margins.
- If multiple assets or animation frames share an image, give each one a **separate, non-overlapping rectangular crop region**. All tips, leaves, roots, and antialiased edges must stay inside that region. Leave small transparent gutters. No crop guides, labels, or borders.
- For rigged/animated assets, keep independently moving pieces separate, and make attachment points and layering compatible with programmatic animation. Do not invent attachment holes or hinges in visible artwork unless requested.
- If the task asks to preserve existing parts exactly, **edit only the requested region** rather than reimagining the complete asset.

## 3. Common visual and motion principles
- Hand-illustrated, **stylized 2D art**, not photorealism, a 3D render, voxel/pixel art, anime, or glossy mobile-game clip art.
- Favor a strong readable overall shape with smaller natural forms inside it; details support the silhouette rather than compete with it.
- Natural shapes are **varied but controlled**: related leaves, branches, rocks, and organisms should differ subtly in size and orientation. Avoid obvious copy-paste repetition, mirrored halves, and evenly stamped textures.
- **Do not ban simple geometry where gameplay requires it.** Straight ground baselines, clean cuts for modular sprite connections, rounded eyes, and simple cloud shapes are consistent with these screenshots.
- Avoid unnecessary heavy black outlines. Use selective subdued contour lines when they make an object readable; the hero is a deliberate high-contrast exception.
- For animated objects, favor smooth, slightly asynchronous organic motion with natural anticipation and settling. This is an **animation behavior rule**, not a requirement to distort static illustrations.

---

# Part B — Forest-specific visual style

## 4. Visual target and overall impression

Forest is a **calm, airy, softly painted 2D platformer woodland**. It combines the readability of clean illustrated/game-ready shapes with gently mottled, hand-painted internal color variation.

The world feels natural, lush, slightly mysterious, and inhabited. It is **not** an intensely magical glowing forest, a high-contrast fantasy painting, a dark cave, a realistic forest photograph, or a toy-like cartoon.

**Key identity:**
- Broad horizontal side-scrolling forest scenes with plenty of pale mist-filled space.
- Large overlapping rounded crowns composed of many little leaf-shaped color dabs.
- A cool blue-green forest background contrasted with a few **bright yellow-green foreground trees** and muted reddish-brown trunks.
- A prominent brown underground cutaway with fine strata, scattered stone shapes, and branching roots.
- Small clear characters, flowers, mushrooms, and unusual eye plants integrated into the same natural world.

## 5. Color harmony — describe relations, not fixed hex values

These are **relative color families**, not a mandatory limited palette:

| Element | Visual color treatment |
| --- | --- |
| Open sky | Soft desaturated pale mint / grey-cyan; broad, calm field |
| Clouds | Small warm off-white / cream shapes with very gentle low-contrast lower shading |
| Distant forest | Pale grey-green, sage, and blue-green silhouettes dissolved into mist |
| Midground / background trees | Teal, blue-green, muted turquoise, with darker inner foliage |
| Highlighted foreground foliage | Yellow-green, soft lime, olive, and pale chartreuse; warmer than the background |
| Foreground trunks and branches | Muted terracotta, rusty orange-brown, and medium reddish-brown; darker narrow bark grooves |
| Low plants / grass | Mixtures of moss green, olive, yellow-green, dark teal-green |
| Flowers / unusual stalks | Restrained dusty rose, brick red, and burgundy accents, not neon |
| Soil cutaway | Warm muted reddish-brown upper layer over darker chocolate / umber lower strata |
| Roots | Thin to medium tapering warm brown / desaturated reddish-brown networks |
| Surface stones | Muted greys, grey-browns and slightly cool grey-green; subdued faceting |

**Color hierarchy:** cool teal forest masses dominate the upper world, pale mist separates depth, bright yellow-green trees serve as local focal points, and the warm brown soil anchors the bottom. Avoid making every leaf vivid lime or every object equally saturated.

## 6. The tree and foliage grammar — high priority
- Tree canopies are **large, soft-edged clusters** made from densely overlapping **small rounded, lobed, or petal-like painted marks**. The shape reads first as a crown, not a collection of individually outlined botanical leaves.
- Each crown uses several close shades: darker teal/olive masses beneath, lighter little leaf patches above, a few brighter highlights toward exposed edges.
- The small leaf patches vary in **size, grouping, orientation, opacity, and spacing**, but form coherent clusters. They are neither regular vector dots nor random spray noise.
- Crowns overlap and partially hide their own branches. Their silhouettes are softly uneven and rounded rather than spiky, geometric, or symmetrically ornamental.
- **Foreground focal trees** may have noticeably brighter yellow-green foliage and visible reddish-brown branching. **Background trees** retain much darker teal crowns and simplified trunks.
- Fine bark strokes follow the trunk vertically and along major branches; moderate color variation is enough. Avoid thick black edges, deeply carved hyperrealistic bark, or glossy highlights.
- A nearby tree can have a broad, low horizontal branch that reads clearly as a potential platform. Do not force every branch to be crooked purely for irregularity.

## 7. Depth and atmosphere — high priority
- Use **clear parallax-style layers**: crisp detailed foreground plants and trees; cooler teal midground trees; very soft pale misty background silhouettes.
- The **farthest** trees lose most small detail and contrast. Edges become gently blurred through atmospheric haze, not through indiscriminate blur of everything.
- The forest behind the player is spacious and light. There are distinct gaps between trunks; distant trees emerge as broad blurred silhouettes.
- Keep large calm areas of pale sky and fog around the character and between tree crowns, so the playable route remains legible.
- Distant scenery should never compete in contrast or saturation with an interactable foreground object.

## 8. Light, shade, and surface texture
- The main light is **soft, diffuse daytime illumination**, with a gentle sense of light from above. No visible hard spotlight, dramatic directional beam, or harsh cast shadow is needed.
- Use mostly matte color, **subtle internal shading** and softly painted tonal patches; maintain volume without realistic specular rendering.
- Leaf clusters create depth through overlapping shades; trunks through narrow bark strokes and understated darker creases; stones through a few broad facets.
- A slight painted/grain-like variation is acceptable, but the result must remain **clean and smooth at game scale**. Avoid heavy watercolor bleed, aggressive grit, grunge, noisy airbrushing, and photorealistic texture overlays.
- Tiny light specks/fireflies may punctuate the vegetation **sparingly**. No large bloom halos or golden lighting across the entire scene.
- Shading should stay within the established pale, low-to-moderate-contrast Forest look, not shift into a dramatic dark fantasy palette.

## 9. Ground, roots, rocks, and low vegetation
- The **walkable ground line is intentionally clear and nearly level** across the platformer scene. It may slope naturally where the gameplay terrain does; do not make the collision silhouette wavy just to look organic.
- Immediately along the surface, layer many **small, low-growing plants**: blades of grass, tiny broad-leaf clusters, occasional mushrooms and small flowers. Vary heights and density; do not build a continuous thick neon-green lawn.
- The ground is shown in a large **side-view soil cross-section** occupying roughly the bottom third of these references: a lighter muted brown upper region, darker irregular lower band, short horizontal strata marks and sparse embedded stones.
- **Root systems are visible in the soil**, branching from tree bases into tapering strands. Major roots can be thicker near the trunk, then divide into numerous fine lines. Their density and size vary naturally.
- Rocks are rounded-to-angular **stylized irregular chunks** with restrained faceted shading, in muted gray-brown or gray-green. Low piles and mossy patches work better than highly polished, equally sized stones.
- Pond edges and rocky slopes are integrated into the earth cutaway, using the same subdued stone material. The water in the references is a calm dark turquoise with a thin light surface edge.

## 10. Small ecosystem details and scale
- Mushrooms are small, clearly readable, with soft red/salmon or muted earthy caps, pale spots where appropriate, and simple light stems. They should not look glossy or toy-like.
- Delicate dusty-red eye stalks rise from the ground as thin irregular stems with a few side buds; their pale eyeballs are prominent but remain relatively small compared with the trees.
- Flower shrubs use thin light-brown stems and many small reddish-pink blossoms. Occasional pale specks near vegetation are enough for ambient life.
- The hero is a **tiny, very simple white upright silhouette** with two dark eyes and short legs, outlined much more clearly than the environment so it is always readable.
- If adding new fauna/flora, keep them proportionate to nearby mushrooms, grasses and the hero. A single creature may be extraordinary, but it should still share the game's matte material, delicate contouring, restrained shading, and scale logic.

## 11. Scene composition and gameplay readability
- Use a broad landscape composition: **sky and forest above, a narrow readable ground/character corridor, brown cutaway below**. In the supplied images, the ground roughly crosses the lower third; this is a reference proportion, not a hard measurement for every asset.
- Maintain large shape hierarchy: **canopy clusters → tree trunks → shrub/grass band → soil/roots**.
- Avoid too much detail directly behind the player's white silhouette or along crucial jumping/landing zones.
- Important foreground objects are distinguished by **shape, movement, and local contrast**, not UI-style glow, outlines, or saturation spikes.
- Keep a shared visual scale from scene to scene: distant trunks are simpler and softer; foreground trunks and rocks are detailed; flowers and mushrooms remain compact.
- Reuse visual *grammar*, not the exact positions of the screenshot trees, ponds, or gameplay objects.

## 12. Specific mismatches to avoid
- Dark cave-like teal/black lighting for an outdoor Forest scene.
- Strong spotlights, high bloom, glossy highlights, rim-light everywhere or saturated gold fantasy illumination.
- Hyperrealistic individual leaves, sharp photographic bark, realistic mud and physically rendered stones.
- Thick, uniform ink outlines around trees, rocks, grass, or canopies.
- Uniform repeated foliage stamps, perfect symmetrical trees, perfectly sized rows of rocks, repetitive procedural patterning.
- Extremely saturated neon greens, candy-colored flowers, or uniformly high color contrast.
- Excessively gritty watercolor washes, noisy painterly backgrounds, soft blurry foreground sprites.
- Overly dense ground cover that hides the player or obscures the playable ground line.
- Arbitrary warping of horizontal gameplay terrain simply to satisfy a generic “nothing straight” rule.
- UI, FPS overlays, screen borders, debug labels, and other screenshot interface details in art assets.

## 13. Checklist before approving a new Forest image
1. Could this element be placed beside the trees and ground in **both `forest0.png` and `forest1.png`** without changing their look?
2. Does it use the same **matte, softly shaded, lightly textured illustration**, rather than realistic, glossy, or heavily outlined rendering?
3. Does its color relate to the **teal forest / pale mist / yellow-green highlights / warm brown ground** harmony?
4. Are its detail size, edge sharpness, and contrast appropriate for its **depth layer and on-screen scale**?
5. Do plants/rocks/organic shapes have **controlled, meaningful variation** rather than repeated clones or random noise?
6. Is the object readable during gameplay, especially next to the small white hero?
7. For a standalone asset: is its **background truly transparent** and, if there are multiple pieces, is each in a **separate rectangular crop region**?

## 14. Suggested image-generation prompt attachment

> Follow `art_style_forest_v2.md`, using `forest0.png` and `forest1.png` as the primary **style references**. Create [REQUESTED SUBJECT] in the exact visual language of Find Myself's Forest: clean handcrafted 2D side-view game illustration; matte softly painted shading; tiny clustered leaf-dab texture where applicable; restrained natural detail; cool blue-green forest color harmony with selective pale yellow-green vegetation and muted reddish-brown wood/soil. Match the screenshots' silhouette readability, game-object scale, gentle daytime lighting, subtle edge treatment, and atmospheric depth. No photorealism, 3D rendering, thick uniform outlines, heavy glow, or exaggerated watercolor bleed. Draw only [REQUESTED SUBJECT]; do not copy screenshot UI or add scenery. For an isolated sprite, provide transparent RGBA PNG with clean edges; for multiple detachable parts, use individually rectangular-croppable regions with transparent gaps. Preserve any explicitly protected image regions unchanged.
