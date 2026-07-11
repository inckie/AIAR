/**
 * Responsible for syncing the backend JSON state to Babylon.js scene graph.
 *
 * @wk-id web-frontend
 * @wk-tags typescript, babylonjs, frontend, vr, architecture, hierarchy
 * @wk-categories system-architecture
 *
 * It uses a two-pass architecture to instantiate meshes and then link their parent hierarchies
 * and apply object state (visible, enabled).
 */

import {
    Scene,
    Space,
    Vector3,
    MeshBuilder,
    StandardMaterial,
    Color3,
    HemisphericLight,
    DirectionalLight,
    Node,
    Mesh,
    Light,
    TransformNode,
    SceneLoader as BJSLoader
} from "@babylonjs/core";
import "@babylonjs/loaders/glTF";

import {
    Entity,
    Scene as SceneModel
} from "./types";
import { ScriptManager } from "./ScriptManager";

export class SceneLoader {
    private scene: Scene;
    private entityNodes: Map<string, Node> = new Map();
    private lastEntityData: Map<string, Entity> = new Map();
    public onError?: (msg: string) => void;
    private scriptManager: ScriptManager;

    constructor(scene: Scene, scriptManager: ScriptManager) {
        this.scene = scene;
        this.scriptManager = scriptManager;
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

        // Pass 1: Create and Update entities
        for (const entity of entities) {
            currentIds.add(entity.id);
            if (!this.entityNodes.has(entity.id)) {
                // Create new entity
                const node = this.createEntity(entity);
                if (node) {
                    this.entityNodes.set(entity.id, node);
                    this.lastEntityData.set(entity.id, JSON.parse(JSON.stringify(entity)));
                }
            } else {
                // Update existing entity
                this.updateEntity(this.entityNodes.get(entity.id)!, entity, this.lastEntityData.get(entity.id));
                this.lastEntityData.set(entity.id, JSON.parse(JSON.stringify(entity)));
            }
        }

        // Pass 2: Setup Hierarchy
        for (const entity of entities) {
            const node = this.entityNodes.get(entity.id);
            if (node) {
                if (entity.parent_id && this.entityNodes.has(entity.parent_id)) {
                    node.parent = this.entityNodes.get(entity.parent_id)!;
                } else {
                    node.parent = null;
                }
            }
        }

        // Delete entities that no longer exist in the JSON
        for (const [id, node] of this.entityNodes.entries()) {
            if (!currentIds.has(id)) {
                this.scriptManager.detachAllFromNode(id);
                node.dispose();
                this.entityNodes.delete(id);
                this.lastEntityData.delete(id);
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
                case "gltf":
                    node = new TransformNode(entity.name, this.scene);
                    if (comps.mesh.properties?.url) {
                        BJSLoader.ImportMeshAsync("", "/assets/", comps.mesh.properties.url, this.scene)
                            .then((result) => {
                                // TODO: scale hack
                                if (result.meshes.length > 0) {
                                    result.meshes[0].normalizeToUnitCube();
                                }
                                result.meshes.forEach(m => {
                                    if (!m.parent) {
                                        m.setParent(node);
                                    }
                                });
                            })
                            .catch(err => {
                                console.error(`Failed to load glTF for entity ${entity.id}:`, err);
                                if (this.onError) this.onError(`Failed to load glTF: ${err.message}`);
                            });
                    }
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
        } else {
            // Empty entity (e.g., pivot)
            node = new TransformNode(entity.name, this.scene);
        }

        // If we successfully created a node, apply the rest of the components
        if (node) {
            this.updateEntity(node, entity);
        }

        return node;
    }

    private updateEntity(node: Node, entity: Entity, lastEntity?: Entity) {
        const comps = entity.components;

        // Apply State
        if (entity.enabled !== undefined) {
            node.setEnabled(entity.enabled);
        }
        if (entity.visible !== undefined && node instanceof Mesh) {
            node.isVisible = entity.visible;
        }

        // Apply Scripts
        if (comps.scripts) {
            for (const scriptInfo of comps.scripts) {
                this.scriptManager.attachScript(node, scriptInfo.name, scriptInfo.properties || {});
            }
        }

        // Apply Transform
        if (comps.transform) {
            const lastTransform = lastEntity?.components?.transform;
            const t = comps.transform;
            
            // Only apply if changed from last known server state (or if it's the first time)
            if (!lastTransform || JSON.stringify(lastTransform) !== JSON.stringify(t)) {
                if ((node as any).scaling) {
                    (node as any).scaling = new Vector3(t.scaling[0], t.scaling[1], t.scaling[2]);
                }
                if ((node as any).rotation) {
                    (node as any).rotation = new Vector3(t.rotation[0], t.rotation[1], t.rotation[2]);
                }
                if ((node as any).position) {
                    (node as any).position = new Vector3(t.position[0], t.position[1], t.position[2]);
                }
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
