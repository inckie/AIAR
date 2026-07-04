---
categories:
- system-architecture
created: '2026-07-04T02:25:52.308579+00:00'
id: web-frontend
modified: '2026-07-04T04:41:46.738773+00:00'
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

### 1. Model Layer (Data Sync)
*   **Data-Driven:** The frontend is entirely data-driven and does not dictate scene logic. It acts as a mirror for the backend.
*   **Codegen Types:** It imports strict TypeScript interfaces (e.g., `Entity`, `MeshComponent`) that are auto-generated directly from the Python backend's Pydantic models. This ensures structural integrity.
*   **Real-time Polling:** The model layer polls the Python backend's `GET /api/scene` endpoint (currently every 2 seconds). It calculates the differential changes and dictates what the visualization layer needs to build or destroy.

### 2. Visualisation Layer (Babylon.js)
*   **Scene Instantiation:** The `SceneLoader` listens to changes in the Model Layer and updates the Babylon.js scene graph accordingly, creating meshes, lights, and applying materials based on component properties.
*   **Rendering:** Handles 3D rendering, shaders, and materials in the VR environment.
*   **Input Translation & Spatial Context:** Captures user inputs (from VR controllers and headsets). Crucially, whenever the user executes a voice command, this layer instantly snapshots the spatial context (head position, and raycast intersections from the right controller) and bundles it with the audio to send to the backend for semantic processing.