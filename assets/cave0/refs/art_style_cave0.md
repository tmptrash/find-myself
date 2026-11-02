# Find Myself — Cave0 Art Style

Version: 1.1 (split from ART_STYLE.md)
Source of truth: approved Cave0 gameplay screenshots (01–03).

## Purpose and priority
Create images belonging to the Cave0 environment of Find Myself. Match the visual language of the supplied gameplay references, not their exact layout. Never copy screenshot UI, FPS text, borders, or object arrangements.

## Mandatory asset export rules
- **Transparent background is required for every generated standalone game asset.** Export as a PNG with a real alpha channel (RGBA); all pixels outside the actual artwork must have alpha = 0.
- **Never render a backdrop:** no solid-color background, painted scenery, gradient, stage, ground plane, checkerboard pattern, shadow cast onto a backdrop, or decorative frame. A checkerboard may appear in an editor preview only, never baked into the PNG.
- Preserve clean, smooth antialiased edges with transparency; avoid colored halos and stray opaque pixels around silhouettes.
- If one image contains multiple asset variants or detachable components, keep each component visually separate with sufficient transparent padding for reliable programmatic cropping. Do not add labels, captions, or UI to the image.
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

## Cave0 biome — references 01–03
### Visual construction
- Deep cavern with dark navy, petroleum-blue and green-blue negative space, softly mottled rock atmosphere, and dim distant ledges.
- Strong rocky frame and platforms: irregular polygonal grey stones of many sizes, visible dark cracks, small black gaps, selective light grey faces, patches of teal-dark rock and tiny moss/grass clusters.
- Platforms have clear horizontal or gently sloped playable upper surfaces, substantial rock bodies, and visually broken undersides. Hanging vines/roots may fall below, but are not themselves implied as walkable surfaces.
- Distant platforms use darker, less contrasty green stone clusters and soft detail, not the same bright foreground-rock texture.
- Central landmark is a giant twisting golden-orange organic trunk, with intertwined branches, warm directional highlights, dark seams, attached smaller leaves, and broad bright yellow-green leaf platforms with visible veins, torn/holed edges and darker undersides.
- Secondary plants include salmon/peach funnel mushrooms along cliff walls, pale mint/teal parasol-like stalk plants, tiny cyan bioluminescent fungi, thin hanging vines and small floating light specks.
- Water, where present, is calm and blue-green with a clean thin surface highlight and partially visible submerged roots/rocks.
### Cave-specific rules
- Maintain a clear contrast between cool cavern atmosphere and selected luminous warm vegetation.
- The bright tree is a focal point, not a requirement that every asset must glow or be golden.
- Foreground stone texture can be densely articulated; avoid equally dense treatment of the distant background.
- Preserve believable structural layering: rock mass, moss, hanging growth, atmosphere, then distant structures.

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
- Use the Cave0 screenshots (01–03) as the primary reference for this environment.
- Match shape language, edge treatment, material rendering, detail density, depth and lighting hierarchy before exact RGB colors.
- If a specific request conflicts with these guidelines, follow that request while retaining other visual principles.

## Suggested prompt attachment text
"Use art_style_cave0.md and the attached Cave0 gameplay references as art-direction guides. Create an original Cave0 asset matching the established silhouettes, materials, colors, depth and detail density. Exclude UI, debug overlays and unrequested objects. [Describe subject, dimensions, composition. Transparent RGBA PNG background is mandatory.]"
