import { CFG } from '../cfg.js'
import * as Hero from '../../../components/hero.js'
import { saveLastLevel } from '../../../utils/progress.js'
import * as Sound from '../../../utils/sound.js'
import * as FpsCounter from '../../../utils/fps-counter.js'
import * as LevelIndicator from '../components/level-indicator.js'
import { createLevelTransition } from '../../../utils/transition.js'
//
// Platform dimensions (minimal margins for large play area)
//
const TOP_MARGIN = CFG.visual.gameArea.topMargin
const BOTTOM_MARGIN = CFG.visual.gameArea.bottomMargin
const LEFT_MARGIN = CFG.visual.gameArea.leftMargin
const RIGHT_MARGIN = CFG.visual.gameArea.rightMargin
//
// Hero spawn positions
//
const ANTIHERO_SPAWN_X = CFG.visual.screen.width - RIGHT_MARGIN - 100

/**
 * Level 3 scene for touch section
 * @param {Object} k - Kaplay instance
 */
export function sceneLevel3(k) {
  k.scene("level-touch.3", () => {
    //
    // Save progress
    //
    saveLastLevel('level-touch.3')
    //
    // Set gravity
    //
    k.setGravity(CFG.game.gravity)
    //
    // Create sound instance
    //
    const sound = Sound.create()
    Sound.startAudioContext(sound)
    //
    // Start touch.mp3 background music
    //
    const touchMusic = k.play('touch', {
      loop: true,
      volume: CFG.audio.backgroundMusic.touch
    })
    //
    // Stop music when leaving the scene
    //
    k.onSceneLeave(() => {
      touchMusic.stop()
    })
    //
    // Draw background
    //
    k.onDraw(() => {
      k.drawRect({
        width: k.width(),
        height: k.height(),
        pos: k.vec2(0, 0),
        color: k.rgb(42, 42, 42)
      })
    })
    //
    // Create walls
    //
    // Left wall (full height)
    //
    k.add([
      k.rect(LEFT_MARGIN, CFG.visual.screen.height),
      k.pos(LEFT_MARGIN / 2, CFG.visual.screen.height / 2),
      k.anchor("center"),
      k.area(),
      k.body({ isStatic: true }),
      k.color(31, 31, 31),
      k.z(CFG.visual.zIndex.platforms),
      CFG.game.platformName
    ])
    //
    // Right wall (full height)
    //
    k.add([
      k.rect(RIGHT_MARGIN, CFG.visual.screen.height),
      k.pos(CFG.visual.screen.width - RIGHT_MARGIN / 2, CFG.visual.screen.height / 2),
      k.anchor("center"),
      k.area(),
      k.body({ isStatic: true }),
      k.color(31, 31, 31),
      k.z(CFG.visual.zIndex.platforms),
      CFG.game.platformName
    ])
    //
    // Top wall (full width)
    //
    k.add([
      k.rect(CFG.visual.screen.width, TOP_MARGIN),
      k.pos(CFG.visual.screen.width / 2, TOP_MARGIN / 2),
      k.anchor("center"),
      k.area(),
      k.body({ isStatic: true }),
      k.color(31, 31, 31),
      k.z(CFG.visual.zIndex.platforms),
      CFG.game.platformName
    ])
    //
    // Create level indicator (TOUCH letters)
    //
    LevelIndicator.create({
      k,
      levelNumber: 3,
      activeColor: '#8B5A50',
      inactiveColor: '#808080',
      completedColor: '#8B5A50',
      topPlatformHeight: TOP_MARGIN,
      sideWallWidth: LEFT_MARGIN
    })
    //
    // Create static cloud platform where hero platform was
    // Position: below letters (TOP_MARGIN + 40 + fontSize + spacing), lowered by 5px
    //
    const TOUCH_FONT_SIZE = 48
    //
    // Calculate grid dimensions first (needed for cloud platform positioning)
    // Grid should be positioned to leave space for hero and arrows on the left
    // Grid ends 50px before right platform (right platform starts at screen.width - RIGHT_MARGIN)
    //
    const CLOUD_BLOCK_SIZE = 75
    const GRID_COLUMNS = 12  // Fixed number of grid columns
    const GRID_CELL_SIZE = CLOUD_BLOCK_SIZE  // Grid cell size equals block size
    const GRID_WIDTH = GRID_COLUMNS * GRID_CELL_SIZE  // Total grid width
    const GRID_RIGHT_MARGIN = 50  // Margin from right platform (50 pixels)
    const GRID_RIGHT = CFG.visual.screen.width - RIGHT_MARGIN - GRID_RIGHT_MARGIN  // Grid ends 50px before right platform
    const GRID_LEFT = GRID_RIGHT - GRID_WIDTH  // Grid starts from right platform minus margin minus width
    //
    // Cloud platform lowered significantly - hero will be fixed at this level
    // Platform width matches grid width, positioned to align with grid
    //
    const CLOUD_PLATFORM_Y = TOP_MARGIN + 40 + TOUCH_FONT_SIZE + 150  // Lowered significantly
    const CLOUD_PLATFORM_WIDTH = GRID_WIDTH  // Platform width matches grid width
    const CLOUD_PLATFORM_HEIGHT = 30
    const CLOUD_PLATFORM_X = GRID_LEFT + CLOUD_PLATFORM_WIDTH / 2  // Platform centered on grid
    //
    // Create cloud platform with collision (hero can stand and jump on it)
    //
    const cloudPlatform = k.add([
      k.rect(CLOUD_PLATFORM_WIDTH, CLOUD_PLATFORM_HEIGHT),
      k.pos(CLOUD_PLATFORM_X, CLOUD_PLATFORM_Y),
      k.anchor("center"),
      k.area(),
      k.body({ isStatic: true }),
      k.opacity(0),  // Invisible collision - visual is drawn separately
      k.z(CFG.visual.zIndex.platforms),
      CFG.game.platformName,
      "cloud-platform"  // Tag for identification
    ])
    createStaticCloudPlatform(k, CLOUD_PLATFORM_X, CLOUD_PLATFORM_Y, CLOUD_PLATFORM_WIDTH, CLOUD_PLATFORM_HEIGHT)
    const CLOUD_PLATFORM_TOP_Y = CLOUD_PLATFORM_Y - CLOUD_PLATFORM_HEIGHT / 2
    //
    // Bottom platform (full width)
    // Cloud blocks will stop here
    //
    const bottomPlatform = k.add([
      k.rect(CFG.visual.screen.width, BOTTOM_MARGIN),
      k.pos(CFG.visual.screen.width / 2, CFG.visual.screen.height - BOTTOM_MARGIN / 2),
      k.anchor("center"),
      k.area(),
      k.body({ isStatic: true }),
      k.color(31, 31, 31),
      k.z(CFG.visual.zIndex.platforms),
      CFG.game.platformName,
      "bottom-platform"  // Tag for cloud block collision detection
    ])
    const BOTTOM_PLATFORM_Y = CFG.visual.screen.height - BOTTOM_MARGIN / 2
    const BOTTOM_PLATFORM_TOP_Y = BOTTOM_PLATFORM_Y - BOTTOM_MARGIN / 2
    //
    // Hero spawn position on bottom platform (between left platform and grid)
    // Position hero between left margin and grid start
    //
    const HERO_AREA_CENTER_X = LEFT_MARGIN + (GRID_LEFT - LEFT_MARGIN) / 2  // Center between left margin and grid
    const HERO_SPAWN_X_ON_PLATFORM = HERO_AREA_CENTER_X  // Position hero in center of available space
    //
    // Create arrows (left and right) on bottom platform with hero, moved right
    // Position arrows slightly above platform
    //
    const ARROWS_Y_OFFSET = -23  // Move arrows up by 23 pixels (lowered by 2px from -25)
    const arrowsInst = createCloudPlatformArrows(k, HERO_SPAWN_X_ON_PLATFORM, BOTTOM_PLATFORM_Y + ARROWS_Y_OFFSET)
    //
    // Store bottomPlatformTopY for use in createCloudBlock
    //
    const bottomPlatformTopY = BOTTOM_PLATFORM_TOP_Y
    //
    // Create anti-hero on cloud platform (where hero was)
    //
    const ANTIHERO_COLLISION_HEIGHT = 25
    const ANTIHERO_SCALE = 3
    const ANTIHERO_COLLISION_HEIGHT_SCALED = ANTIHERO_COLLISION_HEIGHT * ANTIHERO_SCALE  // 75
    const ANTIHERO_Y_ON_CLOUD_PLATFORM = CLOUD_PLATFORM_TOP_Y - ANTIHERO_COLLISION_HEIGHT_SCALED / 2  // Anti-hero center positioned so bottom touches cloud platform top
    const ANTIHERO_X_ON_CLOUD_PLATFORM = CLOUD_PLATFORM_X  // Center of cloud platform
    
    const antiHeroInst = Hero.create({
      k,
      x: ANTIHERO_X_ON_CLOUD_PLATFORM,
      y: ANTIHERO_Y_ON_CLOUD_PLATFORM,
      type: Hero.HEROES.ANTIHERO,
      controllable: false,
      sfx: sound,
      antiHero: null,
      addArms: true
    })
    //
    // Create hero with anti-hero reference for annihilation
    // Position hero on bottom platform in left corner
    //
    const HERO_COLLISION_HEIGHT = 25
    const HERO_SCALE = 3
    const HERO_COLLISION_HEIGHT_SCALED = HERO_COLLISION_HEIGHT * HERO_SCALE  // 75
    const HERO_FIXED_Y = BOTTOM_PLATFORM_TOP_Y - HERO_COLLISION_HEIGHT_SCALED / 2  // Hero center positioned so bottom touches bottom platform top
    
    const heroInst = Hero.create({
      k,
      x: HERO_SPAWN_X_ON_PLATFORM,
      y: HERO_FIXED_Y,
      type: Hero.HEROES.HERO,
      controllable: true,
      sfx: sound,
      antiHero: antiHeroInst,
      onAnnihilation: () => {
        //
        // Transition after annihilation to menu
        //
        createLevelTransition(k, 'level-touch.3', () => {
          k.go('menu')
        })
      },
      currentLevel: 'level-touch.3'
    })
    //
    // Spawn hero and anti-hero
    //
    Hero.spawn(heroInst)
    Hero.spawn(antiHeroInst)
    //
    // Hero can run and jump on cloud platform (gravity enabled, collision with platform)
    //
    //
    // Create falling cloud blocks system with grid movement
    //
    const cloudBlocks = []
    const CLOUD_BLOCK_MOVE_DISTANCE = GRID_CELL_SIZE  // Move one grid cell at a time
    const CLOUD_BLOCK_SPAWN_INTERVAL = 2.0  // Spawn new block every 2 seconds
    const CLOUD_BLOCK_UPDATE_INTERVAL = 2.0  // Update position every 2 seconds (tetris-like jerky movement)
    const CLOUD_BLOCK_TAG = "cloud-block"  // Tag for cloud blocks
    const MAX_CLOUD_BLOCKS = 20  // Maximum number of blocks to spawn
    //
    // Fixed spawn positions for blocks (same order every time)
    // Each number represents grid column (0-11)
    //
    const FIXED_SPAWN_COLUMNS = [
      5, 6, 4, 7, 3, 8, 2, 9, 1, 10,
      0, 11, 5, 6, 4, 7, 3, 8, 2, 9
    ]
    let totalBlocksSpawned = 0  // Counter for total blocks spawned
    //
    // Grid bounds already calculated above (GRID_LEFT, GRID_WIDTH, GRID_RIGHT, etc.)
    //
    //
    // Calculate spawn positions on grid (below cloud platform)
    // Blocks should spawn one cell above first grid cell
    // Use same grid calculation as visualization: gridEndY = BOTTOM_PLATFORM_TOP_Y, gridStartY = gridEndY - (8 * GRID_CELL_SIZE)
    //
    const GRID_ROWS = 8  // Fixed number of grid rows
    const gridEndY = BOTTOM_PLATFORM_TOP_Y  // Bottom edge of last cell = platform top
    const gridStartY = gridEndY - (GRID_ROWS * GRID_CELL_SIZE)  // Top edge of first cell (8 cells up)
    const SPAWN_Y = gridStartY - GRID_CELL_SIZE / 2  // Center of cell one row above first grid cell
    let cloudBlockSpawnTimer = 0
    let cloudBlockUpdateTimer = 0
    //
    // Grid visualization (for debugging)
    //
    const showGrid = true  // Set to false to hide grid
    //
    // Draw grid visualization (for debugging)
    //
    if (showGrid) {
      k.onDraw(() => {
        //
        // Calculate grid bounds to match block positions exactly
        // Grid starts from cloud platform top and extends downward
        // Use fixed screen width to ensure consistent grid positioning
        //
        // Calculate grid - should have exactly 8 cells vertically, ending at bottom platform
        // Last cell bottom edge should align with platform top
        // Calculate gridEndRow so that: gridEndRow * GRID_CELL_SIZE + GRID_CELL_SIZE = BOTTOM_PLATFORM_TOP_Y
        // So: gridEndRow = (BOTTOM_PLATFORM_TOP_Y - GRID_CELL_SIZE) / GRID_CELL_SIZE
        //
        const GRID_ROWS = 8  // Fixed number of grid rows
        //
        // Calculate grid - 8 cells vertically, starting from bottom platform top
        // Bottom edge of last cell should exactly align with platform top
        // Count 8 cells upward from bottom platform
        //
        const gridEndY = BOTTOM_PLATFORM_TOP_Y  // Bottom edge of last cell = platform top
        const gridStartY = gridEndY - (GRID_ROWS * GRID_CELL_SIZE)  // Top edge of first cell (8 cells up)
        //
        // Draw vertical grid lines at cell boundaries
        // Lines at: GRID_LEFT, GRID_LEFT + GRID_CELL_SIZE, GRID_LEFT + 2*GRID_CELL_SIZE, ...
        // Draw 13 lines total (12 cells + 1 right edge): from col 0 to GRID_COLUMNS (inclusive)
        // Lines go from top of first cell (gridStartY) to bottom of last cell (gridEndY)
        //
        for (let col = 0; col <= GRID_COLUMNS; col++) {
          const x = GRID_LEFT + col * GRID_CELL_SIZE
          //
          // Draw line from top of first cell to bottom of last cell
          //
          k.drawLine({
            p1: k.vec2(x, gridStartY),
            p2: k.vec2(x, gridEndY),
            width: 1,
            color: k.rgb(255, 255, 255),
            opacity: 0.2
          })
        }
        //
        // Draw horizontal grid lines at cell boundaries
        // For 8 cells, we need 9 lines: top of first cell + 8 boundaries between cells
        // Lines at: gridStartY, gridStartY + GRID_CELL_SIZE, ..., gridEndY
        //
        for (let row = 0; row <= GRID_ROWS; row++) {
          const y = gridStartY + row * GRID_CELL_SIZE
          //
          // Draw line from left to right edge of grid
          //
          k.drawLine({
            p1: k.vec2(GRID_LEFT, y),
            p2: k.vec2(GRID_RIGHT, y),
            width: 1,
            color: k.rgb(255, 255, 255),
            opacity: 0.2
          })
        }
      })
    }
    //
    // Create FPS counter
    //
    const fpsCounter = FpsCounter.create({ k })
    //
    // Update FPS counter, arrow glow effect, and cloud blocks
    //
    k.onUpdate(() => {
      FpsCounter.onUpdate(fpsCounter)
      //
      // Update arrow glow when hero is above them
      //
      arrowsInst.update(heroInst.character)
      //
      // Update cloud blocks spawn timer
      // Only spawn if we haven't reached the maximum number of blocks
      //
      if (totalBlocksSpawned < MAX_CLOUD_BLOCKS) {
        cloudBlockSpawnTimer += k.dt()
        if (cloudBlockSpawnTimer >= CLOUD_BLOCK_SPAWN_INTERVAL) {
          cloudBlockSpawnTimer = 0
          //
          // Spawn new cloud block on grid (below cloud platform)
          // Use fixed spawn column from predefined array
          //
          const gridColumn = FIXED_SPAWN_COLUMNS[totalBlocksSpawned]  // Get column from fixed array
          const spawnX = GRID_LEFT + gridColumn * GRID_CELL_SIZE + GRID_CELL_SIZE / 2  // Center of grid cell
          const cloudBlock = createCloudBlock(k, spawnX, SPAWN_Y, CLOUD_BLOCK_SIZE, CLOUD_BLOCK_TAG)
          //
          // Store grid position for block
          //
          cloudBlock.gridColumn = gridColumn
          cloudBlocks.push(cloudBlock)
          totalBlocksSpawned++  // Increment counter
        }
      }
      //
      // Update cloud blocks position (jerky movement every second)
      //
      cloudBlockUpdateTimer += k.dt()
      if (cloudBlockUpdateTimer >= CLOUD_BLOCK_UPDATE_INTERVAL) {
        cloudBlockUpdateTimer = 0
        //
        // Check if hero is above left or right arrow (use same logic as arrow glow)
        //
        const heroX = heroInst.character.pos.x
        const heroLeft = heroX - 15  // Half of hero collision width (HERO_COLLISION_WIDTH_SCALED / 2)
        const heroRight = heroX + 15
        //
        // Calculate arrow detection bounds (same as in createCloudPlatformArrows)
        //
        const ARROW_WIDTH_SCALED = 300 * 0.16  // arrowSpriteWidth * arrowScale
        const arrowHalfWidth = (ARROW_WIDTH_SCALED * 2) / 2 + 40  // Double width + 40px padding
        //
        // Check left arrow
        //
        const leftArrowLeft = arrowsInst.leftArrowX - arrowHalfWidth
        const leftArrowRight = arrowsInst.leftArrowX + arrowHalfWidth
        const isHeroAboveLeftArrow = heroLeft < leftArrowRight && heroRight > leftArrowLeft
        //
        // Check right arrow
        //
        const rightArrowLeft = arrowsInst.rightArrowX - arrowHalfWidth
        const rightArrowRight = arrowsInst.rightArrowX + arrowHalfWidth
        const isHeroAboveRightArrow = heroLeft < rightArrowRight && heroRight > rightArrowLeft
        //
        // Calculate grid constants once (used by all blocks)
        //
        const GRID_ROWS = 8  // Fixed number of grid rows
        const gridEndY = BOTTOM_PLATFORM_TOP_Y  // Bottom edge of last cell = platform top
        const gridStartY = gridEndY - (GRID_ROWS * GRID_CELL_SIZE)  // Top edge of first cell (8 cells up)
        const targetY = gridEndY - GRID_CELL_SIZE / 2  // Center of last cell (8th cell)
        const targetGridRow = GRID_ROWS - 1  // Last row index (0-based: 0 to 7)
        //
        // Helper function to get grid row from Y position
        //
        const getGridRow = (y) => {
          return Math.floor((y - gridStartY - GRID_CELL_SIZE / 2) / GRID_CELL_SIZE)
        }
        //
        // Helper function to get grid column from X position
        //
        const getGridColumn = (x) => {
          return Math.floor((x - GRID_LEFT - GRID_CELL_SIZE / 2) / GRID_CELL_SIZE)
        }
        //
        // Helper function to check if a cell is occupied by any block
        //
        const isCellOccupied = (column, row, excludeBlock) => {
          return cloudBlocks.some((otherBlock) => {
            if (!otherBlock.exists() || otherBlock === excludeBlock) return false
            const otherColumn = otherBlock.gridColumn !== undefined ? otherBlock.gridColumn : getGridColumn(otherBlock.pos.x)
            const otherRow = getGridRow(otherBlock.pos.y)
            return otherColumn === column && otherRow === row
          })
        }
        //
        // Sort blocks by Y position (bottom to top) so lower blocks are processed first
        // This ensures that when a block checks for blocks below, lower blocks are already positioned
        //
        const sortedBlocks = [...cloudBlocks].filter(b => b.exists()).sort((a, b) => b.pos.y - a.pos.y)
        //
        // Update each cloud block (grid-based tetris-like movement)
        // Process from bottom to top so lower blocks are positioned first
        //
        sortedBlocks.forEach((block) => {
          //
          // Always snap block to grid first (prevent drift from physics)
          //
          const currentGridColumn = block.gridColumn !== undefined ? block.gridColumn : getGridColumn(block.pos.x)
          const snappedX = GRID_LEFT + currentGridColumn * GRID_CELL_SIZE + GRID_CELL_SIZE / 2
          block.pos.x = snappedX
          block.gridColumn = currentGridColumn
          //
          // Get current grid position (snap to grid)
          // Calculate which row (0-7) the block is in based on gridStartY
          //
          const currentGridRow = getGridRow(block.pos.y)
          //
          // Check if block has reached bottom platform
          //
          const hasReachedBottom = currentGridRow >= targetGridRow
          //
          // Check if block is stopped (already on platform)
          //
          const isStopped = block.isStopped || false
          //
          // Check if block is on another block (using grid-based logic, not physics)
          // Block is on another block if there's any block in the same column one row below
          //
          let isOnAnotherBlock = false
          if (currentGridRow < targetGridRow && !isStopped) {
            //
            // Check if there's any block in the same column one row below
            //
            const rowBelow = currentGridRow + 1
            isOnAnotherBlock = isCellOccupied(currentGridColumn, rowBelow, block)
          }
          const isOnPlatform = hasReachedBottom || isOnAnotherBlock || isStopped
          //
          // Apply grid-based tetris-like movement
          //
          if (!isOnPlatform) {
              //
              // Move block down by one grid cell (one cell lower)
              //
              const newGridRow = currentGridRow + 1  // Move down by 1 cell
              //
              // Check if there's any block in the same column at newGridRow
              // Blocks cannot occupy the same cell - each cell can only have one block
              //
              const cellBelowOccupied = isCellOccupied(currentGridColumn, newGridRow, block)
              //
              // Don't move past platform - clamp to platform grid row
              // Blocks cannot go below targetGridRow (last cell)
              // Also don't move if there's any block at the new position (prevents stacking in same cell)
              //
              let finalY
              let finalGridRow
              if (newGridRow >= targetGridRow) {
                //
                // Block would go past or reach platform - stop at target position
                //
                finalGridRow = targetGridRow
                finalY = targetY
                block.isStopped = true  // Mark as stopped
              } else if (cellBelowOccupied) {
                //
                // There's a block at new position - stop at current row (one cell above)
                //
                finalGridRow = currentGridRow
                finalY = gridStartY + finalGridRow * GRID_CELL_SIZE + GRID_CELL_SIZE / 2
                block.isStopped = true  // Mark as stopped
              } else {
                finalGridRow = newGridRow
                finalY = gridStartY + finalGridRow * GRID_CELL_SIZE + GRID_CELL_SIZE / 2
              }
              //
              // Apply horizontal grid movement (one cell left or right)
              // Blocks move based on hero position above arrows
              //
              let newGridColumn = currentGridColumn
              if (isHeroAboveLeftArrow && currentGridColumn > 0) {
                //
                // Move left one grid cell
                //
                newGridColumn = currentGridColumn - 1
              } else if (isHeroAboveRightArrow && currentGridColumn < GRID_COLUMNS - 1) {
                //
                // Move right one grid cell
                //
                newGridColumn = currentGridColumn + 1
              }
              //
              // Update positions to grid cell centers (snap to grid)
              //
              block.pos.x = GRID_LEFT + newGridColumn * GRID_CELL_SIZE + GRID_CELL_SIZE / 2
              block.pos.y = finalY
              block.gridColumn = newGridColumn
              //
              // Reset velocity to prevent physics from interfering
              //
              block.vel.y = 0
              block.vel.x = 0
            } else {
              //
              // Block is on platform or another block - ensure it stays exactly on grid
              //
              if (isOnAnotherBlock) {
                //
                // Block is on another block - snap to grid row above current
                //
                const snappedRow = currentGridRow
                block.pos.y = gridStartY + snappedRow * GRID_CELL_SIZE + GRID_CELL_SIZE / 2
                block.isStopped = true  // Mark as stopped when on another block
              } else {
                //
                // Block is on bottom platform - use target position
                //
                block.pos.y = targetY
                block.isStopped = true
              }
              //
              // Snap X position to grid (force exact position)
              //
              const snappedColumn = block.gridColumn !== undefined ? block.gridColumn : Math.floor((block.pos.x - GRID_LEFT) / GRID_CELL_SIZE)
              block.pos.x = GRID_LEFT + snappedColumn * GRID_CELL_SIZE + GRID_CELL_SIZE / 2
              block.gridColumn = snappedColumn
              //
              // Stop all movement and make block static to prevent physics interactions
              //
              block.vel.y = 0
              block.vel.x = 0
              //
              // Make block static to prevent any physics interactions with other blocks
              // Use unuse/use to replace dynamic body with static body
              //
              if (!block._isStatic) {
                block.unuse("body")
                block.use(k.body({ isStatic: true }))
                block._isStatic = true
              }
          }
          //
          // Always enforce grid position (prevent any physics drift)
          // Snap Y position to grid to ensure blocks are always in cells, not between them
          // Blocks cannot go below targetGridRow (last cell)
          // For stopped blocks, force static body and exact position
          // Also ensure blocks don't occupy the same cell (move up if cell is occupied)
          //
          const enforcedColumn = block.gridColumn !== undefined ? block.gridColumn : getGridColumn(block.pos.x)
          let enforcedRow = getGridRow(block.pos.y)
          //
          // Clamp enforced row to targetGridRow (cannot go below last cell)
          //
          if (enforcedRow > targetGridRow) {
            enforcedRow = targetGridRow
          }
          //
          // Check if there's another block in the same cell and move up if needed
          // Blocks cannot occupy the same cell - each cell can only have one block
          // Keep moving up until we find an empty cell
          //
          while (isCellOccupied(enforcedColumn, enforcedRow, block) && enforcedRow > 0) {
            enforcedRow = enforcedRow - 1
            if (!block.isStopped) {
              block.isStopped = true  // Mark as stopped if we had to move up
            }
          }
          const enforcedX = GRID_LEFT + enforcedColumn * GRID_CELL_SIZE + GRID_CELL_SIZE / 2
          const enforcedY = gridStartY + enforcedRow * GRID_CELL_SIZE + GRID_CELL_SIZE / 2
          //
          // For stopped blocks, force exact position and make static
          //
          if (block.isStopped) {
            block.pos.x = enforcedX
            block.pos.y = enforcedY
            block.vel.y = 0
            block.vel.x = 0
            //
            // Make block static to prevent any physics interactions
            //
            if (!block._isStatic) {
              block.unuse("body")
              block.use(k.body({ isStatic: true }))
              block._isStatic = true
            }
          } else {
            block.pos.x = enforcedX
            block.pos.y = enforcedY
          }
          block.gridColumn = enforcedColumn
        })
        //
        // Remove blocks that are below screen
        //
        for (let i = cloudBlocks.length - 1; i >= 0; i--) {
          if (!cloudBlocks[i].exists() || cloudBlocks[i].pos.y > k.height() + 100) {
            cloudBlocks.splice(i, 1)
          }
        }
      }
    })
    //
    // ESC key to return to menu
    //
    k.onKeyPress("escape", () => {
      k.go("menu")
    })
  })
}

