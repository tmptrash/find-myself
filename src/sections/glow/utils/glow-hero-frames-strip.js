import { CFG } from '../../../cfg.js'
import * as Hero from '../../../components/hero.js'
import { HERO_BAKE_SPRITE_SIZE, HERO_RUN_FRAME_COUNT, HERO_JUMP_FRAME_COUNT } from '../../../components/hero.js'
import { GLOW_PAL } from './glow-palette.js'
import { applyGlowGameplaySharpBake } from './glow-focus-depth.js'

//
// Run + jump frame reference strip for lesson-glow.0 (top-centred HUD).
//
//
// Each HUD frame is exactly 2× the on-level hero sprite size (96px at scale 1).
//
const STRIP_FRAME_SIZE_VS_LEVEL_HERO = 2
const FRAME_GAP_PX = 6
const ROW_GAP_PX = 6
const SECTION_GAP_PX = 8
const SIDE_PAD_PX = 12
const STRIP_TOP_PAD_PX = 6
const LABEL_FONT_SIZE = 11
const LABEL_GAP_PX = 3
const LABEL_COLOR = '#a8a8a8'
const HERO_OUTLINE_COLOR = GLOW_PAL.glowContour.gameplay
const HERO_BODY_COLOR = GLOW_PAL.heroBodyGray
const HERO_HOLLOW_OUTLINE_COLOR = HERO_BODY_COLOR
const HERO_FILLED_BODY_COLOR = String(CFG.visual.colors.hero.eyeWhite).replace('#', '')
const HERO_FILLED_OUTLINE_COLOR = CFG.visual.colors.outline
export const GLOW_HERO_FRAMES_STRIP_Z = CFG.visual.zIndex.ui + 12

const GLOW_HERO_FRAME_STRIP_SPECS = [
  {
    label: 'hollow',
    bake: {
      type: Hero.HEROES.HERO,
      bodyColor: HERO_BODY_COLOR,
      outlineColor: HERO_HOLLOW_OUTLINE_COLOR,
      outlineOnly: true,
      noEyes: true,
      pupilColor: HERO_HOLLOW_OUTLINE_COLOR,
      transparentEyeInterior: true,
      postBakeCanvas: applyGlowGameplaySharpBake
    }
  },
  {
    label: 'hollow + eyes',
    bake: {
      type: Hero.HEROES.HERO,
      bodyColor: HERO_BODY_COLOR,
      outlineColor: HERO_HOLLOW_OUTLINE_COLOR,
      outlineOnly: true,
      noEyes: false,
      pupilColor: HERO_HOLLOW_OUTLINE_COLOR,
      transparentEyeInterior: true,
      postBakeCanvas: applyGlowGameplaySharpBake
    }
  },
  {
    label: 'filled',
    bake: {
      type: Hero.HEROES.HERO,
      bodyColor: HERO_FILLED_BODY_COLOR,
      outlineColor: HERO_FILLED_OUTLINE_COLOR,
      outlineOnly: false,
      noEyes: false,
      eyeWhiteColor: CFG.visual.colors.hero.eyeWhite,
      pupilColor: CFG.visual.colors.hero.eyePupil,
      transparentEyeInterior: false,
      postBakeCanvas: applyGlowGameplaySharpBake
    }
  }
]

/**
 * Ensures glow hero run/jump bakes exist and attaches a top HUD strip to the scene.
 * @param {Object} k - Kaplay instance
 * @param {Object} sceneInst - Glow level scene inst
 * @param {number} maxHeightPx - Vertical budget (playfield top margin)
 */
export function createGlowHeroFramesStripHud(k, sceneInst, maxHeightPx) {
  const blocks = bakeGlowHeroFrameStripBlocks(k)
  const levelHeroScale = sceneInst.heroInst?.character?.scale?.x ?? 1
  sceneInst.heroFramesStrip = {
    k,
    blocks,
    maxHeightPx,
    levelHeroScale,
    displayPx: glowHeroStripFrameDisplayPx(k, levelHeroScale)
  }
  recomputeGlowHeroFramesStripLayout(sceneInst.heroFramesStrip)
  k.add([
    k.fixed(),
    k.z(GLOW_HERO_FRAMES_STRIP_Z),
    {
      draw() {
        drawGlowHeroFramesStripHud(sceneInst.heroFramesStrip)
      }
    }
  ])
}

/**
 * Recomputes frame size so all sections fit inside maxHeightPx.
 * @param {Object} stripInst - heroFramesStrip on scene inst
 */
