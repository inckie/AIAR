/**
 * :wk-id: script-manager
 * :wk-tags: typescript, babylonjs, frontend, script, manager, lifecycle
 * :wk-categories: system-architecture
 *
 * Coordinates loading, initialization, update loops, and cleanup of custom entity scripts.
 */
import { Node, AbstractMesh, ActionManager, ExecuteCodeAction } from "@babylonjs/core";

export interface ScriptInstance {
    Start?: () => void;
    Update?: (deltaTime: number) => void;
    OnEnable?: () => void;
    OnDisable?: () => void;
    OnDestroy?: () => void;
    OnClick?: () => void;
}

export class ScriptManager {
    private activeScripts: Set<ScriptInstance> = new Set();
    private nodeScriptMap: Map<string, Map<string, ScriptInstance>> = new Map();

    public async attachScript(node: Node, scriptName: string, properties: any) {
        if (!this.nodeScriptMap.has(node.id)) {
            this.nodeScriptMap.set(node.id, new Map());
        }
        
        const nodeScripts = this.nodeScriptMap.get(node.id)!;
        if (nodeScripts.has(scriptName)) {
            // Already attached, maybe update properties? For now skip.
            return;
        }

        try {
            // Dynamically import the script from the static endpoint
            const module = await import(/* @vite-ignore */ "/scripts/" + scriptName);
            const ScriptClass = module.default;

            if (!ScriptClass) {
                console.error(`Script ${scriptName} does not export a default class.`);
                return;
            }

            const instance = new ScriptClass(node, properties) as ScriptInstance;
            
            // Register
            this.activeScripts.add(instance);
            nodeScripts.set(scriptName, instance);

            // Lifecycle bindings
            if (instance.Start) {
                instance.Start();
            }

            // Click interaction binding
            if (instance.OnClick && node instanceof AbstractMesh) {
                if (!node.actionManager) {
                    node.actionManager = new ActionManager(node.getScene());
                }
                node.actionManager.registerAction(
                    new ExecuteCodeAction(
                        ActionManager.OnPickTrigger,
                        () => { instance.OnClick!(); }
                    )
                );
            }

            // Babylon.js specific lifecycle hooks
            node.onEnabledStateChangedObservable.add((enabled) => {
                if (enabled && instance.OnEnable) instance.OnEnable();
                else if (!enabled && instance.OnDisable) instance.OnDisable();
            });

            node.onDisposeObservable.add(() => {
                if (instance.OnDestroy) instance.OnDestroy();
                this.activeScripts.delete(instance);
                const scripts = this.nodeScriptMap.get(node.id);
                if (scripts) {
                    scripts.delete(instance);
                }
            });

        } catch (err) {
            console.error(`Failed to load or instantiate script ${scriptName}:`, err);
        }
    }

    public update(deltaTimeSeconds: number) {
        for (const script of this.activeScripts) {
            if (script.Update) {
                script.Update(deltaTimeSeconds);
            }
        }
    }

    public detachAllFromNode(nodeId: string) {
        const scripts = this.nodeScriptMap.get(nodeId);
        if (scripts) {
            for (const script of scripts.values()) {
                if (script.OnDestroy) script.OnDestroy();
                this.activeScripts.delete(script);
            }
            this.nodeScriptMap.delete(nodeId);
        }
    }
}
