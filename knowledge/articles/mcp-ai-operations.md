---
categories:
- system-architecture
- skills
created: '2026-07-04T05:38:36.882269+00:00'
id: mcp-ai-operations
modified: '2026-07-04T06:43:39.707168+00:00'
tags:
- skill
- ai
- mcp
- tools
- telemetry
title: AI Operations and MCP Skills
type: leaf
---

# AI Operations and MCP Skills

This guide is designed for AI agents operating within or integrating with the AIAR prototyping system. 

## System Capabilities

The AIAR system exposes a set of powerful MCP (Model Context Protocol) tools that allow AI agents to directly observe and manipulate the 3D VR scene. These tools are exposed via a `FastMCP` instance and mapped to OpenAI-compatible function calling by the `ai_service.py`.

If you are an AI assistant processing a user's voice command, you are expected to use these tools autonomously to fulfill the request.

### Scene Manipulation Skills

You can manipulate the scene graph dynamically. Entities consist of a `TransformComponent`, a `MeshComponent`, `LightComponent`, and a `MaterialComponent`.
(See [[supported-scene-objects|Supported Scene Objects and Components]] for a list of valid components and their properties.)

*   **`create_entity(name, components_json)`**
    *   **Usage:** Spawns a custom entity using a JSON payload. The payload can define transform, mesh, material, and light properties.
    *   **Example JSON:** `{"transform": {"position": [0,1,0]}, "mesh": {"type": "box", "properties": {"size": 0.4}}, "material": {"diffuse": [1,0,0]}}`
    *   **Skill:** Use the user's spatial context (e.g., controller intersection point) to accurately place the object.
*   **`update_entity(entity_id, components_json)`**
    *   **Usage:** Updates specific components of an existing object via JSON deep merge. Only the provided properties will be modified. To remove a component entirely, pass `null` for it.
    *   **Skill:** Use this to move an object, resize it, change its color, or strip/add components without deleting and recreating it.
*   **`remove_object(entity_id)`**
    *   **Usage:** Deletes an entity from the scene by its exact ID.
*   **`undo_last_action()`**
    *   **Usage:** Reverts the scene to the state before the most recent addition, removal, or update.
*   **`get_scene()`**
    *   **Usage:** Fetches the entire declarative JSON scene graph for inspection.

### Telemetry and Debugging Skills

AI agents should actively monitor the system health, verify the outcomes of their actions, and debug failures using the integrated `SystemLogger`.

*   **`log_tail(limit, level, subsystem)`**
    *   **Usage:** Fetches the most recent `limit` log entries. You can filter by `level` (e.g. 'INFO', 'WARNING', 'ERROR') and `subsystem` (e.g. 'Voice', 'Scene', 'AI').
    *   **Skill:** If you execute a command and suspect it failed silently, invoke `log_tail(level="ERROR", subsystem="Scene")` to check for file I/O or rendering exceptions.
*   **`log_since(timestamp, level, subsystem)`**
    *   **Usage:** Fetches all logs since a specific Unix timestamp.

## Execution Flow

1.  **Context Injection:** When you receive a prompt, it will contain the user's spoken command and their immediate spatial context (where their headset is looking, and where their VR hand controllers are pointing).
2.  **Tool Selection:** Decide which MCP tool best fulfills the intent. For example, if the user points at the floor and says "Put a tree there," use `create_entity` at the provided intersection point.
3.  **Validation:** Call `log_tail` if necessary to confirm the system recorded the change successfully.