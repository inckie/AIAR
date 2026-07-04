---
categories:
- system-architecture
created: '2026-07-04T02:25:52.308579+00:00'
id: web-frontend
modified: '2026-07-04T02:25:52.308594+00:00'
tags:
- typescript
- babylonjs
- frontend
- vr
- architecture
title: Web Frontend (TypeScript & Babylon.js)
type: leaf
---

# Web Frontend (TypeScript & Babylon.js)

The web frontend is the visual and interactive core of the AR prototyping system, running in the user's browser or VR headset. It is built purely in TypeScript and utilizes Babylon.js for rendering.

## Architecture Separation

A key architectural principle of the frontend is the strict separation between the **visualisation layer** and the **model layer**.

### 1. Model Layer
*   **Pure TypeScript:** This layer is independent of the rendering engine.
*   **Component System:** It employs a Unity3D-like component system where entities are composed of reusable data components and logic behaviors. 
*   **State Management:** It holds the absolute truth of the AR scene's state, tracking all objects, properties, and relationships. It handles the business logic and structural integrity of the prototyping environment.

### 2. Visualisation Layer
*   **Babylon.js Integration:** This layer listens to changes in the Model Layer and updates the Babylon.js scene graph accordingly.
*   **Rendering:** Handles 3D rendering, shaders, materials, and lighting in the VR environment.
*   **Input Translation:** Captures user inputs (from VR controllers, headsets, or traditional devices) and translates them into semantic commands that are dispatched to the Model Layer or the [[python-host|Python backend]] for AI processing.