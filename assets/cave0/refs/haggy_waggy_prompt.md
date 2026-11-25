# Rootward — Refactor Five-Limbed Creature Locomotion: Smooth, Jointless, Physically Believable Climbing

## Context

We are developing **Rootward**, a 2D platformer built with **Kaplay + JavaScript**.

We already have an implementation of a blind, five-limbed cave predator that climbs walls, ceilings, ledges, and irregular terrain using its claws.

However, the current implementation has several serious visual and physical problems:

1. Its limbs look like articulated legs with elbows and knees.
2. Limb movements are sometimes jerky, with sudden changes in shape or position.
3. The body occasionally twitches or rapidly rotates left and right.
4. Limbs can incorrectly penetrate the solid terrain.
5. Claws do not always grip platform edges at the correct depth.

**Your task is to fix these problems in the existing implementation without unnecessarily rewriting the entire creature system.**

The highest priorities are:

1. Extremely smooth, natural movement.
2. Correct terrain contact and collision constraints.
3. Five flexible, jointless limbs.
4. Stable, physically believable body movement.
5. Maximum runtime performance and stable FPS.

The implementation must remain lightweight enough for desktop and mobile browsers, including 120 FPS rendering.

---

# 1. Fundamental Anatomical Change: No Joints

**The creature's five limbs must NOT behave like human arms, legs, or articulated mechanical chains.**

They have no visible elbows, knees, or rigid joints.

Instead, each limb is a continuous, elongated, muscular, flexible structure.

Think of a combination of:

- A snake's body.
- An octopus tentacle.
- A muscular, flexible climbing appendage.
- A probing biological structure that can bend continuously along its entire length.

Each limb must be capable of forming smooth organic curves, including:

- Broad C-shaped curves.
- Smooth S-shaped curves.
- Gentle spiraling or curling motions.
- Extended reaching poses.
- Smooth wrapping motions around reachable terrain edges.

**There must never be a visible sharp bend resembling an elbow or knee.**

A limb should bend continuously along its length rather than at one or two specific joint positions.

## Required technical changes

Inspect the current limb animation implementation.

If it uses two-bone IK or another articulated IK approach that produces visible knee-like bending, replace that approach for the creature's flexible limbs.

Use a lightweight continuous-curve model instead, such as:

- A spline-based limb centerline.
- A short chain of smoothly constrained control points.
- A lightweight tentacle-style solver.
- Another efficient solution that produces continuous curvature.

Choose the simplest approach that gives natural motion.

Do not introduce full soft-body physics or expensive physical simulations.

Use a limited number of control points and maintain bounded computation.

## Curvature requirements

Each limb must:

- Have a smooth continuous silhouette.
- Avoid sharp angular transitions.
- Maintain believable thickness along its length.
- Bend progressively rather than suddenly.
- Respect its maximum extended length.
- Avoid unrealistic stretching.
- Preserve smooth curvature while its base and claw tip move.
- Support both slow probing and fast pulling motions.

When a limb changes direction, its entire curve should adapt progressively.

It must never instantly change from one bent configuration to another.

---

# 2. Organic Limb Behavior

The five limbs must behave as independent but coordinated flexible appendages.

### Slow exploration

By default, the creature moves slowly.

Typically:

- Three or four limbs remain attached to the terrain.
- One limb reaches forward to locate a new grip.
- Occasionally another limb explores the surroundings.
- The body is pulled gradually between stable anchor configurations.
- The limbs curve naturally as the body advances.
- Reaching, gripping, pulling, and releasing happen smoothly.

A free limb should behave almost like a curious snake.

It extends into the surrounding space, bends, searches, touches a surface, and decides whether to grip.

### Probing movement

Probing should consist of smooth, continuous motion.

For example:

1. The limb slowly extends.
2. Its tip explores a small area.
3. The middle portion follows with a natural delay.
4. The tip approaches a nearby surface.
5. The claw aligns with the surface normal.
6. The claw attaches if the grip is valid.

