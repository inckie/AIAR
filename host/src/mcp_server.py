from typing import Optional, List, Dict, Any
from mcp.server.fastmcp import FastMCP
import uuid
import random

from .scene_manager import SceneManager
from .models import Entity, Components, TransformComponent, MeshComponent, MaterialComponent
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
    def add_object(shape: str, x: float, y: float, z: float, size: float = 0.4, color_r: float = 1.0, color_g: float = 1.0, color_b: float = 1.0) -> str:
        """
        Add a 3D object to the scene.
        Args:
            shape: 'box' or 'sphere' (See WikiKnowledge article 'supported-scene-objects' for known objects)
            x: X position coordinate
            y: Y position coordinate
            z: Z position coordinate
            size: The size of the object (diameter for sphere, width/height for box)
            color_r: Red channel (0.0 to 1.0)
            color_g: Green channel (0.0 to 1.0)
            color_b: Blue channel (0.0 to 1.0)
        Returns:
            Confirmation string with the entity ID.
        """
        if shape not in ["box", "sphere"]:
            return f"Error: Unsupported shape '{shape}'. Use 'box' or 'sphere'."
            
        entity_id = f"{shape}_{uuid.uuid4().hex[:6]}"
        props = {"size": size} if shape == "box" else {"diameter": size}
        
        entity = Entity(
            id=entity_id,
            name=entity_id,
            components=Components(
                transform=TransformComponent(position=[x, y, z]),
                mesh=MeshComponent(type=shape, properties=props),
                material=MaterialComponent(diffuse=[color_r, color_g, color_b])
            )
        )
        scene_manager.add_entity(entity)
        return f"Added {shape} at [{x}, {y}, {z}] with ID {entity_id}."

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
    def log_tail(limit: int = 50, level: Optional[str] = None, subsystem: Optional[str] = None) -> str:
        """
        Fetch the most recent log entries.
        Args:
            limit: Maximum number of entries to return.
            level: Optional filter by level (e.g. 'INFO', 'ERROR').
            subsystem: Optional filter by subsystem (e.g. 'Scene', 'Voice', 'AI').
        Returns:
            A JSON-formatted string of log entries.
        """
        import json
        logs = logger.get_tail(limit, level, subsystem)
        return json.dumps([l.model_dump() for l in logs], indent=2)

    @mcp.tool()
    def log_since(timestamp: float, level: Optional[str] = None, subsystem: Optional[str] = None) -> str:
        """
        Fetch all log entries since a given Unix timestamp.
        Args:
            timestamp: The Unix timestamp (e.g. 1700000000.0).
            level: Optional filter by level (e.g. 'INFO', 'ERROR').
            subsystem: Optional filter by subsystem (e.g. 'Scene', 'Voice', 'AI').
        Returns:
            A JSON-formatted string of log entries.
        """
        import json
        logs = logger.get_since(timestamp, level, subsystem)
        return json.dumps([l.model_dump() for l in logs], indent=2)

    return mcp
