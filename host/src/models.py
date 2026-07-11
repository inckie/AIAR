"""Pydantic models representing the core AIAR entities and components.

:wk-id: supported-scene-objects
:wk-tags: scene, schema, models, pydantic, components, hierarchy
:wk-categories: system-architecture

This module defines the schema for 3D entities, their component state, and scene structure.
Recently added support for parent-child hierarchies (`parent_id`) and object state (`enabled`, `visible`).
"""

from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field


# Component Models
class TransformComponent(BaseModel):
    position: List[float] = [0.0, 0.0, 0.0]
    rotation: List[float] = [0.0, 0.0, 0.0]
    scaling: List[float] = [1.0, 1.0, 1.0]


class MeshComponent(BaseModel):
    type: str  # "box", "sphere", "ground", etc.
    properties: Dict[str, Any] = {}  # { "size": 1, "diameter": 0.5, etc. }


class LightComponent(BaseModel):
    type: str  # "hemispheric", "directional"
    direction: List[float] = [0.0, -1.0, 0.0]
    intensity: float = 1.0
    position: Optional[List[float]] = None  # For directional lights


class MaterialComponent(BaseModel):
    diffuse: List[float] = [1.0, 1.0, 1.0]  # RGB
    emissive: List[float] = [0.0, 0.0, 0.0]
    specular: List[float] = [1.0, 1.0, 1.0]


class ScriptComponent(BaseModel):
    name: str
    properties: Dict[str, Any] = Field(default_factory=dict)


class Components(BaseModel):
    transform: Optional[TransformComponent] = None
    mesh: Optional[MeshComponent] = None
    light: Optional[LightComponent] = None
    material: Optional[MaterialComponent] = None
    scripts: Optional[List[ScriptComponent]] = None


class Entity(BaseModel):
    id: str
    name: str
    parent_id: Optional[str] = None
    enabled: bool = True
    visible: bool = True
    components: Components


class Scene(BaseModel):
    entities: List[Entity] = []
