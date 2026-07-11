"""FastMCP server definition exposing 3D tools to the AI agent.

:wk-id: mcp-ai-operations
:wk-tags: mcp, server, tools, ai, fastmcp, hierarchy, visibility
:wk-categories: system-architecture

Exposes tools to manipulate the 3D scene (create/update/remove/reparent/state)
and fetch logs for the AI assistant.
"""

from typing import Optional, List, Dict, Any
from mcp.server.fastmcp import FastMCP
import uuid
import random

from .scene_manager import SceneManager
from .models import (
    Entity,
    Components,
    TransformComponent,
    MeshComponent,
    MaterialComponent,
)
from .logger import get_logger

logger = get_logger()


def create_mcp_server(scene_manager: SceneManager) -> FastMCP:
    """Create an MCP server with tools for AR scene manipulation."""

    mcp = FastMCP(
        "AIAR",
        instructions=(
            "AIAR is a 3D AR prototyping engine. You can use these tools to inspect "
            "and manipulate the 3D scene graph. Entities have transforms, meshes (box, sphere, ground), "
            "and materials."
        ),
    )

    @mcp.tool()
    def get_scene() -> str:
        """Get the current scene state as a JSON string."""
        import json

        return json.dumps(scene_manager.get_scene_json(), indent=2)

    @mcp.tool()
    def create_entity(name: str, components_json: str) -> str:
        """
        Create a new 3D entity in the scene from a JSON component definition.
        Args:
            name: A descriptive name for the entity.
            components_json: A JSON string containing 'transform', 'mesh', 'material', and/or 'light' definitions.
        Returns:
            Confirmation string with the entity ID.
        """
        import json

        try:
            components_data = json.loads(components_json)
        except json.JSONDecodeError:
            return "Error: components_json is not a valid JSON string."

        entity_id = f"{name}_{uuid.uuid4().hex[:6]}"
        data = {"id": entity_id, "name": name, "components": components_data}
        try:
            entity = Entity(**data)
            scene_manager.add_entity(entity)
            return f"Created entity '{name}' with ID {entity_id}."
        except Exception as e:
            return f"Error validating entity components: {e}"

    @mcp.tool()
    def update_entity(entity_id: str, components_json: str) -> str:
        """
        Update components of an existing 3D entity from a JSON definition.
        Omit components you don't want to change. Pass null to remove a component.
        Args:
            entity_id: The ID of the entity to update.
            components_json: A JSON string containing updates for 'transform', 'mesh', 'material', etc.
        Returns:
            Confirmation string.
        """
        import json

        try:
            components_data = json.loads(components_json)
        except json.JSONDecodeError:
            return "Error: components_json is not a valid JSON string."

        updates = {"components": components_data}
        if scene_manager.update_entity(entity_id, updates):
            return f"Successfully updated entity '{entity_id}'."
        return f"Failed to update entity '{entity_id}'."

    @mcp.tool()
    def remove_object(entity_id: str) -> str:
        """
        Remove an object from the scene by its exact entity ID.
        Args:
            entity_id: The ID of the entity to remove.
        Returns:
            Confirmation string.
        """
        success = scene_manager.remove_entity(entity_id)
        if success:
            return f"Removed entity '{entity_id}'."
        return f"Error: Entity '{entity_id}' not found."

    @mcp.tool()
    def undo_last_action() -> str:
        """
        Undo the last addition or removal action.
        Returns:
            Confirmation string.
        """
        if scene_manager.undo():
            return "Undid last action successfully."
        return "Nothing to undo."

    @mcp.tool()
    def reparent_object(entity_id: str, parent_id: Optional[str] = None) -> str:
        """
        Set or clear the parent of an object to build a hierarchy.
        Args:
            entity_id: The ID of the entity to reparent.
            parent_id: The ID of the new parent entity. Pass null/None to unparent.
        Returns:
            Confirmation string.
        """
        updates = {"parent_id": parent_id}
        if scene_manager.update_entity(entity_id, updates):
            return f"Successfully reparented entity '{entity_id}'."
        return f"Failed to reparent entity '{entity_id}'."

    @mcp.tool()
    def set_object_state(entity_id: str, enabled: Optional[bool] = None, visible: Optional[bool] = None) -> str:
        """
        Set the enabled and visible states of an object.
        Args:
            entity_id: The ID of the entity.
            enabled: Whether the object (and its children) should be active. Omit to leave unchanged.
            visible: Whether the object (and its children) should be visible. Omit to leave unchanged.
        Returns:
            Confirmation string.
        """
        updates = {}
        if enabled is not None:
            updates["enabled"] = enabled
        if visible is not None:
            updates["visible"] = visible
            
        if not updates:
            return "No state updates provided."
            
        if scene_manager.update_entity(entity_id, updates):
            return f"Successfully updated state for entity '{entity_id}'."
        return f"Failed to update state for entity '{entity_id}'."

    @mcp.tool()
    def list_scripts() -> str:
        """
        List all available custom game scripts.
        Returns:
            A JSON-formatted list of script filenames.
        """
        import os, json
        scripts_dir = os.path.join(os.path.dirname(scene_manager.scene_dir), "scripts")
        if not os.path.exists(scripts_dir):
            return "[]"
        scripts = [f for f in os.listdir(scripts_dir) if f.endswith(('.js', '.ts'))]
        return json.dumps(scripts)

    @mcp.tool()
    def get_script(filename: str) -> str:
        """
        Read the content of a custom game script.
        Args:
            filename: The name of the script file.
        Returns:
            The script content as a string.
        """
        import os
        filename = os.path.basename(filename)
        scripts_dir = os.path.join(os.path.dirname(scene_manager.scene_dir), "scripts")
        filepath = os.path.join(scripts_dir, filename)
        if not os.path.exists(filepath):
            return f"Error: Script '{filename}' not found."
        with open(filepath, "r", encoding="utf-8") as f:
            return f.read()

    @mcp.tool()
    def save_script(filename: str, content: str) -> str:
        """
        Create or update a custom game script.
        Args:
            filename: The name of the script file (must end in .js or .ts).
            content: The full source code content of the script.
        Returns:
            Confirmation string.
        """
        import os
        filename = os.path.basename(filename)
        if not filename.endswith(('.js', '.ts')):
            return "Error: Script filename must end in .js or .ts"
        scripts_dir = os.path.join(os.path.dirname(scene_manager.scene_dir), "scripts")
        os.makedirs(scripts_dir, exist_ok=True)
        filepath = os.path.join(scripts_dir, filename)
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(content)
        return f"Successfully saved script '{filename}'."

    @mcp.tool()
    def delete_script(filename: str) -> str:
        """
        Delete a custom game script.
        Args:
            filename: The name of the script file.
        Returns:
            Confirmation string.
        """
        import os
        filename = os.path.basename(filename)
        scripts_dir = os.path.join(os.path.dirname(scene_manager.scene_dir), "scripts")
        filepath = os.path.join(scripts_dir, filename)
        if not os.path.exists(filepath):
            return f"Error: Script '{filename}' not found."
        try:
            os.remove(filepath)
            return f"Successfully deleted script '{filename}'."
        except Exception as e:
            return f"Error deleting script: {e}"

    @mcp.tool()
    def log_tail(
        limit: int = 50, level: Optional[str] = None, subsystems: Optional[List[str]] = None
    ) -> str:
        """
        Fetch the most recent log entries.
        Args:
            limit: Maximum number of entries to return.
            level: Optional filter by minimum level (e.g. 'DEBUG', 'INFO', 'WARNING', 'ERROR').
            subsystems: Optional filter list of subsystems (e.g. ['Scene', 'Voice', 'AI']).
        Returns:
            A JSON-formatted string of log entries.
        """
        import json

        logs = logger.get_tail(limit, level, subsystems)
        return json.dumps([l.model_dump() for l in logs], indent=2)

    @mcp.tool()
    def log_since(
        timestamp: float, level: Optional[str] = None, subsystems: Optional[List[str]] = None
    ) -> str:
        """
        Fetch all log entries since a given Unix timestamp.
        Args:
            timestamp: The Unix timestamp (e.g. 1700000000.0).
            level: Optional filter by minimum level (e.g. 'DEBUG', 'INFO', 'WARNING', 'ERROR').
            subsystems: Optional filter list of subsystems (e.g. ['Scene', 'Voice', 'AI']).
        Returns:
            A JSON-formatted string of log entries.
        """
        import json

        logs = logger.get_since(timestamp, level, subsystems)
        return json.dumps([l.model_dump() for l in logs], indent=2)

    return mcp
