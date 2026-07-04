import { Engine, Scene, Color3, FreeCamera, Vector3 } from "@babylonjs/core";

export function createBaseScene(canvas: HTMLCanvasElement) {
    const engine = new Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });
    const scene = new Scene(engine);
    
    // Nice dark blue background
    scene.clearColor = new Color3(0.1, 0.1, 0.15).toColor4(1);

    // Camera
    const camera = new FreeCamera("camera1", new Vector3(0, 1.6, -2), scene);
    camera.setTarget(Vector3.Zero());
    camera.attachControl(canvas, true);

    return { engine, scene, camera };
}
