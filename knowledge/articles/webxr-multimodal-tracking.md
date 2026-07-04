---
categories:
- user-interaction
created: '2026-07-04T03:31:08.738303+00:00'
id: webxr-multimodal-tracking
modified: '2026-07-04T03:31:08.738320+00:00'
tags:
- webxr
- hands
- controllers
- multimodal
- babylonjs
title: WebXR Multimodal Tracking
type: leaf
---

# WebXR Multimodal Tracking

When developing for modern VR headsets (such as the Meta Quest series running the Oculus Browser), you may encounter a hardware feature known as **multimodal tracking**. This feature allows the headset to track and report both articulated hand inputs and physical controller inputs simultaneously.

## The Issue in WebXR

By default, when WebXR's `HAND_TRACKING` feature is enabled in Babylon.js, it expects a mutual exclusivity between hands and controllers. However, because multimodal headsets stream both input sources concurrently, Babylon.js will attempt to render both sets of meshes at the same time. This results in visual artifacts where generic floating "hand" models intersect and hover awkwardly over the physical controller models.

## The Workaround

To ensure a clean user experience (where hands disappear when controllers are picked up), we cannot rely on native WebXR feature toggles. Instead, a brute-force sweep in the render loop is required.

### Implementation Logic

The current implementation in `engine/src/index.ts` uses an `onBeforeRenderObservable` loop that executes every frame:

1. **Detection:** It scans all active `xr.input.controllers` to see if any input source lacks the `.hand` property (indicating a physical controller is active).
2. **Brute-Force Suppression:** If a physical controller is detected, the engine iterates through all `scene.transformNodes` and `scene.meshes`. Any node containing `"hand"` in its name (excluding specific UI elements like the wrist menu or the physical controllers themselves) is forcefully disabled via `.setEnabled(false)`.
3. **Pointer Suppression:** The `.pointer` node of the hand controller is also disabled to prevent duplicate laser pointers or UI menus from rendering.

### Caveats

*   **String Matching:** Because the logic relies on string matching (`name.includes("hand")`), care must be taken not to name unrelated scene objects or components with the word "hand", as they will inadvertently disappear when the user picks up a controller.
*   **Performance:** Iterating over `scene.meshes` and `scene.transformNodes` every frame has a slight performance cost. In extremely large scenes, this may need to be optimized (e.g., by caching the hand nodes once they are generated).
*   **Menu Attachment:** Because the hand's pointer node is hidden when controllers are active, any UI elements attached exclusively to the hand pointer (like the Wrist Menu) must be attached to the physical controller's pointer as well (which happens automatically via `onControllerAddedObservable`).