/**
 * Creates a static cloud platform (hero can stand on it)
 * Uses same cloud layer style as level 2 (dense layer of clouds)
 * @param {Object} k - Kaplay instance
 * @param {number} x - X position (center)
 * @param {number} y - Y position (center)
 * @param {number} width - Platform width
 * @param {number} height - Platform height
 */
function createStaticCloudPlatform(k, x, y, width, height) {
  //
  // Cloud parameters (same style as level 2)
  //
  const baseCloudColor = k.rgb(100, 100, 120)  // Gray-blue color for clouds
  const cloudStartX = x - width / 2 + 50  // Start a bit inside left edge
  const cloudEndX = x + width / 2 - 50  // End a bit before right edge
  const cloudCoverageWidth = cloudEndX - cloudStartX
  const cloudCenterY = y
  //
  // Create dense layer of clouds (like level 2)
  //
  const denseCloudCount = Math.max(12, Math.floor(cloudCoverageWidth / 40))  // Adjust count based on width
  const denseCloudSpacing = cloudCoverageWidth / (denseCloudCount - 1)
  //
  // Cloud types (same as level 2)
  //
  const cloudTypes = [
    //
    // Type 1: Large wide cloud (6 puffs)
    //
    {
      mainSize: 50,
      puffs: [
        { radius: 0.7, offsetX: -0.8, offsetY: -0.05 },
        { radius: 0.75, offsetX: -0.4, offsetY: -0.1 },
        { radius: 0.65, offsetX: 0.4, offsetY: -0.1 },
        { radius: 0.7, offsetX: 0.8, offsetY: -0.05 },
        { radius: 0.6, offsetX: -0.2, offsetY: 0.15 },
        { radius: 0.6, offsetX: 0.2, offsetY: 0.15 }
      ],
      color: baseCloudColor,
      opacity: 0.6
    },
    //
    // Type 2: Medium wide cloud (5 puffs)
    //
    {
      mainSize: 42,
      puffs: [
        { radius: 0.8, offsetX: -0.7, offsetY: 0 },
        { radius: 0.85, offsetX: -0.3, offsetY: -0.08 },
        { radius: 0.75, offsetX: 0.3, offsetY: -0.08 },
        { radius: 0.8, offsetX: 0.7, offsetY: 0 },
        { radius: 0.7, offsetX: 0, offsetY: 0.12 }
      ],
      color: k.rgb(95, 95, 115),
      opacity: 0.55
    },
    //
    // Type 3: Small wide cloud (4 puffs)
    //
    {
      mainSize: 35,
      puffs: [
        { radius: 0.75, offsetX: -0.6, offsetY: 0 },
        { radius: 0.8, offsetX: -0.2, offsetY: -0.08 },
        { radius: 0.8, offsetX: 0.2, offsetY: -0.08 },
        { radius: 0.75, offsetX: 0.6, offsetY: 0 }
      ],
      color: k.rgb(105, 105, 125),
      opacity: 0.5
    },
    //
    // Type 4: Very wide cloud (7 puffs)
    //
    {
      mainSize: 55,
      puffs: [
        { radius: 0.65, offsetX: -1.0, offsetY: 0 },
        { radius: 0.7, offsetX: -0.6, offsetY: -0.1 },
        { radius: 0.75, offsetX: -0.2, offsetY: -0.12 },
        { radius: 0.75, offsetX: 0.2, offsetY: -0.12 },
        { radius: 0.7, offsetX: 0.6, offsetY: -0.1 },
        { radius: 0.65, offsetX: 1.0, offsetY: 0 },
        { radius: 0.6, offsetX: 0, offsetY: 0.15 }
      ],
      color: baseCloudColor,
      opacity: 0.65
    }
  ]
  //
  // Generate cloud configurations
  //
  const cloudConfigs = []
  //
  // Create dense layer of clouds
  //
  for (let i = 0; i < denseCloudCount; i++) {
    const baseX = cloudStartX + denseCloudSpacing * i
    //
    // Overlap clouds to ensure no gaps
    //
    const randomOffset = (Math.random() - 0.5) * (denseCloudSpacing * 0.6)
    const cloudX = baseX + randomOffset
    //
    // Random vertical offset within platform height
    //
    const randomYOffset = (Math.random() - 0.5) * (height * 0.4)
    const cloudY = cloudCenterY + randomYOffset
    //
    // Randomly select cloud type
    //
    const cloudType = cloudTypes[Math.floor(Math.random() * cloudTypes.length)]
    //
    // Add cloud configuration
    //
    cloudConfigs.push({
      x: cloudX,
      y: cloudY,
      mainSize: cloudType.mainSize,
      puffs: cloudType.puffs,
      color: cloudType.color,
      opacity: cloudType.opacity
    })
  }
  //
  // Create visual cloud layer
  //
  cloudConfigs.forEach((cloudConfig) => {
    k.add([
      k.pos(cloudConfig.x, cloudConfig.y),
      k.z(CFG.visual.zIndex.platforms - 1),
      {
        draw() {
          //
          // Draw cloud as overlapping circles (puffy cloud shape)
          //
          const mainSize = cloudConfig.mainSize
          //
          // Main cloud body (largest circle in center)
          //
          k.drawCircle({
            radius: mainSize,
            pos: k.vec2(0, 0),
            color: cloudConfig.color,
            opacity: cloudConfig.opacity
          })
          //
          // Draw all puffs for this cloud
          //
          cloudConfig.puffs.forEach((puff) => {
            k.drawCircle({
              radius: mainSize * puff.radius,
              pos: k.vec2(puff.offsetX * mainSize, puff.offsetY * mainSize),
              color: cloudConfig.color,
              opacity: cloudConfig.opacity
            })
          })
        }
      }
    ])
  })
}

