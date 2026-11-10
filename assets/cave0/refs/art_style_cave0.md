# Find Myself — Cave0 Art Style

Version: 2.2 (general rules extended with the level-independent guidance of the Forest style)
Source of truth: approved Cave0 gameplay screenshots (01–03).

This file has two parts:
- **Part A — General rules.** Shared by every level of Find Myself; the same text lives in every level's style file (e.g. `art_style_forest.md`). Change it in all files at once.
- **Part B — Cave0-specific rules.** Apply only to the Cave0 level.

When Part B conflicts with Part A, Part B wins for this level.

---

# Part A — General rules (all levels)

## Purpose and priority
Create images belonging to one level (environment) of Find Myself. Match the visual language of that level's supplied gameplay references, not their exact layout. Never copy screenshot UI, FPS text, borders, or object arrangements.

## Mandatory asset export rules
- **Transparent background is required for every generated standalone game asset.** Export as a PNG with a real alpha channel (RGBA); all pixels outside the actual artwork must have alpha = 0.
- **Never render a backdrop:** no solid-color background, painted scenery, gradient, stage, ground plane, checkerboard pattern, shadow cast onto a backdrop, or decorative frame. A checkerboard may appear in an editor preview only, never baked into the PNG.
- Preserve clean, smooth antialiased edges with transparency; avoid colored halos and stray opaque pixels around silhouettes.
- If one image contains multiple asset variants or detachable components, arrange them compactly to maximize the number of useful variations within the available canvas. Keep the transparent gaps between neighboring elements as small as possible while still ensuring that no silhouettes overlap or touch and that each asset can be reliably cropped programmatically. Avoid excessive margins, unused empty areas, and decorative spacing. Do not add labels, captions, or UI to the image.
- **Mandatory rectangular sprite slicing:** When a PNG contains multiple object variants, assign each variant its own dedicated, non-overlapping axis-aligned rectangular region (sprite cell). The entire visible silhouette of each variant, including every leaf, branch, root, shadow and antialiased edge, must fit completely inside its own rectangle. No pixels belonging to one object may extend into another object's rectangle, and no pair of objects may interlock, overlap, or require an irregular crop mask. Arrange rectangular regions in clean rows or columns, with the smallest practical fully transparent gutters between them; preserve enough clearance to crop any region independently using a simple `x, y, width, height` rectangle without capturing any pixels of neighboring objects. Do not draw cell borders or labels.
- Draw only the requested objects. These rules apply to foreground, background/parallax, scenery, plants, rocks, trees, roots and other isolated game assets alike. A complete background scene is an exception **only when explicitly requested**.
- **Partial edits:** if the task asks to keep existing parts exactly, change only the requested region instead of redrawing the whole asset.
- **Rigged / animated assets:** keep every independently moving piece separate, with attachment points and layering that work with programmatic animation. Do not invent visible holes, hinges or joints unless requested.
- **Animation frames on one sheet:** every frame gets its own rectangular cell, and all frames share one scale and one registration (the same ground line and the same anchor such as the eye or the body centre), so the animation does not jitter when frames are swapped.