The motion should resemble a flexible biological appendage sensing its environment.

Do not use random, rapid oscillations.

Do not create repetitive mechanical sweeping patterns.

### Fast pursuit

When the creature detects prey through sound, it should accelerate and move much faster.

However, **fast movement must still be smooth**.

During pursuit:

- Limbs reach faster.
- Anchors change more frequently.
- Muscular pulling becomes stronger.
- The body accelerates naturally.
- Free limbs follow smooth trajectories.
- The creature maintains physical support.

Speed should result from faster, coordinated limb movement, not from teleportation, snapping, or abrupt rotation.

Exploration and pursuit must use the same locomotion system with different parameters.

---

# 3. Eliminate All Limb Jitter

This is a critical requirement.

**Limbs must never twitch, snap, jump between targets, or abruptly change their curvature.**

Inspect the implementation for causes of instability, including:

- Grip targets being recalculated too frequently.
- Sudden replacement of control points.
- Discontinuous interpolation.
- Changes in IK solution branches.
- Conflicting updates between simulation and rendering.
- Repeated release and reattachment near the same grip.
- Unstable target selection.
- Large simulation steps.
- Excessive procedural randomness.

Fix the actual causes rather than merely adding visual smoothing over incorrect behavior.

## Requirements

- Keep anchored claw positions stable in world coordinates.
- Keep reaching targets stable until a legitimate reason to change them.
- Use continuous trajectories between positions.
- Smoothly interpolate limb curve changes.
- Limit angular and positional velocity where appropriate.
- Limit acceleration and sudden changes in curvature.
- Apply damping to secondary motion.
- Use stable fixed-timestep simulation where appropriate.
- Interpolate rendering states at high frame rates.
- Prevent rapid switching between nearly equivalent grip targets.

Use hysteresis and minimum hold durations where needed.

Do not add noisy random motion to make the limbs appear alive.

**Organic movement should come from meaningful reaching, pulling, relaxing, and probing — not jitter.**

---

# 4. Stabilize Body Rotation and Orientation

The current implementation sometimes causes the body to twitch by rapidly alternating its rotation or facing direction.

This must be eliminated completely.

## Body orientation rules

- The body must rotate continuously and smoothly.
- It must not instantly flip between left-facing and right-facing states.
- Small changes in movement direction must not trigger sprite flipping.
- Small changes in terrain normals must not cause large rotational corrections.
- Temporary differences between limb targets must not reverse body orientation.
- The body should maintain a stable orientation relative to the current climbing route and supporting surfaces.

Use a persistent orientation state.

Calculate the desired orientation from a stable locomotion reference, such as the planned surface-route tangent and the supporting terrain geometry.

Do not independently recalculate facing direction from instantaneous velocity every frame.

## Smooth rotation

Implement:

- Angle unwrapping or shortest-angle interpolation where appropriate.
- A damped angular response.
- A maximum angular velocity.
- A maximum angular acceleration if needed.
- Orientation hysteresis.
- A minimum stable duration before intentional facing reversal.

A 180-degree direction reversal must be a deliberate locomotion transition, not an instantaneous visual flip.

If the creature changes direction, it should:

1. Slow down.
2. Adjust its supporting limbs.
3. Gradually rotate or reorient its body.
4. Start moving in the new direction.

For normal climbing around corners, rotate the body gradually while maintaining valid grips.

**The body must never shake left and right while the creature is trying to move in one direction.**

---

# 5. Strict Terrain Collision Constraints for Every Limb

This is another critical requirement.

**Flexible limbs must never pass through solid terrain.**

The creature must respect the actual collision boundary of each platform.

The boundary is defined by the existing terrain collision geometry, not by decorative visual textures.

## Climbing on the top of a platform

When the creature moves along the upper surface of a platform:

- All flexible limb sections must remain in the free space above the ground surface.
- Limbs must not extend below the ground collision line.
- No middle section of a limb may penetrate the soil.
- Reaching trajectories must remain outside the platform's solid interior.
- The limb should bend naturally to follow the surface without crossing it.

