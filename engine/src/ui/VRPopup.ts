import { Scene, WebXRDefaultExperience, MeshBuilder, Vector3 } from "@babylonjs/core";
import { AdvancedDynamicTexture, Rectangle, TextBlock } from "@babylonjs/gui";

export class VRPopup {
    private scene: Scene;
    private xr: WebXRDefaultExperience;

    constructor(scene: Scene, xr: WebXRDefaultExperience) {
        this.scene = scene;
        this.xr = xr;
    }

    public show(message: string, durationMs: number = 5000) {
        const popup = MeshBuilder.CreatePlane("vrPopup", { width: 1, height: 0.3 }, this.scene);
        
        // Attach to camera so it follows the user's view (HUD style)
        if (this.xr.baseExperience.camera) {
            popup.setParent(this.xr.baseExperience.camera);
            // Position it slightly down and forward
            popup.position = new Vector3(0, -0.4, 0.8);
            // Rotate to face up towards the user (positive X rotation tilts normal upwards)
            popup.rotation = new Vector3(Math.PI / 6, 0, 0);
        }
        
        const popupTex = AdvancedDynamicTexture.CreateForMesh(popup);
        const rect = new Rectangle();
        rect.background = "rgba(0,0,0,0.7)";
        rect.color = "cyan";
        rect.thickness = 2;
        
        const textBlock = new TextBlock();
        textBlock.text = message;
        textBlock.color = "white";
        textBlock.fontSize = 50;
        textBlock.textWrapping = true;
        rect.addControl(textBlock);
        
        popupTex.addControl(rect);
        
        // Auto-dismiss
        setTimeout(() => {
            popup.dispose();
            popupTex.dispose();
        }, durationMs);
    }
}