export function glowHeroStripFrameDisplayPx(k, levelHeroScale = 1) {
  const maxCols = HERO_RUN_FRAME_COUNT
  const usableW = k.width() - SIDE_PAD_PX * 2 - FRAME_GAP_PX * (maxCols - 1)
  const fitW = Math.floor(usableW / maxCols)
  const targetPx = Math.round(
    HERO_BAKE_SPRITE_SIZE * levelHeroScale * STRIP_FRAME_SIZE_VS_LEVEL_HERO
  )
  return Math.min(targetPx, fitW)
}

export function recomputeGlowHeroFramesStripLayout(stripInst) {
  if (!stripInst) return
  const scale = stripInst.levelHeroScale ?? 1
  const displayPx = glowHeroStripFrameDisplayPx(stripInst.k, scale)
  let sectionCount = stripInst.blocks.length
  const overhead = LABEL_FONT_SIZE + LABEL_GAP_PX + ROW_GAP_PX
  while (sectionCount > 1) {
    const needH = STRIP_TOP_PAD_PX + sectionCount * (overhead + displayPx * 2) + (sectionCount - 1) * SECTION_GAP_PX
    if (needH <= stripInst.maxHeightPx) break
    sectionCount--
  }
  stripInst.visibleBlocks = stripInst.blocks.slice(0, sectionCount)
  stripInst.displayPx = displayPx
}

export function drawGlowHeroFramesStripHud(stripInst) {
  if (!stripInst?.visibleBlocks?.length) return
  const { k, visibleBlocks, displayPx, maxHeightPx } = stripInst
  const maxCols = HERO_RUN_FRAME_COUNT
  const jumpColOffset = Math.floor((maxCols - HERO_JUMP_FRAME_COUNT) / 2)
  const cellStep = displayPx + FRAME_GAP_PX
  const rowWidth = maxCols * cellStep - FRAME_GAP_PX
  const startX = (k.width() - rowWidth) / 2
  const overhead = LABEL_FONT_SIZE + LABEL_GAP_PX + ROW_GAP_PX
  const blockH = overhead + displayPx * 2 + ROW_GAP_PX
  const totalH = STRIP_TOP_PAD_PX + visibleBlocks.length * blockH + (visibleBlocks.length - 1) * SECTION_GAP_PX - ROW_GAP_PX
  let y = STRIP_TOP_PAD_PX + Math.max(0, (maxHeightPx - totalH) / 2)
  const labelRgb = parseStripLabelRgb(k)
  for (const block of visibleBlocks) {
    k.drawText({
      text: block.label,
      pos: k.vec2(k.width() / 2, y),
      size: LABEL_FONT_SIZE,
      anchor: 'center',
      color: labelRgb,
      font: CFG.visual.fonts.regularFull
    })
    y += LABEL_FONT_SIZE + LABEL_GAP_PX
    drawGlowHeroFrameStripRow(k, block.prefix, 'run', HERO_RUN_FRAME_COUNT, 0, startX, y, displayPx, cellStep)
    y += displayPx + ROW_GAP_PX
    drawGlowHeroFrameStripRow(k, block.prefix, 'jump', HERO_JUMP_FRAME_COUNT, jumpColOffset, startX, y, displayPx, cellStep)
    y += displayPx + SECTION_GAP_PX
  }
}

export function bakeGlowHeroFrameStripBlocks(k) {
  return GLOW_HERO_FRAME_STRIP_SPECS.map(spec => {
    const bake = { k, ...spec.bake }
    Hero.loadHeroSprites(bake)
    const prefix = Hero.buildHeroSpritePrefix(bake)
    return { label: spec.label, prefix }
  })
}

function drawGlowHeroFrameStripRow(k, prefix, anim, frameCount, colOffset, startX, y, displayPx, cellStep) {
  for (let f = 0; f < frameCount; f++) {
    const x = startX + (colOffset + f) * cellStep
    k.drawSprite({
      sprite: `${prefix}-${anim}-${f}`,
      pos: k.vec2(x, y),
      width: displayPx,
      height: displayPx
    })
  }
}

function parseStripLabelRgb(k) {
  const hex = LABEL_COLOR.replace('#', '')
  return k.rgb(
    parseInt(hex.substring(0, 2), 16),
    parseInt(hex.substring(2, 4), 16),
    parseInt(hex.substring(4, 6), 16)
  )
}