For a coordinate system where Y increases downward:

**The limb centerline must remain on the free-space side of the upper collision boundary, except for the explicitly permitted claw penetration described below.**

## Climbing underneath a platform

When the creature moves along the platform ceiling or underside:

- All flexible limb sections must remain below the underside collision boundary, in free space.
- Limbs must not extend upward into the solid platform.
- The limb must bend below the ceiling without crossing through it.
- Anchored claws must remain aligned with the ceiling normal.
- Reaching trajectories must not cut through the platform.

For a coordinate system where Y increases downward:

**The limb centerline must remain on the free-space side below the underside collision boundary, except for the permitted claw penetration.**

## Climbing on vertical walls

The same principle applies:

- Limb bodies must remain outside the solid terrain.
- Claws should approach the wall from free space.
- A limb must not cross through the wall to reach a target.
- The wrist and claw orientation must follow the wall's local normal.

## Curved surfaces and corners

For nonhorizontal surfaces, use the actual local terrain geometry and its outward normal.

Do not rely only on vertical Y checks.

Use collision-boundary tests to ensure that the flexible limb remains in free space.

When moving around a ledge:

- The limb may curl around the exposed corner.
- The curve must remain outside the solid terrain.
- The claw can contact the adjacent face.
- The limb must not take a shortcut through the solid corner.

## Implementation

Use a lightweight collision-aware curve solver.

Validate the entire limb curve, not just the claw tip.

Use a bounded number of curve segments or samples against nearby cached terrain geometry.

When a proposed curve intersects terrain:

1. Adjust the curve to remain on the free-space side.
2. Recalculate a valid smooth path where possible.
3. Reject the target if no valid curve can reach it.

Do not solve penetration by making the limb snap to a different position.

Avoid per-pixel collision tests.

Use cached collision geometry and spatial indexing.

---

# 6. Exact Claw Penetration Depth

The claw is the only part of a limb allowed to intentionally enter solid terrain during gripping.

**The penetration depth must equal the length of the gripping finger.**

This must be an explicit geometric constraint.

Define:

- `fingerLength`: the actual world-space length of the claw finger, accounting for sprite scale.
- `contactPoint`: where the claw enters the terrain boundary.
- `surfaceNormal`: the outward normal at the contact point.

For an ordinary surface grip, the finger extends into the terrain along the inward direction (opposite the outward surface normal).

The intended grip depth is:

**penetrationDepth = fingerLength**

Not deeper.

Do not let the entire claw base, wrist, or limb enter the terrain.

## Edge gripping

When a claw hooks onto the edge of a platform:

- The finger should curl around the exposed edge.
- The gripping tip must reach into or around the edge by an effective depth equal to one finger length.
- The contact position must account for the actual edge geometry.
- The rest of the limb remains outside the solid terrain.
- The finger must not pass through the entire platform.
- The claw must appear securely hooked, rather than floating next to the corner.

If the finger is curved, evaluate its actual gripping geometry or equivalent effective penetration distance, not an arbitrary offset.

Ensure the rendered claw artwork follows the calculated contact geometry.

Do not apply a constant penetration offset unrelated to finger length.

## Constraints

- Maximum intentional terrain penetration: one finger length.
- No penetration by the flexible limb body.
- No penetration by the wrist.
- No penetration by the creature's main body.
- The claw must remain stable while anchored.
- Penetration depth must remain consistent during movement.
- Release must be animated smoothly before the claw moves away.

**Do not use visual clipping to conceal incorrect limb geometry. Fix the geometric contact itself.**

---

# 7. Five-Limb Support and Weight Transfer

The creature must appear to have mass.

Use five independent flexible limbs to support and move the body.

During slow climbing:

- Typically 3–4 limbs provide support.
- A free limb can probe for a new anchor.
- Other limbs hold stable contact.
- The body moves within the reachable region defined by its anchors.
- The body is pulled forward through coordinated muscular motion.