## Shared visual DNA
- **Format:** handcrafted, richly layered 2D side-view game illustration; clean readable silhouettes with substantial small organic detail. Not pixel art, 3D render, photorealism, anime, or glossy mobile-game clip art.
- **Mood:** quiet, enchanted, exploratory, slightly uncanny. Nature feels alive and mysterious. Avoid gratuitous horror, aggressive fantasy ornament, or cheerful toy-like styling. A level may shift this mood (darker, more tense) only as its own section describes.
- **Shape language:** asymmetric, organic, gently irregular; avoid perfectly geometric outlines, repeated identical leaves/stones, and mechanically even spacing. Shapes are deliberately readable at gameplay scale.
- **Edges:** mostly well-defined silhouette edges with restrained dark contouring and internal linework; not uniformly thick black outlines. Softer edges and lower contrast in distant layers.
- **Depth:** strong foreground/midground/background separation through overlap, atmospheric desaturation, scale, contrast and detail density. Playable ground is visually distinct from distant scenery.
- **Detail:** many small forms nested inside a few clear large masses. Concentrate detail around important silhouettes and surfaces; allow broad calm regions so the player remains visible.
- **Lighting:** controlled and localized. Ambient light establishes each biome; small emissive points, reflected color, selective highlights, and shaded undersides give depth. Do not illuminate everything equally.
- **Color:** flexible, environment-specific color harmony rather than one fixed palette; each level's section names its own harmony. Do not lock colors to exact hex values.
- **Hero readability:** small white, black-outlined, simple upright character with two eyes and short legs, no visible arms in the references. Keep surrounding detail and value contrast from swallowing the hero.
- **Environmental motifs:** vegetation, fungi, roots, tiny glowing particles, and eye-like organic forms. Their scale and prominence should follow the scene, not be inserted everywhere.

## Analog, not mechanical
The style is analog, like everything in nature: made by hand and grown, never stamped out by a rule or a machine. Controlled irregularity beats precision. If a viewer can spot the rule that placed something (a grid, a copy-paste, a mirrored half, even steps), roughen it.
- **Never exact:** no perfectly repeated, mirrored, aligned or evenly spaced elements, no perfect symmetry, no ruler-straight lines, no perfect circles or arcs. Horizontals are slightly uneven, curves wander, edges vary in weight along their length.
- **Every instance differs:** two things of one kind differ in size, tilt, proportion, tone and wear. Clusters have uneven counts and uneven gaps. Break any rhythm that starts to feel regular.
- **Colour and light drift:** surfaces shift gradually in hue and value (mottling, stains, patches of wear, uneven wetness, soft light falloff) instead of flat uniform fills or hard stepped gradients. The same material is a little warmer here and cooler there.
- **Analog texture:** grain, soft bleed and paint-like variation, as in film or gouache. Not tiled patterns, uniform digital noise, or sterile pixel-perfect vector edges.
- **Living motion:** idle and ambient animation has organic timing: eased starts and stops, a slightly different beat each cycle, offset phases between neighbours. Nothing moves in lockstep like a metronome, and loops do not read as a loop.
- **Structured, not random:** irregularity follows how the thing grows (branching, weathering, flow of water, pull of light). Pure noise looks as artificial as pure order.
- **Gameplay exceptions:** irregularity never breaks gameplay. Walkable surfaces keep a clear, readable top line (level or gently sloped as the terrain needs it); do not warp a collision surface just to look organic. Clean cut edges where modular sprites join, round eyes and simple readable shapes for interactable objects are allowed.
- **Animation feel:** motion eases in and out with a little anticipation and settling. This is a rule for movement; do not distort static illustrations to suggest it.

## Rendering at game scale
- **Matte, softly shaded surfaces:** volume comes from subtle internal shading and painted tonal patches, not from realistic specular highlights. Glossy wet accents are rare and deliberate.
- **Clean at game size:** grain and paint-like variation stay subtle; the asset must read clean and smooth at its real on-screen size. No heavy watercolor bleed, grunge, aggressive grit, noisy airbrushing or photo texture overlays.
- **Outline weight follows importance:** environment contours are selective and subdued; the hero is the deliberate high-contrast exception and stays outlined more clearly than anything around him.
- **Depth by layer, not by blur:** the farthest layers lose detail, contrast and saturation through the level's atmosphere (haze, darkness, mist). Never blur everything; foreground and gameplay sprites stay sharp.
- **Light accents are sparse:** small light specks, fireflies or spores punctuate a scene rarely. No large bloom halos and no one-colour wash of light across the whole frame.

