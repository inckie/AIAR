import abc
import json
import uuid
import random
from typing import Dict, Any
from .scene_manager import SceneManager, Entity, Components, TransformComponent, MeshComponent, MaterialComponent

class AbstractCommandProcessor(abc.ABC):
    def __init__(self, scene_manager: SceneManager):
        self.scene_manager = scene_manager
        
    @abc.abstractmethod
    def process(self, text: str, context: Dict[str, Any]) -> str:
        """
        Processes the transcribed text and spatial context, mutating the scene if needed.
        Returns a response string to be displayed in the VR HUD.
        """
        pass

class HardcodedCommandProcessor(AbstractCommandProcessor):
    def process(self, text: str, context: Dict[str, Any]) -> str:
        text = text.lower()
        
        # Determine spawn position
        head = context.get("head", {})
        h_pos = head.get("position", [0, 1.6, 0])
        h_dir = head.get("direction", [0, 0, 1])
        
        spawn_pos = [
            h_pos[0] + h_dir[0] * 1.5,
            h_pos[1] + h_dir[1] * 1.5,
            h_pos[2] + h_dir[2] * 1.5
        ]
        
        intersection = context.get("intersection")
        target_mesh_name = None
        if intersection and intersection.get("point"):
            spawn_pos = intersection["point"]
            target_mesh_name = intersection.get("meshName")
        
        # Intent: ADD
        if "add" in text or "create" in text:
            shape = "box" if "box" in text else ("sphere" if "sphere" in text else None)
            if shape:
                entity_id = f"{shape}_{uuid.uuid4().hex[:6]}"
                color = [random.random(), random.random(), random.random()]
                
                # Nudge up slightly so it doesn't clip into the ground
                spawn_pos[1] += 0.2
                
                props = {"size": 0.4} if shape == "box" else {"diameter": 0.4}
                
                entity = Entity(
                    id=entity_id,
                    name=entity_id,
                    components=Components(
                        transform=TransformComponent(position=spawn_pos),
                        mesh=MeshComponent(type=shape, properties=props),
                        material=MaterialComponent(diffuse=color)
                    )
                )
                self.scene_manager.add_entity(entity)
                return f"Added {shape}."
            return "Could not understand what to add."
            
        # Intent: REMOVE
        if "remove" in text or "delete" in text:
            if "this" in text or "it" in text:
                if target_mesh_name:
                    if target_mesh_name == "Ground":
                        return "Cannot remove the ground."
                    
                    entity = self.scene_manager.get_entity_by_name(target_mesh_name)
                    if entity:
                        self.scene_manager.remove_entity(entity.id)
                        return f"Removed {target_mesh_name}."
                    else:
                        return f"Could not find entity {target_mesh_name}."
                else:
                    return "You are not pointing at anything to remove."
            
            # Remove by explicit name match
            for e in self.scene_manager.scene.entities:
                if e.name.lower() in text and e.name != "Ground":
                    self.scene_manager.remove_entity(e.id)
                    return f"Removed {e.name}."
                    
            return "Could not understand what to remove."

        return "Command not recognized."