Each anchored limb behaves as a flexible structure connecting its fixed claw anchor to the body.

It should not behave like a rigid rod or a hinged mechanical linkage.

The limb can curve under load, but it must respect its maximum useful length.

When a limb pulls:

- The curve changes gradually.
- The body accelerates smoothly.
- Other anchored limbs adapt their shape.
- The creature maintains a plausible support configuration.

During pursuit, the support sequence may become faster, but the same constraints apply.

Avoid switching all limb anchors at once.

Avoid unrealistic body teleportation when a new claw attaches.

If no valid support remains, do not artificially suspend the creature.

---

# 8. Smooth Surface Transitions

The creature must climb naturally between:

- Ceilings and walls.
- Walls and ceilings.
- Flat surfaces and slopes.
- Concave corners.
- Convex corners.
- Overhangs.

A transition should happen through a sequence of actual grips.

For example, when moving from a ceiling to a wall:

1. A free flexible limb reaches around the corner.
2. It finds an accessible grip on the wall.
3. Its curve remains outside the terrain.
4. The claw attaches to the wall at the correct angle and penetration depth.
5. The body gradually shifts toward the new support.
6. The body smoothly changes orientation.
7. Other limbs reposition.
8. The creature continues climbing.

No sudden body flips.

No snapping limbs.

No crossing through solid corners.

---

# 9. Sound-Based Hunting

Preserve the creature's existing sound-based perception system.

The creature is blind.

It should react to relevant sound events:

- Footsteps.
- Landing impacts.
- Jumping.
- Water splashes.
- Collisions.
- Other prey-generated sounds.

Sound perception must remain event-driven where possible.

The creature should remember a recent sound location, navigate toward it using connected climbable surfaces, and eventually lose the target if no new sound is detected.

Do not give the creature perfect knowledge of a silent player's location.

The pursuit mode should increase the speed of the same flexible-limb climbing system.

Do not introduce a separate fake running animation.

---

# 10. Maximum Performance Optimization

**Optimization is a mandatory requirement and must be considered from the beginning.**

The solution must remain extremely lightweight.

Do not replace knee-like IK with expensive soft-body physics.

### Recommended approach

Use:

- Five short flexible curve representations.
- A small, fixed number of control points per limb.
- Bounded curve evaluation.
- Cached terrain geometry.
- Spatial lookup for nearby surfaces.
- Stable anchor targets.
- Event-driven grip planning.
- Fixed-timestep motion simulation where appropriate.
- Rendering interpolation.

### Suggested update frequencies

- Rendering: every rendered frame.
- Body and limb motion: approximately 60 Hz simulation, with interpolation where appropriate.
- Grip planning: 10–20 Hz or event-driven.
- Navigation: 5–10 Hz or only when required.
- Sound detection: event-driven.
- Static terrain preprocessing: once at level initialization.

Tune these values based on actual profiling.

### Strict rules

- No full soft-body physics.
- No rigid-body simulation for each limb segment.
- No expensive iterative solvers without strict iteration limits.
- No scanning the entire terrain every frame.
- No unnecessary raycasts for anchored limbs.
- No per-frame texture generation.
- No expensive shaders or post-processing.
- No new temporary arrays or objects in hot update loops where avoidable.
- No rebuilding curve geometry or terrain data unnecessarily.
- No creating and destroying sprites during locomotion.
- No unbounded planning loops.

The computation cost should depend primarily on five limbs and a small number of nearby terrain segments, not the size of the entire level.

### Performance validation

Measure:

- Total creature update time.
- Limb curve update time.
- Terrain collision validation time.
- Grip planning time.
- Navigation time.
- Frame-time spikes.
- Memory allocations.

Test exploration and pursuit at 60 and 120 FPS.

Test several creatures simultaneously.

Prioritize stable frame times over unnecessarily complex animation.

---

# 11. Configurable Parameters

Expose configuration for:

### Anatomy

- Limb count: exactly 5.
- Limb attachment positions.
- Maximum limb length.
- Limb thickness and tapering.
- Number of curve control points.
- Maximum allowable curvature.
- Finger length.
- Claw penetration depth, derived from finger length.

