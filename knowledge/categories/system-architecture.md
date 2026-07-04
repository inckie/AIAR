---
categories:
- overview
created: '2026-07-04T02:25:33.301196+00:00'
id: system-architecture
modified: '2026-07-04T03:07:26.869477+00:00'
tags:
- architecture
- backend
- frontend
title: System Architecture
type: category
---

<!-- human:start -->
This category covers the overall architecture of the WebGL AR prototyping system, including the division between the Python host backend and the TypeScript/Babylon.js frontend, as well as the communication interfaces (REST, MCP) between them and external AIs.
<!-- human:end -->

## Articles in This Category

<!-- ai:start -->
The system is built on a clear separation of concerns between the backend logic and the frontend presentation layer. This structure ensures high performance and flexibility for AI integrations.

### Leaf Articles

*   [[local-development-webxr]]: Explains the local development workflow for testing WebXR on actual VR headsets. It details the necessity of HTTPS and how the system utilizes `vite-plugin-mkcert` to bypass browser security blocks during development.
*   [[python-host]]: Describes the backend foundation. The Python host manages TypeScript compilation, serves the web assets, and hosts the AI logic powered by the Antigravity SDK. It exposes its capabilities through REST and HTTP MCP interfaces.
*   [[repository-structure]]: Documents the physical directory layout (`host/`, `engine/`, `projects/default/`) and the corresponding tech stack. This acts as a reference for agents interacting with the codebase.
*   [[web-frontend]]: Details the TypeScript and Babylon.js client. It features a strict separation between the Unity-like component data model (state) and the visual rendering engine.
<!-- ai:end -->