/**
 * Creates left and right arrows in center of cloud platform
 * Uses arrow.png image (right arrow, left arrow is horizontally flipped)
 * Returns arrow objects for glow effect when hero is above them
 * @param {Object} k - Kaplay instance
 * @param {number} x - X position (center)
 * @param {number} y - Y position (center)
 * @returns {Object} Object with leftArrow, rightArrow, and update function
 */
function createCloudPlatformArrows(k, x, y) {
  //
  // Arrow spacing
  //
  const arrowSpacing = 250  // Space between arrows (reduced to bring arrows closer)
  const arrowScale = 0.16  // Scale for arrows (same as center arrow)
  const GLOW_OPACITY = 1.0  // Opacity when glowing
  const NORMAL_OPACITY = 0.5  // Normal opacity
  //
  // Hero collision box dimensions (from hero.js constants)
  //
  const HERO_COLLISION_WIDTH = 10  // Base collision width
  const HERO_COLLISION_HEIGHT = 25  // Base collision height
  const HERO_SCALE = 3  // Hero scale multiplier
  const HERO_COLLISION_WIDTH_SCALED = HERO_COLLISION_WIDTH * HERO_SCALE  // 30 pixels
  const HERO_COLLISION_HEIGHT_SCALED = HERO_COLLISION_HEIGHT * HERO_SCALE  // 75 pixels
  //
  // Arrow sprite dimensions (approximate, will get actual size from sprite)
  //
  const arrowSpriteId = 'center-arrow-level3'
  //
  // Load sprite from file (will be cached if already loaded)
  //
  k.loadSprite(arrowSpriteId, '/arrow.png')
  //
  // Get arrow sprite dimensions
  // Use larger default to ensure detection works - arrow.png is likely around 200-400px wide
  //
  let arrowSpriteWidth = 300  // Default fallback (larger to ensure detection)
  let arrowSpriteHeight = 300  // Default fallback
  try {
    const arrowSprite = k.getSprite(arrowSpriteId)
    if (arrowSprite) {
      //
      // Try different ways to get sprite dimensions
      //
      if (arrowSprite.width && arrowSprite.height) {
        arrowSpriteWidth = arrowSprite.width
        arrowSpriteHeight = arrowSprite.height
      } else if (arrowSprite.tex && arrowSprite.tex.width && arrowSprite.tex.height) {
        arrowSpriteWidth = arrowSprite.tex.width
        arrowSpriteHeight = arrowSprite.tex.height
      } else if (arrowSprite.frame && arrowSprite.frame.width && arrowSprite.frame.height) {
        arrowSpriteWidth = arrowSprite.frame.width
        arrowSpriteHeight = arrowSprite.frame.height
      }
    }
  } catch (e) {
    // Use default dimensions if sprite not available
  }
  //
  // Scaled arrow dimensions (scale reduces size, so multiply by scale)
  // Use absolute value for width since left arrow has negative X scale
  // arrowScale = 0.16, so if sprite is 300px, scaled width = 48px
  //
  const ARROW_WIDTH_SCALED = Math.abs(arrowSpriteWidth * arrowScale)
  const ARROW_HEIGHT_SCALED = arrowSpriteHeight * arrowScale
  //
  // Left arrow position
  //
  const leftArrowX = x - arrowSpacing / 2
  //
  // Right arrow position
  //
  const rightArrowX = x + arrowSpacing / 2
  //
  // Create right arrow (pointing right) - original image
  //
  const rightArrow = k.add([
    k.sprite(arrowSpriteId),
    k.pos(rightArrowX, y),
    k.anchor("center"),
    k.scale(arrowScale),
    k.z(CFG.visual.zIndex.platforms),  // Above clouds
  ])
  rightArrow.opacity = NORMAL_OPACITY
  //
  // Create left arrow (pointing left) - horizontally flipped using negative X scale
  //
  const leftArrow = k.add([
    k.sprite(arrowSpriteId),
    k.pos(leftArrowX, y),
    k.anchor("center"),
    k.scale(-arrowScale, arrowScale),  // Negative X scale flips horizontally
    k.z(CFG.visual.zIndex.platforms),  // Above clouds
  ])
  leftArrow.opacity = NORMAL_OPACITY
  //
  // Store constants for use in update function
  //
  const arrowWidthScaled = ARROW_WIDTH_SCALED
  const glowOpacity = GLOW_OPACITY
  const normalOpacity = NORMAL_OPACITY
  const heroCollisionWidthScaled = HERO_COLLISION_WIDTH_SCALED
  //
  // Return arrow objects and update function
  //
  return {
    leftArrow,
    rightArrow,
    leftArrowX,
    rightArrowX,
    y,
    arrowScale,
    update(heroCharacter) {
      //
      // Check if hero collision box intersects with arrow collision boxes
      //
      if (!heroCharacter || !heroCharacter.pos) {
        //
        // Hero not available - set normal opacity
        //
        rightArrow.opacity = normalOpacity
        leftArrow.opacity = normalOpacity
        return
      }
      //
      // Get hero X position
      //
      const heroX = heroCharacter.pos.x
      //
      // Calculate collision box bounds
      // Hero collision box: centered at heroX, width = HERO_COLLISION_WIDTH_SCALED
      //
      const heroLeft = heroX - heroCollisionWidthScaled / 2
      const heroRight = heroX + heroCollisionWidthScaled / 2
      //
      // Get arrow width - use stored scaled width (calculated from sprite dimensions)
      // Increase detection width by 2x + 40px on each side for easier detection
      //
      const arrowHalfWidth = (arrowWidthScaled * 2) / 2 + 40  // Double the width + 40px on each side
      //
      // Arrow collision box bounds (scaled, doubled + 50px padding for detection)
      // Right arrow: centered at rightArrowX, width = ARROW_WIDTH_SCALED * 2 + 100px
      //
      const rightArrowLeft = rightArrowX - arrowHalfWidth
      const rightArrowRight = rightArrowX + arrowHalfWidth
      //
      // Check if hero collision box overlaps arrow collision box horizontally
      // Overlap occurs when: heroLeft < arrowRight AND heroRight > arrowLeft
      // This checks if the two boxes intersect horizontally
      //
      const isAboveRightArrow = heroLeft < rightArrowRight && heroRight > rightArrowLeft
      //
      // Update right arrow glow instantly
      //
      rightArrow.opacity = isAboveRightArrow ? glowOpacity : normalOpacity
      //
      // Left arrow: centered at leftArrowX, width = ARROW_WIDTH_SCALED * 2 (absolute value)
      //
      const leftArrowLeft = leftArrowX - arrowHalfWidth
      const leftArrowRight = leftArrowX + arrowHalfWidth
      //
      // Check if hero collision box overlaps arrow collision box horizontally
      // Same logic as right arrow
      //
      const isAboveLeftArrow = heroLeft < leftArrowRight && heroRight > leftArrowLeft
      //
      // Update left arrow glow instantly
      //
      leftArrow.opacity = isAboveLeftArrow ? glowOpacity : normalOpacity
    }
  }
}

