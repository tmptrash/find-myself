# Find Myself — Forest Art Style

Version: 1.2 (sprite sheet rectangular cropping rules)
Source of truth: approved Forest gameplay screenshots (04–05).

## Purpose and priority
Create images belonging to the Forest environment of Find Myself. Match the visual language of the supplied gameplay references, not their exact layout. Never copy screenshot UI, FPS text, borders, or object arrangements.

## Mandatory asset export rules
- **Transparent background is required for every generated standalone game asset.** Export as a PNG with a real alpha channel (RGBA); all pixels outside the actual artwork must have alpha = 0.
- **Never render a backdrop:** no solid-color background, painted scenery, gradient, stage, ground plane, checkerboard pattern, shadow cast onto a backdrop, or decorative frame. A checkerboard may appear in an editor preview only, never baked into the PNG.
- Preserve clean, smooth antialiased edges with transparency; avoid colored halos and stray opaque pixels around silhouettes.
- If one image contains multiple asset variants or detachable components, arrange them compactly to maximize the number of useful variations within the available canvas. Keep the transparent gaps between neighboring elements as small as possible while still ensuring that no silhouettes overlap or touch and that each asset can be reliably cropped programmatically. Avoid excessive margins, unused empty areas, and decorative spacing. Do not add labels, captions, or UI to the image.
- **Mandatory rectangular sprite slicing:** When a PNG contains multiple object variants, assign each variant its own dedicated, non-overlapping axis-aligned rectangular region (sprite cell). The entire visible silhouette of each variant, including every leaf, branch, root, shadow and antialiased edge, must fit completely inside its own rectangle. No pixels belonging to one object may extend into another object's rectangle, and no pair of objects may interlock, overlap, or require an irregular crop mask. Arrange rectangular regions in clean rows or columns, with the smallest practical fully transparent gutters between them; preserve enough clearance to crop any region independently using a simple `x, y, width, height` rectangle without capturing any pixels of neighboring objects. Do not draw cell borders or labels.
- Draw only the requested objects. These rules apply to foreground, background/parallax, scenery, plants, rocks, trees, roots and other isolated game assets alike. A complete background scene is an exception **only when explicitly requested**.

## Shared visual DNA
- **Format:** handcrafted, richly layered 2D side-view game illustration; clean readable silhouettes with substantial small organic detail. Not pixel art, 3D render, photorealism, anime, or glossy mobile-game clip art.
- **Mood:** quiet, enchanted, exploratory, slightly uncanny. Nature feels alive and mysterious. Avoid gratuitous horror, aggressive fantasy ornament, or cheerful toy-like styling.
- **Shape language:** asymmetric, organic, gently irregular; avoid perfectly geometric outlines, repeated identical leaves/stones, and mechanically even spacing. Shapes are deliberately readable at gameplay scale.
- **Edges:** mostly well-defined silhouette edges with restrained dark contouring and internal linework; not uniformly thick black outlines. Softer edges and lower contrast in distant layers.
- **Depth:** strong foreground/midground/background separation through overlap, atmospheric desaturation, scale, contrast and detail density. Playable ground is visually distinct from distant scenery.
- **Detail:** many small forms nested inside a few clear large masses. Concentrate detail around important silhouettes and surfaces; allow broad calm regions so the player remains visible.
- **Lighting:** controlled and localized. Ambient light establishes each biome; small emissive points, reflected color, selective highlights, and shaded undersides give depth. Do not illuminate everything equally.
- **Color:** flexible, environment-specific color harmony rather than one fixed palette. Cave uses cool deep blue/teal shadows with warm orange-gold wood and vivid yellow-green leaves; forest uses blue-green foliage, muted warm grey/olive mist and earthy brown soil. Do not lock colors to exact hex values.
- **Hero readability:** small white, black-outlined, simple upright character with two eyes and short legs, no visible arms in the references. Keep surrounding detail and value contrast from swallowing the hero.
- **Environmental motifs:** vegetation, fungi, roots, tiny glowing particles, and eye-like organic forms. Their scale and prominence should follow the scene, not be inserted everywhere.

