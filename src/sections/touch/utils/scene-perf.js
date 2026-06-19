//
// Shared distance / zone helpers for touch level runtime optimization.
//

/**
 * Camera focus X — hero position when available, otherwise viewport center.
 * @param {Object} k - Kaplay instance
 * @param {Object} heroInst - Hero instance
 * @returns {number}
 */
export function getCameraCenterX(k, heroInst) {
  return heroInst?.character?.pos?.x ?? k.width() / 2
}

/**
 * @param {Object} k - Kaplay instance
 * @param {number} screenMult - Multiplier of screen width
 * @returns {number}
 */
export function getDistanceThreshold(k, screenMult) {
  return k.width() * screenMult
}

/**
 * True when object X is within screenMult viewport widths of camera X.
 * @param {number} objectX
 * @param {number} cameraX
 * @param {number} thresholdPx
 * @returns {boolean}
 */
export function isWithinDistance(objectX, cameraX, thresholdPx) {
  return Math.abs(objectX - cameraX) <= thresholdPx
}

/**
 * Returns active zone index for evenly split horizontal bands.
 * @param {number} heroX
 * @param {number} leftBound
 * @param {number} rightBound
 * @param {number} zoneCount
 * @returns {number}
 */
export function getActiveZoneIndex(heroX, leftBound, rightBound, zoneCount) {
  const span = rightBound - leftBound
  if (span <= 0 || zoneCount < 1) return 0
  const t = (heroX - leftBound) / span
  const idx = Math.floor(t * zoneCount)
  if (idx < 0) return 0
  if (idx >= zoneCount) return zoneCount - 1
  return idx
}

/**
 * True when zoneIndex is active or adjacent (hero zone ±1) for soft wake.
 * @param {number} zoneIndex
 * @param {number} activeZone
 * @param {number} zoneCount
 * @returns {boolean}
 */
export function isZoneAwake(zoneIndex, activeZone, zoneCount) {
  return Math.abs(zoneIndex - activeZone) <= 1 || zoneCount <= 1
}