## Color hierarchy
- Describe color as **relations between families**, not fixed hex values.
- One dominant color family carries most of the scene; a warmer or brighter family marks a few local focal points; a grounding family anchors the bottom. The level's section names its own families.
- Do not make every object equally saturated or every leaf equally vivid. Saturation and contrast spikes are reserved for focal points and interactables.
- Distant scenery never competes in contrast or saturation with an interactable foreground object.

## Foliage and organic masses
- A crown, bush or moss bed reads **first as one mass**, then as the small marks it is built from (leaf dabs, lobes, veins, tufts).
- Each mass uses a few close shades: darker underneath and inside, lighter patches above, a few brighter accents at exposed edges.
- Small marks vary in size, grouping, orientation and spacing but form coherent clusters: neither regular vector dots nor random spray noise.
- Silhouettes are softly uneven, not spiky, geometric or ornamentally symmetric. Masses may overlap and hide their own branches.
- Focal foreground plants may be brighter and more detailed; background ones keep darker, simpler masses and simplified trunks.
- Roots taper from thick near the base into many fine branching strands, with natural variation in density and size. Rocks are stylized irregular chunks with a few broad facets, in low piles of varied size, not polished or equally sized.

## Scale and new creatures
- Keep one shared scale logic: compare every new plant or creature with the hero, nearby mushrooms and grass before approving it.
- An extraordinary creature may stand out by shape or behaviour, but it still shares the game's material, contour treatment, restrained shading and scale.
- Small ecosystem details (fungi, flowers, eye-stalks, specks of life) stay compact and readable; they decorate the world, not dominate it.

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
6. Keep busy detail out from directly behind the hero and out of crucial jumping and landing zones.
7. Make important objects stand out through shape, movement and local contrast, not UI-like glow, outlines or saturation spikes.
8. Keep a clear large-shape hierarchy: big masses, then their supports (trunks, rock bodies), then the low plant band, then the ground or underground.
9. Reuse the visual grammar of the references, never the exact positions of their objects.

## Explicit avoid list
- Pixel-art dithering, chunky pixels, voxel or low-poly 3D appearance.
- Photographic textures, realistic PBR materials, heavy bloom or lens effects.
- Uniform black strokes around every detail, excessively smooth vector clip art, repetitive procedural stamping.
- Oversaturated rainbow palettes, uniformly bright backgrounds, noisy details with no visual hierarchy.
- Generic fantasy props unrelated to the approved screenshots.
- Inconsistent lighting directions within a single scene.
- Mechanical regularity: copy-pasted, mirrored or grid-spaced elements, perfect symmetry, ruler-straight lines, perfect circles, uniform sizes, lockstep animation, flat digital gradients.
- Soft or blurry foreground sprites; heavy watercolor bleed or grit at game scale.
- Ground cover so dense it hides the player or the playable surface line.
- Arbitrary warping of walkable terrain only to look organic.

## Reference usage
- Use the level's own screenshots as the primary reference for its environment.
- Match shape language, edge treatment, material rendering, detail density, depth and lighting hierarchy before exact RGB colors.
- If a specific request conflicts with these guidelines, follow that request while retaining other visual principles.
- If a written rule produces a visibly different result from the approved screenshots, follow the screenshots.

## Approval checklist (any level)
1. Could the element sit beside the objects in the level's approved screenshots without changing their look?
2. Does it use the same matte, softly shaded, lightly textured illustration, rather than realistic, glossy or heavily outlined rendering?
3. Does its color belong to the level's color harmony and its place in the color hierarchy (dominant, focal or grounding)?
4. Are its detail size, edge sharpness and contrast right for its depth layer and on-screen size?
5. Do organic shapes show controlled, meaningful variation rather than clones or random noise?
6. Is it readable during gameplay, especially next to the small white hero?
7. For a standalone asset: is the background truly transparent, and does each piece or frame sit in its own rectangular crop cell?

---

# Part B — Cave0-specific rules

