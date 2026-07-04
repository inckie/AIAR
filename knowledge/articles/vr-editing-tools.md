---
categories:
- user-interaction
created: '2026-07-04T02:25:56.434959+00:00'
id: vr-editing-tools
modified: '2026-07-04T04:57:58.792185+00:00'
tags:
- vr
- editing
- tools
- ui
- 3d
title: VR 3D Editing Tools
type: leaf
---

# VR 3D Editing Tools

While voice control provides a high-level, semantic way to interact with the AI, users also need precise, low-level control over the AR environment. The system provides traditional 3D editing tools accessible directly from within VR.

## Capabilities

Users can utilize VR controllers (like Oculus Touch or HTC Vive wands) to perform standard scene manipulations:

*   **Adding Objects:** Spawning new primitives (see [[supported-scene-objects|Supported Scene Objects]]) or complex assets from a library into the scene.
*   **Removing Objects:** Deleting selected entities from the environment.
*   **Modifying Objects (Transformations):** Grabbing, translating (moving), rotating, and scaling objects using spatial 3D gizmos or direct hand interactions.
*   **Property Editing:** Accessing spatial UI panels to tweak specific component properties on the [[web-frontend|Model Layer]] (e.g., changing colors, physics mass, or custom script variables).

These tools run locally on the frontend, modifying the Model Layer directly, and can work in tandem with the AI. For instance, a user might use voice to spawn a complex object, and then use the manual editing tools to precisely position it on a virtual table.