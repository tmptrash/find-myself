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
    // Cloud platform lowered significantly - hero will be fixed at this level
    //
    const CLOUD_PLATFORM_Y = TOP_MARGIN + 40 + TOUCH_FONT_SIZE + 150  // Lowered significantly
    const CLOUD_PLATFORM_WIDTH = CFG.visual.screen.width - LEFT_MARGIN - RIGHT_MARGIN
    const CLOUD_PLATFORM_HEIGHT = 30
    const CLOUD_PLATFORM_X = LEFT_MARGIN + CLOUD_PLATFORM_WIDTH / 2
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
    // Create arrows (left and right) in center of cloud platform, above clouds
    //
    const arrowsInst = createCloudPlatformArrows(k, CLOUD_PLATFORM_X, CLOUD_PLATFORM_Y)
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
    // Store bottomPlatformTopY for use in createCloudBlock
    //
    const bottomPlatformTopY = BOTTOM_PLATFORM_TOP_Y
    //
    // Create anti-hero on bottom platform
    //
    const ANTIHERO_COLLISION_HEIGHT = 25
    const ANTIHERO_SCALE = 3
    const ANTIHERO_COLLISION_HEIGHT_SCALED = ANTIHERO_COLLISION_HEIGHT * ANTIHERO_SCALE  // 75
    const ANTIHERO_Y_ON_BOTTOM_PLATFORM = BOTTOM_PLATFORM_TOP_Y - ANTIHERO_COLLISION_HEIGHT_SCALED / 2  // Anti-hero center positioned so bottom touches bottom platform top
    
    const antiHeroInst = Hero.create({
      k,
      x: ANTIHERO_SPAWN_X,
      y: ANTIHERO_Y_ON_BOTTOM_PLATFORM,
      type: Hero.HEROES.ANTIHERO,
      controllable: false,
      sfx: sound,
      antiHero: null,
      addArms: true
    })
    //
    // Create hero with anti-hero reference for annihilation
    // Position hero on cloud platform level (fixed Y position)
    //
    const HERO_COLLISION_HEIGHT = 25
    const HERO_SCALE = 3
    const HERO_COLLISION_HEIGHT_SCALED = HERO_COLLISION_HEIGHT * HERO_SCALE  // 75
    const HERO_SPAWN_X_ON_PLATFORM = k.width() / 2
    const HERO_FIXED_Y = CLOUD_PLATFORM_TOP_Y - HERO_COLLISION_HEIGHT_SCALED / 2  // Hero center positioned so bottom touches cloud platform top
    
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
    const CLOUD_BLOCK_SIZE = 75
    const GRID_CELL_SIZE = CLOUD_BLOCK_SIZE  // Grid cell size equals block size
    const CLOUD_BLOCK_MOVE_DISTANCE = GRID_CELL_SIZE  // Move one grid cell at a time
    const CLOUD_BLOCK_SPAWN_INTERVAL = 2.0  // Spawn new block every 2 seconds
    const CLOUD_BLOCK_UPDATE_INTERVAL = 2.0  // Update position every 2 seconds (tetris-like jerky movement)
    const CLOUD_BLOCK_TAG = "cloud-block"  // Tag for cloud blocks
    //
    // Calculate grid bounds (centered grid with 12 cells width)
    // Grid starts from cloud platform and extends downward
    //
    const GRID_COLUMNS = 12  // Fixed number of grid columns
    const GRID_WIDTH = GRID_COLUMNS * GRID_CELL_SIZE  // Total grid width
    const GRID_LEFT = (CFG.visual.screen.width - GRID_WIDTH) / 2  // Center grid horizontally
    const GRID_RIGHT = GRID_LEFT + GRID_WIDTH  // Right edge of grid
    //
    // Calculate spawn positions on grid (below cloud platform)
    // Snap spawn Y to grid
    //
    const spawnYRaw = CLOUD_PLATFORM_TOP_Y + CLOUD_PLATFORM_HEIGHT / 2 + CLOUD_BLOCK_SIZE / 2 + 5
    const spawnGridRow = Math.floor(spawnYRaw / GRID_CELL_SIZE)
    const SPAWN_Y = spawnGridRow * GRID_CELL_SIZE + CLOUD_BLOCK_SIZE / 2  // Center of grid cell
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
        // If gridEndRow is the last row, then: gridEndRow * GRID_CELL_SIZE + GRID_CELL_SIZE = BOTTOM_PLATFORM_TOP_Y
        // So: gridEndRow = (BOTTOM_PLATFORM_TOP_Y - GRID_CELL_SIZE) / GRID_CELL_SIZE
        //
        const GRID_ROWS = 8  // Fixed number of grid rows
        //
        // Calculate grid end row so that last cell bottom edge aligns with platform top
        // gridEndRow * GRID_CELL_SIZE + GRID_CELL_SIZE = BOTTOM_PLATFORM_TOP_Y
        // gridEndRow = (BOTTOM_PLATFORM_TOP_Y - GRID_CELL_SIZE) / GRID_CELL_SIZE
        //
        const gridEndRow = Math.floor((BOTTOM_PLATFORM_TOP_Y - GRID_CELL_SIZE) / GRID_CELL_SIZE)
        const gridEndY = gridEndRow * GRID_CELL_SIZE + GRID_CELL_SIZE  // Bottom edge of last cell (platform top)
        //
        // Calculate grid start row - 8 cells total, ending at platform
        // Start from end row and go up 7 rows (8 cells total: rows gridEndRow-7 to gridEndRow)
        // gridStartRow = gridEndRow - 7 (for 8 cells: 0,1,2,3,4,5,6,7 relative to gridEndRow-7)
        //
        const gridStartRow = gridEndRow - GRID_ROWS + 1  // First row (8 cells: gridEndRow-7 to gridEndRow)
        const gridStartY = gridStartRow * GRID_CELL_SIZE  // Top edge of first cell
        //
        // Draw vertical grid lines at cell boundaries
        // Lines at: GRID_LEFT, GRID_LEFT + GRID_CELL_SIZE, GRID_LEFT + 2*GRID_CELL_SIZE, ...
        // Draw one extra line to show last cell boundary
        // Use fixed GRID_LEFT and GRID_RIGHT values (computed once at scene init)
        //
        for (let col = 0; col <= GRID_COLUMNS; col++) {
          const x = GRID_LEFT + col * GRID_CELL_SIZE
          //
          // Draw line even if it's outside current viewport to ensure it's always visible
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
        // Lines at: gridRow * GRID_CELL_SIZE (top edge of each cell)
        // Use fixed GRID_LEFT and GRID_RIGHT values (computed once at scene init)
        //
        for (let row = gridStartRow; row <= gridEndRow; row++) {
          const y = row * GRID_CELL_SIZE
          //
          // Draw line even if it's outside current viewport to ensure it's always visible
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
      //
      cloudBlockSpawnTimer += k.dt()
      if (cloudBlockSpawnTimer >= CLOUD_BLOCK_SPAWN_INTERVAL) {
        cloudBlockSpawnTimer = 0
        //
        // Spawn new cloud block on grid (below cloud platform)
        // Choose random grid column
        //
        const gridColumn = Math.floor(Math.random() * GRID_COLUMNS)
        const spawnX = GRID_LEFT + gridColumn * GRID_CELL_SIZE + GRID_CELL_SIZE / 2  // Center of grid cell
        const cloudBlock = createCloudBlock(k, spawnX, SPAWN_Y, CLOUD_BLOCK_SIZE, CLOUD_BLOCK_TAG)
        //
        // Store grid position for block
        //
        cloudBlock.gridColumn = gridColumn
        cloudBlocks.push(cloudBlock)
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
        // Update each cloud block (grid-based tetris-like movement)
        //
        cloudBlocks.forEach((block) => {
          if (block.exists()) {
            //
            // Always snap block to grid first (prevent drift from physics)
            //
            const currentGridColumn = block.gridColumn !== undefined ? block.gridColumn : Math.floor((block.pos.x - GRID_LEFT - GRID_CELL_SIZE / 2) / GRID_CELL_SIZE)
            const snappedX = GRID_LEFT + currentGridColumn * GRID_CELL_SIZE + GRID_CELL_SIZE / 2
            block.pos.x = snappedX
            block.gridColumn = currentGridColumn
            //
            // Calculate target Y position for bottom platform (snap to grid)
            // Last cell bottom edge aligns with platform top: gridEndRow * GRID_CELL_SIZE + GRID_CELL_SIZE = BOTTOM_PLATFORM_TOP_Y
            // Block center at last row: gridEndRow * GRID_CELL_SIZE + CLOUD_BLOCK_SIZE / 2
            //
            const GRID_ROWS = 8  // Fixed number of grid rows
            const gridEndRow = Math.floor((BOTTOM_PLATFORM_TOP_Y - GRID_CELL_SIZE) / GRID_CELL_SIZE)
            const targetGridRow = gridEndRow  // Last row (8th cell)
            const targetY = targetGridRow * GRID_CELL_SIZE + CLOUD_BLOCK_SIZE / 2
            //
            // Get current grid position (snap to grid)
            //
            const currentGridRow = Math.floor((block.pos.y - CLOUD_BLOCK_SIZE / 2) / GRID_CELL_SIZE)
            //
            // Check if block has reached bottom platform
            //
            const hasReachedBottom = currentGridRow >= targetGridRow
            //
            // Check if block is stopped (already on platform)
            //
            const isStopped = block.isStopped || false
            //
            // Check if block is on another block (using collision detection)
            // Block is on another block if it's grounded and not at target row
            //
            const isOnAnotherBlock = block.isGrounded() && currentGridRow < targetGridRow
            const isOnPlatform = hasReachedBottom || isOnAnotherBlock || isStopped
            //
            // Apply grid-based tetris-like movement
            //
            if (!isOnPlatform) {
              //
              // Move block down by one grid cell (one cell lower)
              //
              const newGridRow = currentGridRow + 2  // Move down by 2 cells (one cell lower)
              //
              // Don't move past platform - clamp to platform grid row
              // Blocks cannot go below targetGridRow (last cell)
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
              } else {
                finalGridRow = newGridRow
                finalY = finalGridRow * GRID_CELL_SIZE + CLOUD_BLOCK_SIZE / 2
              }
              //
              // Apply horizontal grid movement (one cell left or right)
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
                block.pos.y = snappedRow * GRID_CELL_SIZE + CLOUD_BLOCK_SIZE / 2
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
              // Stop all movement
              //
              block.vel.y = 0
              block.vel.x = 0
            }
            //
            // Always enforce grid position (prevent any physics drift)
            // Snap Y position to grid to ensure blocks are always in cells, not between them
            // Blocks cannot go below targetGridRow (last cell)
            //
            const enforcedColumn = block.gridColumn !== undefined ? block.gridColumn : Math.floor((block.pos.x - GRID_LEFT) / GRID_CELL_SIZE)
            let enforcedRow = Math.floor((block.pos.y - CLOUD_BLOCK_SIZE / 2) / GRID_CELL_SIZE)
            //
            // Clamp enforced row to targetGridRow (cannot go below last cell)
            //
            if (enforcedRow > targetGridRow) {
              enforcedRow = targetGridRow
            }
            block.pos.x = GRID_LEFT + enforcedColumn * GRID_CELL_SIZE + GRID_CELL_SIZE / 2
            block.pos.y = enforcedRow * GRID_CELL_SIZE + CLOUD_BLOCK_SIZE / 2
            block.gridColumn = enforcedColumn
          }
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
        rightArrow.opacity = NORMAL_OPACITY
        leftArrow.opacity = NORMAL_OPACITY
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
      const heroLeft = heroX - HERO_COLLISION_WIDTH_SCALED / 2
      const heroRight = heroX + HERO_COLLISION_WIDTH_SCALED / 2
      //
      // Get arrow width - use stored scaled width (calculated from sprite dimensions)
      // Increase detection width by 2x + 40px on each side for easier detection
      //
      const arrowHalfWidth = (ARROW_WIDTH_SCALED * 2) / 2 + 40  // Double the width + 40px on each side
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
      rightArrow.opacity = isAboveRightArrow ? GLOW_OPACITY : NORMAL_OPACITY
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
      leftArrow.opacity = isAboveLeftArrow ? GLOW_OPACITY : NORMAL_OPACITY
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
      ignore: ["cloud-platform"]  // Ignore collision with cloud platform
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