## Place in the cave descent
- Cave0 is **the first of three cave depths**. It is the shallowest and gentlest one: the world under the surface is only beginning to open up.
- Leave room for the deeper levels to escalate: they become darker, more luminous, stranger and more hostile. Do not use up that escalation in Cave0 — no extreme darkness, dense glow, grotesque creatures or threatening forms.
- The surface is still close. Its traces belong to the look: light from above, roots coming down through the ceiling, soil and moss on upper ledges.

## Mood
- Calm, curious, damp and alive: a hidden place rather than a scary one.
- **The atmosphere is not yet strongly oppressive or frightening.** Keep open breathing space in compositions and readable mid-values. No claustrophobic black masses pressing in from every side.
- Uncanny details (eye-like forms, odd fungi) are quiet and curious, not menacing.

## Living closed ecosystem
- The animals and plants of Cave0 form a **closed ecosystem that lives its own life**, independent of the hero. Every creature has a place in it: what it eats, where it rests, what grows on it or around it.
- Show these links visually: grazers near the moss and fungi they feed on, small predators near their prey's paths, plants growing on shells, nests or droppings, fungi on dead roots, life gathered around water and light.
- Creatures are **minimally aggressive towards the hero** compared with the deeper levels. They are **usually busy with themselves** — feeding, cleaning, sleeping, building, drinking, gathering, tending their young — rather than watching or hunting the hero.
- Poses and expressions are relaxed, absorbed, or at most mildly curious. Avoid bared teeth, charging poses, spikes aimed outward and eyes glaring at the viewer.
- Hazards must still read clearly as hazards (see Part A, Composition). They come from the place itself (sharp rock, a creature guarding its food, a falling drop), not from hostility.

## Water
- Water is everywhere in Cave0 and is one of its main motifs:
  - **Lakes:** calm and blue-green, with a clean thin surface highlight and partly visible submerged roots and rocks.
  - **Small waterfalls:** thin, narrow streams falling from ledges and cracks into pools, with a little foam and spray at the bottom. Never wide or roaring cascades.
  - **Dripping water:** drops falling from stalactites, roots and ledges; wet streaks on rock; small puddles and ripples where the drops land.
- Wet surfaces get a few small, cool highlights. Do not make every stone glossy.
- Life clusters near water: moss, fungi, small creatures drinking or feeding.

## Light from the surface
- **Occasionally**, shafts of daylight break through cracks in the ceiling. They are rare, soft-edged, slightly warm or neutral beams, with dust or droplets floating in them.
- Where a beam lands it can wake the place up: brighter moss, a small plant reaching towards it, a creature warming itself.
- Beams never cover the playable route like fog and never compete with the hero or hazards.

## Glow budget
- **Glowing elements are still few.** Bioluminescence is a rare accent: a few small cyan fungi, sparse floating light specks, an occasional glowing creature detail.
- Most light comes from cool ambient cave light, water reflections and the occasional surface beam, not from emissive objects.
- Never make a whole asset glow by default. Glow is something the deeper levels develop.

## Cave0 biome — references 01–03
### Color
- Cave uses cool deep blue/teal shadows with warm orange-gold wood and vivid yellow-green leaves.
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

## Cave0 reference usage
- Use the Cave0 screenshots (01–03) as the primary reference for this environment.

## Suggested prompt attachment text
"Use art_style_cave0.md and the attached Cave0 gameplay references as art-direction guides. Create an original Cave0 asset matching the established silhouettes, materials, colors, depth and detail density. Cave0 is the first and gentlest of three cave depths: calm and alive, with a closed ecosystem whose creatures are busy with themselves, water (lakes, thin waterfalls, drips), rare light shafts from the surface and only a few glowing accents. The look is analog and organic like nature, never mechanical: nothing exactly repeated, symmetric or evenly spaced. Exclude UI, debug overlays and unrequested objects. [Describe subject, dimensions, composition. Transparent RGBA PNG background is mandatory. If multiple variants are requested, each must fit into an independent axis-aligned rectangular crop area without touching neighboring areas.]"