### Movement

- Exploration speed.
- Pursuit speed.
- Body acceleration.
- Body angular velocity.
- Body angular acceleration.
- Body damping.
- Limb reaching speed.
- Limb curvature smoothing.
- Limb target smoothing.
- Grip switching hysteresis.
- Minimum grip hold time.
- Probing speed.
- Pulling strength.

### Performance

- Simulation frequency.
- Grip planning frequency.
- Maximum collision candidates.
- Maximum curve samples.
- Maximum solver iterations.
- Offscreen update policy.

Do not expose independent claw penetration values that can contradict the finger length constraint.

---

# 12. Debug Visualization

Provide an optional debug mode showing:

- Body position.
- Body orientation and target orientation.
- All five limb curves.
- Curve control points.
- Limb base attachment points.
- Anchored claw positions.
- Surface normals.
- Terrain collision boundaries.
- Claw penetration depth.
- Current grip targets.
- Valid and invalid limb paths.
- Current behavior state.
- Navigation targets.
- Update timings.

Debug mode must be disabled by default.

---

# 13. Required Acceptance Tests

Verify all of the following:

1. **Jointless limbs:** no limb ever forms an obvious elbow or knee.
2. **Smooth reaching:** each free limb extends and curls continuously.
3. **No limb jitter:** no sudden movement of claws or curve control points.
4. **No body twitching:** the body does not repeatedly rotate left and right.
5. **Stable facing:** minor velocity changes do not cause instant facing flips.
6. **Top-surface collision:** no flexible limb section crosses below the ground boundary.
7. **Ceiling collision:** no flexible limb section crosses above the ceiling/underside boundary.
8. **Wall collision:** flexible limbs remain outside solid wall geometry.
9. **Corner collision:** limbs curl around ledges without passing through terrain.
10. **Exact claw depth:** anchored fingers penetrate or hook by exactly one finger length.
11. **Stable anchors:** gripping claws do not slide or teleport.
12. **Body support:** the creature appears suspended by real, physically meaningful grips.
13. **Smooth pursuit:** fast movement remains continuous and physically believable.
14. **Smooth corners:** body rotation remains stable while transitioning between surfaces.
15. **Stable FPS:** no significant frame-time spikes or unnecessary CPU overhead.
16. **Multiple instances:** several creatures can operate without excessive performance degradation.

---

# 14. Implementation Instructions

Modify the existing creature implementation directly.

Do not create a completely new unrelated creature controller unless the current architecture makes that unavoidable.

Preserve:

- Existing creature artwork.
- Five-limb anatomy.
- Existing sound perception behavior.
- Existing terrain system.
- Existing gameplay interactions.
- Existing visual style.

Replace the parts that cause:

- Articulated knee-like limbs.
- Limb snapping.
- Unstable rotation.
- Terrain penetration.
- Incorrect claw contact.

If the existing sprite rig cannot represent continuously curving limbs, identify the minimum required rig or rendering changes. Do not fake jointless anatomy using visibly hinged sprites.

Implement the changes, test the specified behaviors, and report:

- Files modified.
- Changes to the limb deformation model.
- Fixes for body orientation and jitter.
- How terrain penetration is prevented.
- How claw penetration depth is computed.
- Performance optimizations.
- Actual profiling results, where available.
- Known limitations.

**Do not stop at recommendations. Implement the system in the codebase.**

## Final Definition of Success

The creature must look like a living organism with **five muscular, snake-like, jointless appendages**, not like an animal with five articulated legs.

Its limbs should stretch, curl, probe, grip, and pull with continuous organic motion.

Its body must move smoothly without twitching or flipping direction unexpectedly.

All limb bodies must remain outside solid terrain, both above platforms and below ceilings.

Only the claw fingers may intentionally grip into terrain, and their gripping depth must equal their actual length.

The implementation must remain highly optimized and must not noticeably reduce FPS.