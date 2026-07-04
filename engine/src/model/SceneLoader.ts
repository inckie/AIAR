import {
    Scene,
    Vector3,
    MeshBuilder,
    StandardMaterial,
    Color3,
    HemisphericLight,
    DirectionalLight,
    Node,
    Mesh,
    Light
} from "@babylonjs/core";

import {
    Entity,
    Scene as SceneModel
} from "./types";

export class SceneLoader {
    private scene: Scene;
    private entityNodes: Map<string, Node> = new Map();
    public onError?: (msg: string) => void;

    constructor(scene: Scene) {
        this.scene = scene;
    }

    public async fetchAndUpdateScene() {
        try {
            const response = await fetch("/api/scene");
            if (!response.ok) throw new Error("Failed to fetch scene");
            
            const text = await response.text();
            let sceneData: SceneModel;
            try {
                sceneData = JSON.parse(text);
            } catch (parseErr: any) {
                const msg = "JSON Parse Error: " + parseErr.message;
                console.error(msg);
                if (this.onError) this.onError(msg);
                return;
            }
            
            this.applySceneData(sceneData);
        } catch (err: any) {
            console.error("Error fetching scene:", err);
            if (this.onError) this.onError("Fetch Error: " + err.message);
        }
    }

    private applySceneData(sceneData: SceneModel) {
        const currentIds = new Set<string>();
        const entities = sceneData.entities || [];

        for (const entity of entities) {
            currentIds.add(entity.id);
            if (!this.entityNodes.has(entity.id)) {
                // Create new entity
                const node = this.createEntity(entity);
                if (node) {
                    this.entityNodes.set(entity.id, node);
                }
            } else {
                // Update existing entity
                this.updateEntity(this.entityNodes.get(entity.id)!, entity);
            }
        }

        // Delete entities that no longer exist in the JSON
        for (const [id, node] of this.entityNodes.entries()) {
            if (!currentIds.has(id)) {
                node.dispose();
                this.entityNodes.delete(id);
            }
        }
    }

    private createEntity(entity: Entity): Node | null {
        let node: Node | null = null;
        const comps = entity.components;

        // Create base node depending on whether it's a mesh or a light
        if (comps.mesh) {
            switch (comps.mesh.type) {
                case "box":
                    node = MeshBuilder.CreateBox(entity.name, comps.mesh.properties, this.scene);
                    break;
                case "sphere":
                    node = MeshBuilder.CreateSphere(entity.name, comps.mesh.properties, this.scene);
                    break;
                case "ground":
                    node = MeshBuilder.CreateGround(entity.name, comps.mesh.properties, this.scene);
                    if (node instanceof Mesh) node.receiveShadows = true; // Hardcoded default for now
                    break;
                default:
                    const msg = `Unsupported mesh type: ${comps.mesh.type} for entity ${entity.id}`;
                    console.error(msg);
                    if (this.onError) this.onError(msg);
                    break;
            }
        } else if (comps.light) {
            switch (comps.light.type) {
                case "hemispheric":
                    node = new HemisphericLight(
                        entity.name, 
                        new Vector3(comps.light.direction[0], comps.light.direction[1], comps.light.direction[2]), 
                        this.scene
                    );
                    break;
                case "directional":
                    node = new DirectionalLight(
                        entity.name,
                        new Vector3(comps.light.direction[0], comps.light.direction[1], comps.light.direction[2]),
                        this.scene
                    );
                    break;
                default:
                    const msg = `Unsupported light type: ${comps.light.type} for entity ${entity.id}`;
                    console.error(msg);
                    if (this.onError) this.onError(msg);
                    break;
            }
        }

        // If we successfully created a node, apply the rest of the components
        if (node) {
            this.updateEntity(node, entity);
        }
        
        return node;
    }

    private updateEntity(node: Node, entity: Entity) {
        const comps = entity.components;

        // Apply Transform
        if (comps.transform) {
            if ((node as any).position) {
                (node as any).position = new Vector3(comps.transform.position[0], comps.transform.position[1], comps.transform.position[2]);
            }
            if ((node as any).rotation) {
                (node as any).rotation = new Vector3(comps.transform.rotation[0], comps.transform.rotation[1], comps.transform.rotation[2]);
            }
            if ((node as any).scaling) {
                (node as any).scaling = new Vector3(comps.transform.scaling[0], comps.transform.scaling[1], comps.transform.scaling[2]);
            }
        }

        // Apply Light specific properties
        if (comps.light && node instanceof Light) {
            node.intensity = comps.light.intensity;
            if (node instanceof DirectionalLight) {
                node.direction = new Vector3(comps.light.direction[0], comps.light.direction[1], comps.light.direction[2]);
            }
            if (comps.light.position && (node as any).position) {
                (node as any).position = new Vector3(comps.light.position[0], comps.light.position[1], comps.light.position[2]);
            }
        }

        // Apply Material
        if (comps.material && node instanceof Mesh) {
            let mat = node.material as StandardMaterial;
            if (!mat) {
                mat = new StandardMaterial(entity.name + "_mat", this.scene);
                node.material = mat;
            }
            mat.diffuseColor = new Color3(comps.material.diffuse[0], comps.material.diffuse[1], comps.material.diffuse[2]);
            mat.emissiveColor = new Color3(comps.material.emissive[0], comps.material.emissive[1], comps.material.emissive[2]);
            mat.specularColor = new Color3(comps.material.specular[0], comps.material.specular[1], comps.material.specular[2]);
        }
    }
}
