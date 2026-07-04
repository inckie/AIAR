---
categories:
- system-architecture
created: '2026-07-04T02:34:41.704822+00:00'
id: repository-structure
modified: '2026-07-04T05:38:15.336076+00:00'
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
РІвЂќСљРІвЂќР‚РІвЂќР‚ host/                  # Python backend server
РІвЂќСљРІвЂќР‚РІвЂќР‚ engine/                # TypeScript AR/VR engine
РІвЂќвЂќРІвЂќР‚РІвЂќР‚ projects/
    РІвЂќвЂќРІвЂќР‚РІвЂќР‚ default/           # Default VR project data
```

### 1. `host/` (Python Backend)
*   **Tech Stack:** Python 3.13+, initialized via `uv`.
*   **Dependencies:** `fastapi` (for REST APIs), `uvicorn` (ASGI server), `mcp` (for HTTP MCP integration via `FastMCP`).
*   **Structure:**
    *   `pyproject.toml` / `uv.lock`: Dependency management.
    *   `src/main.py`: The application entry point. This file initializes both the FastAPI app and mounts the MCP SSE server.
    *   `src/mcp_server.py`: Defines the `FastMCP` tools exposed to internal and external AI agents (e.g. `add_object`, `remove_object`, `log_tail`).
    *   `src/ai_service.py`: Orchestrates OpenAI API compatible LLM requests and maps FastMCP tools into OpenAI functions.
    *   `src/logger.py`: A centralized in-memory rolling logger tracking 'Voice', 'Scene', and 'AI' subsystems.
*   **Purpose:** Orchestrates the system, triggers TS rebuilds, serves the web app, and processes AI commands autonomously via LLM bindings.

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