## Forest biome — references 04–05
### Visual construction
- Wide horizontal side-scrolling woodland, layered tree trunks and large canopies.
- Canopies consist of dense clusters of small, irregular leaf-like color patches, creating an almost stippled, cut-paper impression rather than individual photorealistic leaves.
- Foreground trees use muted brown/red trunks with fine bark strokes; more distant trunks become simplified blue-green silhouettes.
- Background recedes into warm grey-green haze with soft blurred woodland shapes. The nearest canopy is darker, more saturated turquoise/teal.
- Ground is a clear horizontal gameplay line with low grasses, shrub clusters, mushrooms and occasional thin red-stemmed eye plants.
- A broad soil cross-section fills the lower portion: dusty reddish-brown strata, restrained horizontal streaks, embedded stones and exposed, branching root systems. Root networks are drawn as delicate overlapping dark lines, not thick tubes.
- Organic decorations may be strange (stalk eyes, multi-eyed plants) but remain visually integrated into the woodland.
### Forest-specific rules
- Prefer relatively flat fills and subtle layered tonal variation over strong specular shine.
- Let canopies create dense texture; keep the central playable corridor comparatively uncluttered.
- Avoid turning the forest into a cave palette or adding strong golden highlights to every plant.

## Shared material grammar
| Material | Shape | Surface treatment | Light / shadow |
| --- | --- | --- | --- |
| Rock | Angular, uneven, clustered polygons | Several grey/teal values, cracks, narrow seams | Bright upper facets; dark recesses |
| Leaf / canopy | Organic, asymmetric clusters | Overlapping color patches or veins depending on biome | Selected edge highlights; darker undersides |
| Wood / trunk | Curving tapering branches, natural forks | Fine longitudinal strokes, overlapping bands | One consistent light direction; deep creases |
| Moss / grass | Small irregular tufts, broken bands | Multiple nearby green values, not uniform carpet | Subtle highlights at exposed tips |
| Roots / vines | Thin tapering, bending paths | Branching, sparse knots/leaves | Low contrast when distant |
| Mushrooms | Recognizable stylized cap/stem or funnel form | Soft radial striation and localized color shifts | Subtle center depression or rim highlight |
| Atmosphere | Large indistinct masses | Layered muted gradients / mottling | Low contrast, never competing with foreground |

## Composition for gameplay
1. Readable playable silhouettes come before decorative complexity.
2. Make jump targets, ledge tops, hazards and interactable forms easy to distinguish.
3. Reserve negative space around the character and important routes.
4. Design at the target on-screen size, not only zoomed-in illustration scale.
5. For standalone assets, isolate the requested subject and avoid inventing UI, player, background, or extra props unless requested.

## Explicit avoid list
- Pixel-art dithering, chunky pixels, voxel or low-poly 3D appearance.
- Photographic textures, realistic PBR materials, heavy bloom or lens effects.
- Uniform black strokes around every detail, excessively smooth vector clip art, repetitive procedural stamping.
- Oversaturated rainbow palettes, uniformly bright backgrounds, noisy details with no visual hierarchy.
- Generic fantasy props unrelated to the approved screenshots.
- Inconsistent lighting directions within a single scene.

## Reference usage
- Use the Forest screenshots (04–05) as the primary reference for this environment.
- Match shape language, edge treatment, material rendering, detail density, depth and lighting hierarchy before exact RGB colors.
- If a specific request conflicts with these guidelines, follow that request while retaining other visual principles.

## Suggested prompt attachment text
"Use art_style_forest.md and the attached Forest gameplay references as art-direction guides. Create an original Forest asset matching the established silhouettes, materials, colors, depth and detail density. Exclude UI, debug overlays and unrequested objects. [Describe subject, dimensions, composition. Transparent RGBA PNG background is mandatory. If multiple variants are requested, each must fit into an independent axis-aligned rectangular crop area without touching neighboring areas.]"
