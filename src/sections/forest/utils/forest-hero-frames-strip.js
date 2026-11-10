import { CFG } from '../../../cfg.js'
import * as Hero from '../../../components/hero.js'

//
// Run + jump frame reference strip for lesson-forest.0 (top-centred HUD).
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
const STRIP_LABEL = 'hero'
//
// The run row shows the live-leg gait at RUN_POSE_COUNT evenly spaced phases.
//
const RUN_POSE_COUNT = 8

/**
 * Recomputes frame size so all sections fit inside maxHeightPx.
 * @param {Object} stripInst - heroFramesStrip on scene inst
 */
function forestHeroStripFrameDisplayPx(k, levelHeroScale = 1) {
  const maxCols = RUN_POSE_COUNT
  const usableW = k.width() - SIDE_PAD_PX * 2 - FRAME_GAP_PX * (maxCols - 1)
  const fitW = Math.floor(usableW / maxCols)
  const targetPx = Math.round(
    Hero.HERO_BAKE_SPRITE_SIZE * levelHeroScale * STRIP_FRAME_SIZE_VS_LEVEL_HERO
  )
  return Math.min(targetPx, fitW)
}

export function recomputeForestHeroFramesStripLayout(stripInst) {
  if (!stripInst) return
  const scale = stripInst.levelHeroScale ?? 1
  const displayPx = forestHeroStripFrameDisplayPx(stripInst.k, scale)
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

export function drawForestHeroFramesStripHud(stripInst) {
  if (!stripInst?.visibleBlocks?.length) return
  const { k, visibleBlocks, displayPx, maxHeightPx } = stripInst
  const maxCols = RUN_POSE_COUNT
  const jumpColOffset = Math.floor((maxCols - Hero.HERO_JUMP_FRAME_COUNT) / 2)
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
    drawForestHeroRunPoseRow(k, block.legs, startX, y, displayPx, cellStep)
    y += displayPx + ROW_GAP_PX
    drawForestHeroFrameStripRow(k, block.prefix, 'jump', Hero.HERO_JUMP_FRAME_COUNT, jumpColOffset, startX, y, displayPx, cellStep)
    y += displayPx + SECTION_GAP_PX
  }
}

export function bakeForestHeroFrameStripBlocks(k) {
  Hero.loadHeroSprites(k)
  return [{ label: STRIP_LABEL, prefix: Hero.HERO_SPRITE_PREFIX, legs: Hero.createRunLegs(k) }]
}

//
// The run gait at evenly spaced phases, each pose scaled into its cell.
//
function drawForestHeroRunPoseRow(k, legs, startX, y, displayPx, cellStep) {
  const scale = displayPx / Hero.HERO_BAKE_SPRITE_SIZE
  for (let f = 0; f < RUN_POSE_COUNT; f++) {
    k.pushTransform()
    k.pushTranslate(k.vec2(startX + f * cellStep + displayPx / 2, y + displayPx / 2))
    k.pushScale(k.vec2(scale, scale))
    Hero.drawRunningHero(k, legs, { x: 0, y: 0, facing: 1, phase: f / RUN_POSE_COUNT, groundY: Hero.HERO_FEET_OFFSET_Y })
    k.popTransform()
  }
}
function drawForestHeroFrameStripRow(k, prefix, anim, frameCount, colOffset, startX, y, displayPx, cellStep) {
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
