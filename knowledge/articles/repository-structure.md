---
categories:
- system-architecture
created: '2026-07-04T02:34:41.704822+00:00'
id: repository-structure
modified: '2026-07-04T04:44:11.343794+00:00'
tags:
- architecture
- structure
- directories
- uv
- fastapi
- fastmcp
- typescript
title: Repository Structure and Technical Details
type: leaf
---

# Repository Structure and Technical Details

This article documents the physical directory structure and the technology stack for the AIAR prototyping system. This provides essential context for any AI agents working on the codebase.

## Directory Layout

The root directory contains three primary folders:

```text
AIAR/
в”њв”Ђв”Ђ host/                  # Python backend server
в”њв”Ђв”Ђ engine/                # TypeScript AR/VR engine
в””в”Ђв”Ђ projects/
    в””в”Ђв”Ђ default/           # Default VR project data
```

### 1. `host/` (Python Backend)
*   **Tech Stack:** Python 3.13+, initialized via `uv`.
*   **Dependencies:** `fastapi` (for REST APIs), `uvicorn` (ASGI server), `fastmcp` (for HTTP MCP).
*   **Structure:**
    *   `pyproject.toml` / `uv.lock`: Dependency management.
    *   `src/main.py`: The application entry point. This file initializes both the FastAPI app and the FastMCP server.
*   **Purpose:** Orchestrates the system, triggers TS rebuilds, serves the web app, and processes AI commands using the Antigravity SDK.

### 2. `engine/` (TypeScript Engine)
*   **Tech Stack:** TypeScript, Babylon.js (`@babylonjs/core`).
*   **Structure:**
    *   `package.json`: Contains basic scripts (`build`: `tsc`, `dev`: `tsc --watch`).
    *   `src/model/`: Contains the pure TypeScript Unity3D-like component system. This is the source of truth for the scene state.
    *   `src/visualisation/`: Contains the Babylon.js integration code. This layer reads from the `model` and updates the 3D scene graph accordingly.
*   **Purpose:** The core client-side application that renders the VR scene and handles user inputs.

### 3. `projects/default/` (Default VR Project)
*   **Purpose:** This directory serves as the default workspace loaded by the engine if the user hasn't specified another project path. All project-specific data lives here.
*   **Structure:**
    *   `assets/`: Storage for raw and processed media files, primarily `.gltf` / `.glb` models, and separate textures (PNG/JPG).
    *   `scenes/`: Stores the declarative scene graph files (like `scene.json`) that describe how entities and components are arranged in the world.
    *   `scripts/`: Project-specific TypeScript modules that define custom logic or behaviors not included in the base engine.