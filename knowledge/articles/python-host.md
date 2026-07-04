---
categories:
- system-architecture
created: '2026-07-04T02:25:49.440581+00:00'
id: python-host
modified: '2026-07-04T02:25:49.440597+00:00'
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

1. **TypeScript Compilation & Serving:**
   The host is responsible for triggering TypeScript rebuilds of the frontend web application and serving the built engine assets over HTTP to the VR clients.
   
2. **AI Layer Hosting:**
   The core AI logic and interaction handling are hosted here. It utilizes the Antigravity SDK locally to process user commands and translate them into actionable modifications within the VR scene.

3. **Multi-Protocol Interfaces:**
   To provide flexibility and integration capabilities, the Python host exposes its AI and control layers through multiple interfaces:
   * **REST HTTP API:** For direct control from the VR environment (e.g., executing voice commands or UI actions) and from other standard tools.
   * **HTTP MCP (Model Context Protocol):** To expose tools and context to external AI agents, allowing them to inspect or manipulate the AR prototyping environment.
   * **Direct Antigravity SDK:** For internal, high-performance execution of AI tasks locally.