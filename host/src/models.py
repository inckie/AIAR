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


class Components(BaseModel):
    transform: Optional[TransformComponent] = None
    mesh: Optional[MeshComponent] = None
    light: Optional[LightComponent] = None
    material: Optional[MaterialComponent] = None


class Entity(BaseModel):
    id: str
    name: str
    components: Components


class Scene(BaseModel):
    entities: List[Entity] = []
