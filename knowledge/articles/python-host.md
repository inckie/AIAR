---
categories:
- system-architecture
created: '2026-07-04T02:25:49.440581+00:00'
id: python-host
modified: '2026-07-04T04:58:00.886193+00:00'
tags:
- python
- backend
- server
- mcp
- rest
- antigravity
title: Python Host Backend
type: leaf
---

# Python Host Backend

The Python Host serves as the backend foundation for the AIAR prototyping system. It performs several critical roles to orchestrate the VR environment, AI integrations, and development workflow.

## Key Responsibilities

1. **Scene State Management:**
   The backend acts as the absolute source of truth for the 3D scene. A centralized `SceneManager` handles all Pydantic representations of entities and components (see [[supported-scene-objects|Supported Scene Objects]]). It provides a `GET /api/scene` endpoint for the frontend to poll and updates a local `scene.json` file. It also maintains a rolling stack of previous states to support instant undo functionality.
   
2. **TypeScript Compilation & Codegen:**
   The host triggers TypeScript rebuilds of the frontend web application and serves the built engine assets. It also drives an automated Codegen pipeline (`generate_ts.py`): whenever Pydantic models change in Python, it exports a JSON Schema and uses `json-schema-to-typescript` to generate perfectly synced TypeScript interfaces for the frontend.
   
3. **AI Layer Hosting & Voice Processing:**
   The core AI logic and interaction handling are hosted here. It utilizes local `openai-whisper` models to transcribe voice commands (with bundled FFmpeg decoding) and routes the results and spatial context through an `AbstractCommandProcessor` to manipulate the VR scene.

4. **Multi-Protocol Interfaces:**
   To provide flexibility and integration capabilities, the Python host exposes its AI and control layers through multiple interfaces:
   * **REST HTTP API:** For direct control from the VR environment (e.g., executing voice commands or UI actions) and from other standard tools.
   * **HTTP MCP (Model Context Protocol):** To expose tools and context to external AI agents, allowing them to inspect or manipulate the AR prototyping environment.
   * **Direct Antigravity SDK:** For internal, high-performance execution of AI tasks locally.