/**
 * Creates arrow sprite from arrow.png image in center of screen
 * @param {Object} k - Kaplay instance
 */
function createCenterArrow(k) {
  const centerX = k.width() / 2
  const centerY = k.height() / 2
  //
  // Load arrow sprite from image file
  //
  const arrowSpriteId = 'center-arrow-level3'
  //
  // Load sprite from file (will be cached if already loaded)
  //
  k.loadSprite(arrowSpriteId, '/arrow.png')
  //
  // Create arrow sprite object in center of screen
  //
  k.add([
    k.sprite(arrowSpriteId),
    k.pos(centerX, centerY),
    k.anchor("center"),
    k.scale(0.16),  // Scale down to 16% of original size (reduced by 20%)
    k.z(CFG.visual.zIndex.player + 1),  // Above hero
  ])
}

/**
 * Creates a falling cloud block with physics (can stack and be jumped on)
 * @param {Object} k - Kaplay instance
 * @param {number} x - X position
 * @param {number} y - Y position
 * @param {number} size - Block size
 * @param {string} tag - Tag for cloud blocks
 * @returns {Object} Cloud block game object
 */
function createCloudBlock(k, x, y, size, tag) {
  //
  // Cloud block visual style - square block with cloud puffs inside
  // Similar to original cloud blocks with better edge alignment
  //
  const shades = [
    k.rgb(90, 90, 110),
    k.rgb(92, 92, 112),
    k.rgb(95, 95, 115),
    k.rgb(98, 98, 118),
    k.rgb(100, 100, 120),
    k.rgb(102, 102, 122),
    k.rgb(105, 105, 125),
    k.rgb(108, 108, 128),
    k.rgb(110, 110, 130),
    k.rgb(112, 112, 132),
    k.rgb(115, 115, 135),
    k.rgb(118, 118, 138)
  ]
  //
  // Pre-generate stable puff configuration (fixed at creation time)
  // COMMENTED OUT: Cloud puffs disabled - using simple squares instead
  //
  // const halfSize = size / 2
  // const puffRadiusMin = size * 0.25
  // const puffRadiusMax = size * 0.35
  //
  // Calculate collision box size to match grid cell size exactly
  // Collision box must be exactly equal to size (GRID_CELL_SIZE) to match grid cells
  // Position offset remains the same (size * 0.6) to match visual cloud
  //
  const collisionBoxSize = size  // Exact grid cell size
  //
  // Define base puff positions to fill square area better (more square-like)
  // COMMENTED OUT: Cloud puffs disabled
  //
  // const basePuffs = [
  //   { x: -halfSize * 0.5, y: -halfSize * 0.5, radius: 0.85 },
  //   { x: 0, y: -halfSize * 0.5, radius: 0.9 },
  //   { x: halfSize * 0.5, y: -halfSize * 0.5, radius: 0.85 },
  //   { x: -halfSize * 0.5, y: 0, radius: 0.9 },
  //   { x: 0, y: 0, radius: 1.0 },
  //   { x: halfSize * 0.5, y: 0, radius: 0.9 },
  //   { x: -halfSize * 0.5, y: halfSize * 0.5, radius: 0.85 },
  //   { x: 0, y: halfSize * 0.5, radius: 0.9 },
  //   { x: halfSize * 0.5, y: halfSize * 0.5, radius: 0.85 }
  // ]
  //
  // Generate fixed puff configuration (stable, doesn't change each frame)
  // COMMENTED OUT: Cloud puffs disabled
  //
  // const puffs = basePuffs.map((puff) => {
  //   const radius = puffRadiusMin + (puffRadiusMax - puffRadiusMin) * puff.radius
  //   const shadeIndex = Math.floor(Math.random() * shades.length)
  //   const opacity = 0.7 + Math.random() * 0.2
  //   
  //   return {
  //     x: puff.x,
  //     y: puff.y,
  //     radius: radius,
  //     color: shades[shadeIndex],
  //     opacity: opacity
  //   }
  // })
  //
  // Generate base color for square background
  //
  const baseColorIndex = Math.floor(Math.random() * shades.length)
  const baseColor = shades[baseColorIndex]
  const baseOpacity = 0.6 + Math.random() * 0.2
  //
  // Create cloud block visual with physics
  //
  const cloudBlock = k.add([
    k.pos(x, y),
    k.anchor("center"),
    k.area({
      shape: new k.Rect(
        k.vec2(-collisionBoxSize / 2 + size / 2, -collisionBoxSize / 2 + size / 2),  // Shift right and down by half square side
        collisionBoxSize,  // Exact grid cell width
        collisionBoxSize   // Exact grid cell height
      ),
      ignore: ["cloud-platform", tag]  // Ignore collision with cloud platform and other cloud blocks (use grid logic instead)
    }),
    k.body({
      mass: 1.0,
      isStatic: false,
      gravityScale: 0  // Disable gravity - blocks fall in discrete steps like tetris
    }),
    k.z(CFG.visual.zIndex.platforms - 1),  // Below platforms
    CFG.game.platformName,  // Allow hero to stand on blocks
    tag,  // Tag for cloud blocks
    //
    // Store initial state
    //
    {
      isStopped: false  // Flag to track if block has stopped on platform
    },
    {
      draw() {
        //
        // Draw square background (simple square block)
        //
        k.drawRect({
          width: size,
          height: size,
          pos: k.vec2(0, 0),
          anchor: "center",
          color: baseColor,
          opacity: baseOpacity
        })
        //
        // Draw all puffs with fixed configuration (stable shape)
        // COMMENTED OUT: Cloud puffs disabled - using simple squares instead
        //
        // puffs.forEach((puff) => {
        //   k.drawCircle({
        //     radius: puff.radius,
        //     pos: k.vec2(puff.x, puff.y),
        //     color: puff.color,
        //     opacity: puff.opacity
        //   })
        // })
      }
    }
  ])
  
  return cloudBlock
}
