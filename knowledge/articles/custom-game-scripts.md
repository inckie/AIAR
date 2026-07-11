---
categories:
- system-architecture
- skills
created: '2026-07-11T07:12:00+00:00'
id: custom-game-scripts
modified: '2026-07-11T08:57:01.472487+00:00'
tags:
- scripting
- scripts
- unity-lifecycle
- javascript
- custom-behavior
- skill
title: Custom Game Scripts Support
type: leaf
---

# Custom Game Scripts Support

AIAR features a modular, Unity-like scripting system that allows attaching custom behaviors to 3D entities in the scene. Scripts are written in standard ES Module JavaScript and executed on the client side inside the Babylon.js render loop.

Note that project does not use Babylon.js scripting system and events so frontend can be replaced with other implementations as long as there is a way to run JS.

---

## 1. Scripting Infrastructure

### File Location and Serving
All custom scripts must be placed in:
`projects/default/scripts/`

The Python Host Server mounts this directory at `/scripts` as a static resource. The frontend dev server (Vite) proxies `/scripts/*` requests directly to the Python backend to prevent CORS issues during local development.

### Scene JSON Integration
Scripts are attached to scene entities via a `scripts` array under the entity's `components` dictionary:

```json
{
  "id": "Sun",
  "name": "Sun",
  "components": {
    "transform": {"position": [0, 5, -5]},
    "scripts": [
      {
        "name": "RotateBehaviour.js",
        "properties": {
          "speed": 0.25,
          "axis": [0, 1, 0]
        }
      }
    ]
  }
}
```

- **name**: The exact filename of the script inside `projects/default/scripts/`.
- **properties**: Arbitrary key-value pairs passed to the script constructor.

---

## 2. Script Structure & Lifecycle

Every script must export a default class that maps typical Unity-style lifecycle events:

```javascript
export default class CustomBehaviour {
    /**
     * @param {BABYLON.Node} node - The Babylon.js node this script is attached to.
     * @param {Object} properties - Configuration properties passed from scene.json.
     */
    constructor(node, properties) {
        this.node = node;
        this.properties = properties;
    }

    /**
     * Start is called once when the script is first loaded and instantiated.
     */
    Start() {
        // Initialization logic here
    }

    /**
     * Update is called every frame.
     * @param {number} deltaTime - Time elapsed since the last frame in seconds.
     */
    Update(deltaTime) {
        // Frame-rate independent updates here
    }

    /**
     * OnEnable is called when the associated entity is enabled.
     */
    OnEnable() {
        // Event listeners activation
    }

    /**
     * OnDisable is called when the associated entity is disabled.
     */
    OnDisable() {
        // Cleanup active state
    }

    /**
     * OnDestroy is called when the associated entity is deleted from the scene.
     */
    OnDestroy() {
        // Complete memory cleanup (removing listeners, stopping timers, etc.)
    }

    /**
     * OnClick is called when the user points at the mesh and clicks (or pulls VR trigger).
     * Note: This is only triggered if the attached node is an AbstractMesh.
     */
    OnClick() {
        // Interactivity logic here
    }
}
```

---

## 3. AI Skills & Guidelines for Writing Scripts

When writing custom scripts for AIAR, AI agents should follow these best practices:

### I. Handle Transform Node Safely
An entity might be a mesh (`BABYLON.Mesh`), a light (`BABYLON.Light`), or an empty pivot (`BABYLON.TransformNode`). 
- Check if properties exist before accessing them (e.g., `if (this.node.rotation) ...`).
- Do not assume `this.node` is always a renderable mesh.

### II. Event Cleanups
To prevent memory leaks:
- Any event listener registered inside `Start` or `OnEnable` must be unregistered in `OnDestroy` or `OnDisable`.
- Use Babylon.js's Observables with appropriate cleanup triggers.

### III. Orbit and Rotations
- To rotate children, parent them to a pivot node and apply rotation scripts directly to the pivot node.
- Modifying `this.node.rotation` directly updates the node's local Euler angles. Be aware that if `node.rotationQuaternion` is set (common for imported glTF models), `node.rotation` is ignored. Force local Euler rotation using:
  ```javascript
  this.node.rotationQuaternion = null; // Discard quaternion if you wish to use Euler rotation.
  ```

### IV. Dynamic Modifiers
Properties passed to `properties` in `scene.json` (such as `speed`, `axis`, `color`) can be parsed in the constructor. Provide sane defaults in case the user does not specify them in `scene.json`.

### V. Logging
Do not worry about accessing terminal logs on the browser—the frontend environment automatically forwards standard JavaScript logging methods and unhandled exceptions (via `console.error` hooking and `window.onerror`) directly to the Python backend's `SystemLogger` under the "Browser" subsystem.
Therefore, if you need to trace variables or report errors in your custom script, you can simply use the native `console.error()`, `console.warn()`, or `console.info()` and they will be visible in the backend log stream readable by MCP tools.

### VI. No Bare Module Imports
Because custom scripts are fetched dynamically over the network natively by the browser without passing through a bundler, you **cannot** use bare module imports (e.g., `import { Animation } from "@babylonjs/core";`). Doing so will cause a runtime resolution error in the browser (`Failed to load or instantiate script: {}`). 
If you need complex animation or math, you must compute it manually within the `Update(deltaTime)` loop (e.g., using simple trigonometry for easing).