// Get color as Kaplay object
export function getColor(k, colorHex) {
  const [r, g, b] = parseHex(colorHex)
  return k.color(r, g, b)
}

// Get RGB color as Kaplay object
export function getRGB(k, colorHex) {
  const [r, g, b] = parseHex(colorHex)
  return k.rgb(r, g, b)
}

// Get hex string for Canvas API
export function getHex(colorHex) {
  // Type check
  if (typeof colorHex !== 'string') {
    console.error('getHex: expected string, got', typeof colorHex, colorHex)
    // If it's an RGB array, convert to hex
    if (Array.isArray(colorHex) && colorHex.length === 3) {
      const r = colorHex[0].toString(16).padStart(2, '0')
      const g = colorHex[1].toString(16).padStart(2, '0')
      const b = colorHex[2].toString(16).padStart(2, '0')
      return `#${r}${g}${b}`
    }
    throw new Error(`getHex: colorHex must be a string, got ${typeof colorHex}`)
  }
  
  return `#${colorHex.replace('#', '')}`
}

// Parse hex string into RGB components
export function parseHex(colorHex) {
  // Type check and conversion
  if (typeof colorHex !== 'string') {
    console.error('parseHex: expected string, got', typeof colorHex, colorHex)
    // If it's an array, return it as is
    if (Array.isArray(colorHex) && colorHex.length === 3) {
      return colorHex
    }
    throw new Error(`parseHex: colorHex must be a string, got ${typeof colorHex}`)
  }
  
  const hex = colorHex.replace('#', '')
  const r = parseInt(hex.substring(0, 2), 16)
  const g = parseInt(hex.substring(2, 4), 16)
  const b = parseInt(hex.substring(4, 6), 16)
  return [r, g, b]
}

// Check if any of the keys is pressed (down)
export function isAnyKeyDown(k, keys) {
  return keys.some(key => k.isKeyDown(key))
}
