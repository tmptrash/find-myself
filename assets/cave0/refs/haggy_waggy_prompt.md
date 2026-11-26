# Rootward — Huggy-Wuggy: Five-Tentacle Predator

Improve the existing Huggy-Wuggy implementation in **Rootward (Kaplay + JavaScript)**. Reuse the existing architecture, sprites, terrain, and collision systems. Remove contradictory logic.

## 1. Tentacle Anatomy and Animation

- Exactly **5 flexible, snake-like tentacles without joints, knees, or elbows**.
- Tentacles are thicker near the head and gradually taper toward their clawed fingers.
- Use lightweight continuous curves or splines instead of articulated IK.
- Free tentacles extend, curl, and actively probe nearby space.
- One or two tentacles can probe independently and must physically touch surfaces before gripping.
- Fingers close slightly when gripping and open when releasing.
- All movements must be smooth and continuous, without snapping or jitter.

## 2. Body Weight and Support Physics

The head has mass and must be physically supported by its tentacles.

**When hanging from a ceiling:**
- Anchored tentacles behave like tensioned ropes.
- Tentacles carrying significant weight become nearly straight, not decorative arcs.
- Weight is distributed among active supporting tentacles according to their positions and directions.
- The creature can hang from a single tentacle.
- Natural, damped body swinging is allowed.

**When standing on a platform:**
- Supporting tentacles should seek positions underneath the head's center of mass.
- They must provide plausible upward support.
- Tentacles may bend slightly under compressive load.
- The head must not appear to float with only ineffective lateral supports.

Use lightweight physical approximations rather than full soft-body simulation.

## 3. Terrain Collision and Climbing

- Support all surfaces of cave terrain and **floating platforms**: tops, undersides, sides, slopes, corners, and ledges.
- The creature must climb around platform edges and transfer between physically reachable surfaces.
- **Every solid platform, regardless of size, must act as a collision obstacle for the entire tentacle.**
- Tentacles must never pass through a platform, even if it is small, narrow, or located between the tentacle base and its target.
- A tentacle encountering a platform must either attach to a valid surface or bend and navigate around the obstacle.
- Check the full tentacle curve, including its thickness, against nearby collision geometry—not just the tip or anchor.
- Never allow a spline or intermediate tentacle segment to cut through solid terrain.
- If a valid collision-free path cannot be found, reject the movement or grip target instead of clipping through the platform.
- Claws align with the local surface normal.
- Fingers grip into or around terrain by their actual finger length, without penetrating farther.
- On water contact, the tentacle withdraws smoothly and the creature avoids that route.

## 4. Echolocation and Detection

- Ultrasound originates from the **tip of the upper jaw**.
- Waves propagate **only forward, within a configurable cone aligned with the head direction**, never omnidirectionally.
- Every pulse has a fixed maximum range. Without a collision, it disappears at that distance and never returns.
- Valid interactions with terrain or living creatures can generate returning echoes.
- Waves must be visually subtle, almost transparent, and inexpensive to render.
- The predator detects living creatures, **including the hero**, through valid ultrasound echoes or direct tentacle-tip contact.
- Detection must depend on real pulse intersections and returning echoes, not merely being inside an invisible detection radius.
- During eating, the creature stops emitting new ultrasound pulses.
- Never use omniscient target tracking.

### Immediate Attack Response

**When a valid ultrasonic echo identifies a moving living creature inside the ultrasound coverage, Huggy-Wuggy must immediately react and rush toward the detected position.**

- Switch from slow exploration to aggressive pursuit immediately after valid detection.
- Rapidly accelerate the body toward the detected direction.
- Increase tentacle reaching, gripping, pulling, and repositioning speed.
- Make the behavioral contrast between slow exploration and sudden pursuit visually dramatic.
- Preserve physical anchors, support forces, collision constraints, and maximum tentacle reach.
- Fast movement must remain continuous and smooth, without teleportation or snapping.
- Do not wait for the target to touch a tentacle if a valid ultrasound detection has already occurred.
- If the target is unreachable directly, begin alternative-route planning immediately.

## 5. Hunting and Navigation

- Default behavior: slow, cautious climbing and tactile probing.
- After detection: immediate, fast pursuit using the same physical tentacle system.
- Store the last detected target position and timestamp.
- If the target cannot be reached directly, use cached surface navigation and lightweight pathfinding, such as A*.
- The creature must backtrack, temporarily move away from prey, and climb around floating platforms when necessary.
- Never remain indefinitely stuck at the closest unreachable point.
- Update target coordinates only after new valid sensory detections.
- If prey is lost, investigate its last known location and then resume exploration.

## 6. Smooth Body Motion

- No sudden rotation, twitching, or rapid left-right flipping.
- Use stable orientation targets, angular damping, and interpolation.
- During turning, the head must retain its visible width and volume rather than collapsing into a vertical line.
- Body movement must result from tentacle support, pulling, and weight transfer.
- Sudden pursuit means rapid acceleration, **not discontinuous animation**.

## 7. Maximum Performance

**Stable FPS is critical, especially on mobile devices and at 120 Hz.**

- Cache terrain geometry, including small and floating platforms.
- Use spatial indexing and local collision queries.
- Apply lightweight, bounded calculations for tentacle curves, collision constraints, and load distribution.
- Avoid full soft-body physics and unnecessary rigid bodies.
- Validate tentacle curves using a small, bounded number of segments or equivalent efficient geometry tests.
- Run grip planning and pathfinding only when necessary.
- Use lower-frequency AI updates with smooth rendering interpolation.
- Reuse buffers and objects; avoid allocations in hot loops.
- Limit ultrasound pulses, raycasts, and reflections.
- Reduce unnecessary offscreen computation.
- Profile frame times and verify that performance remains stable.

## Implementation

Modify the existing code directly. Preserve the creature's artwork and existing gameplay systems.

Implement and test the changes, then report modified files, technical decisions, limitations, and performance measurements where available.

**Success criteria:** five smooth jointless tentacles; realistic weight support; no terrain penetration, including small platforms; forward-only ultrasound; immediate aggressive pursuit after valid detection; intelligent obstacle navigation; stable body rotation; minimal FPS impact.