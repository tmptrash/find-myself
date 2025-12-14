# Find Myself

A philosophical 2D platformer about self-discovery through life's challenges. Navigate through different aspects of existence while searching for your reflection.

## 🎮 About the Game

**Find Myself** is a minimalist platformer where you journey through abstract worlds representing different forces that shape who you are. Each world presents unique challenges and obstacles that mirror real struggles in life — from cutting words to the relentless passage of time.

Your goal is to find another "you" — a reflection shaped by the very forces you're learning to face. Reaching them means meeting yourself honestly and understanding yourself a little more.

Life will confuse you. You will fall. But each fall brings you closer to who you truly are.

## 🎨 Visual Style

- **Procedural Graphics**: All visuals are generated programmatically using geometric shapes and text
- **Minimalist Aesthetic**: Clean lines, limited color palettes per world
- **Pixel-Perfect Animation**: Custom sprite generation with frame-by-frame animation
- **Dynamic Effects**: Light glints, particle systems, connection effects

## 🔊 Audio Design

- **Procedural Sound**: All sound effects generated using Web Audio API
- **No Audio Files** (except background music): Footsteps, jumps, landings, and special effects are synthesized in real-time
- **Adaptive Soundscapes**: Each world has unique audio characteristics that match its theme and atmosphere

## 🎯 Core Mechanics

### Movement
- **Arrow Keys / WASD**: Move left and right
- **Space / W / Up Arrow**: Jump
- **Precise Controls**: Responsive movement with subtle running animation

### Dual Character System
- Control the **Hero** (light-colored character)
- Seek the **Anti-Hero** (dark reflection)
- Upon meeting, both characters annihilate in a particle explosion
- Meeting your reflection advances to the next challenge

### Death & Respawn
- Contact with hazards causes the hero to disintegrate into particles
- Instant respawn at the start of the level
- Learn from mistakes and try again

### Progress Tracking
- Game automatically saves your progress in browser localStorage
- Continue from where you left off
- Section completion is tracked

## 🛠 Technical Details

### Built With
- [Kaplay.js](https://kaplayjs.com/) - Game engine
- Vanilla JavaScript (ES6+)
- Web Audio API for procedural sound
- HTML5 Canvas for rendering

## 🚀 Development

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Setup
```sh
# Install dependencies
npm install

# Start development server
npm run dev
```

Development server will start at http://localhost:8000

### Building
```sh
# Build for production
npm run build

# Build and create zip package
npm run zip
```

Built files will be in the `dist/` folder.

## 🎮 Controls

| Action | Keys |
|--------|------|
| Move Left | Left Arrow, A |
| Move Right | Right Arrow, D |
| Jump | Space, W, Up Arrow |
| Navigate Menu | Arrow Keys |
| Select | Space, Enter |
| Skip Intro | Space, Enter |

## 📝 Design Philosophy

**Find Myself** is designed around several core principles:

1. **Minimalism**: Clean, focused design without unnecessary elements
2. **Procedural Generation**: Everything is created through code, ensuring consistency and small file size
3. **Meaningful Challenge**: Each obstacle represents a real-life concept
4. **Self-Discovery**: The journey is about understanding yourself through overcoming challenges
5. **Atmosphere Over Graphics**: Mood and feeling take priority over visual complexity

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

*Life is the one setting traps. It shifts the ground, twists logic, and pushes you into mistakes — not to harm you, but to teach you.*
