import os
import json
from typing import Optional
from .models import (
    Scene,
    Entity,
    Components,
    TransformComponent,
    MeshComponent,
    LightComponent,
    MaterialComponent,
)
from .logger import get_logger


class SceneManager:
    def __init__(self, root_dir: str):
        self.scene_dir = os.path.join(root_dir, "projects", "default", "scenes")
        self.scene_file = os.path.join(self.scene_dir, "scene.json")
        self.scene: Scene = Scene()
        self.undo_stack = []

        self._ensure_scene_exists()

    def _ensure_scene_exists(self):
        os.makedirs(self.scene_dir, exist_ok=True)

        if not os.path.exists(self.scene_file):
            self._create_default_scene()
            self.save_scene()
        else:
            self.load_scene()

    def _create_default_scene(self):
        # Recreate the hardcoded welcome scene
        self.scene.entities = [
            Entity(
                id="light1",
                name="MainHemisphericLight",
                components=Components(
                    transform=TransformComponent(),
                    light=LightComponent(
                        type="hemispheric", direction=[0, 1, 0], intensity=0.5
                    ),
                ),
            ),
            Entity(
                id="dirLight",
                name="DirectionalLight",
                components=Components(
                    transform=TransformComponent(position=[20, 40, 20]),
                    light=LightComponent(
                        type="directional", direction=[-1, -2, -1], intensity=0.8
                    ),
                ),
            ),
            Entity(
                id="ground1",
                name="Ground",
                components=Components(
                    transform=TransformComponent(),
                    mesh=MeshComponent(
                        type="ground", properties={"width": 10, "height": 10}
                    ),
                    material=MaterialComponent(
                        diffuse=[0.2, 0.2, 0.2], specular=[0, 0, 0]
                    ),
                ),
            ),
            Entity(
                id="sphere1",
                name="GlowingSphere",
                components=Components(
                    transform=TransformComponent(position=[0, 1, 0]),
                    mesh=MeshComponent(type="sphere", properties={"diameter": 0.5}),
                    material=MaterialComponent(
                        diffuse=[0.1, 0.2, 0.5], emissive=[0.2, 0.5, 1.0]
                    ),
                ),
            ),
            Entity(
                id="box1",
                name="OrangeBox",
                components=Components(
                    transform=TransformComponent(position=[1, 0.2, 0]),
                    mesh=MeshComponent(type="box", properties={"size": 0.4}),
                    material=MaterialComponent(diffuse=[1.0, 0.4, 0.1]),
                ),
            ),
        ]

    def load_scene(self):
        try:
            with open(self.scene_file, "r") as f:
                data = json.load(f)
                self.scene = Scene(**data)
        except Exception as e:
            get_logger().error("Scene", f"Error loading scene: {e}")
            print(f"Error loading scene: {e}")
            self.scene = Scene()

    def save_scene(self):
        try:
            with open(self.scene_file, "w") as f:
                json.dump(self.scene.model_dump(), f, indent=2)
        except Exception as e:
            get_logger().error("Scene", f"Error saving scene: {e}")
            print(f"Error saving scene: {e}")

    def get_scene_json(self) -> dict:
        # Load from disk every time so manual file edits are reflected instantly
        self.load_scene()
        return self.scene.model_dump()

    def _push_undo(self):
        self.undo_stack.append(self.scene.model_dump())
        if len(self.undo_stack) > 50:
            self.undo_stack.pop(0)

    def add_entity(self, entity: Entity):
        self.load_scene()
        self._push_undo()
        self.scene.entities.append(entity)
        self.save_scene()
        get_logger().info("Scene", f"Added entity '{entity.id}' ({entity.name})")

    def remove_entity(self, entity_id: str) -> bool:
        self.load_scene()

        # Check if entity exists
        exists = any(e.id == entity_id for e in self.scene.entities)
        if not exists:
            get_logger().warning(
                "Scene", f"Failed to remove entity '{entity_id}' (not found)"
            )
            return False

        self._push_undo()
        self.scene.entities = [e for e in self.scene.entities if e.id != entity_id]
        self.save_scene()
        get_logger().info("Scene", f"Removed entity '{entity_id}'")
        return True

    def undo(self) -> bool:
        if not self.undo_stack:
            get_logger().warning("Scene", "Undo failed: Nothing to undo.")
            return False
        prev_state = self.undo_stack.pop()
        self.scene = Scene(**prev_state)
        self.save_scene()
        get_logger().info("Scene", "Undid last action.")
        return True

    def update_entity(self, entity_id: str, updates: dict) -> bool:
        self.load_scene()

        entity = None
        for e in self.scene.entities:
            if e.id == entity_id:
                entity = e
                break

        if not entity:
            get_logger().warning(
                "Scene", f"Failed to update entity '{entity_id}' (not found)"
            )
            return False

        self._push_undo()

        entity_dict = entity.model_dump()

        def deep_merge(d1, d2):
            for k, v in d2.items():
                if isinstance(v, dict) and k in d1 and isinstance(d1[k], dict):
                    deep_merge(d1[k], v)
                else:
                    d1[k] = v

        deep_merge(entity_dict, updates)

        try:
            updated_entity = Entity(**entity_dict)
            for i, e in enumerate(self.scene.entities):
                if e.id == entity_id:
                    self.scene.entities[i] = updated_entity
                    break
            self.save_scene()
            get_logger().info("Scene", f"Updated entity '{entity_id}'")
            return True
        except Exception as e:
            get_logger().error(
                "Scene", f"Failed to validate updated entity '{entity_id}': {e}"
            )
            if self.undo_stack:
                self.undo_stack.pop()
            return False

    def get_entity_by_name(self, name: str) -> Optional[Entity]:
        self.load_scene()
        for e in self.scene.entities:
            if e.name == name or e.name.lower() == name.lower():
                return e
        return None
