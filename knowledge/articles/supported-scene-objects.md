---
categories:
- system-architecture
created: '2026-07-04T04:56:14.194454+00:00'
id: supported-scene-objects
modified: '2026-07-04T04:56:14.194469+00:00'
tags:
- scene
- schema
- models
- pydantic
- components
- mesh
- light
title: Supported Scene Objects and Components
type: leaf
---

# Supported Scene Objects and Components

The AIAR prototyping engine is driven by a data-driven **Component Object Model (COM)** defined in Pydantic (`models.py`) and synchronized to the frontend TypeScript engine via automated Codegen.

This article details the currently supported component types and their parsable properties within the `scene.json` schema.

## Entity Structure

An `Entity` is the base container in the scene. It holds an ID, a name, and a dictionary of `components`.

```json
{
  "id": "unique-uuid",
  "name": "My Object",
  "components": { ... }
}
```

---

## 1. Transform Component
The `transform` component dictates the spatial orientation of the entity in the 3D scene.

*   `position`: Array of 3 floats `[x, y, z]` (Default: `[0.0, 0.0, 0.0]`)
*   `rotation`: Array of 3 floats `[x, y, z]` in radians (Default: `[0.0, 0.0, 0.0]`)
*   `scaling`: Array of 3 floats `[x, y, z]` (Default: `[1.0, 1.0, 1.0]`)

---

## 2. Material Component
The `material` component defines how light interacts with a mesh. The engine currently utilizes Babylon's `StandardMaterial`.

*   `diffuse`: RGB Array `[r, g, b]` for the base color (Default: `[1.0, 1.0, 1.0]`)
*   `emissive`: RGB Array `[r, g, b]` for self-illumination (Default: `[0.0, 0.0, 0.0]`)
*   `specular`: RGB Array `[r, g, b]` for highlight colors (Default: `[1.0, 1.0, 1.0]`)

---

## 3. Mesh Component
The `mesh` component is responsible for geometry. If an entity contains a `mesh` component, the engine will instantiate a visual 3D object.

### Supported `type` values:
*   `"box"`
*   `"sphere"`
*   `"ground"`

### The `properties` dictionary
The `properties` object is passed directly into Babylon.js `MeshBuilder` functions. Therefore, you can pass any valid options for the specific geometry:
*   **Box:** `size`, `width`, `height`, `depth`, etc.
*   **Sphere:** `diameter`, `segments`, etc.
*   **Ground:** `width`, `height`, `subdivisions`, etc. (Note: Grounds automatically receive shadows in the current implementation).

*Note: Passing an unsupported `type` (e.g., `"torus"`) will trigger a soft error in the VR UI.*

---

## 4. Light Component
The `light` component defines a light source in the scene.

### Supported `type` values:
*   `"hemispheric"`: Provides ambient environmental light.
*   `"directional"`: Emits parallel light rays (e.g., sunlight), useful for casting shadows.

### Properties
*   `direction`: Array of 3 floats `[x, y, z]` (Default: `[0.0, -1.0, 0.0]`)
*   `intensity`: Float defining the brightness multiplier (Default: `1.0`)
*   `position`: Optional array of 3 floats `[x, y, z]` (Used primarily by directional lights).

*Note: Like meshes, passing an unsupported light type will trigger an error in the VR HUD.*