import { Scene, WebXRDefaultExperience, WebXRFeatureName } from "@babylonjs/core";
import { DebugOverlay } from "../ui/DebugOverlay";

export async function initWebXR(scene: Scene, debug: DebugOverlay): Promise<WebXRDefaultExperience | null> {
    debug.log("Scene initialized. Checking WebXR...");
    debug.log("isSecureContext: " + window.isSecureContext);
    debug.log("navigator.xr available: " + !!navigator.xr);

    if (!navigator.xr) {
        debug.log("navigator.xr is undefined! Ensure you are in a secure context (HTTPS) or localhost.");
        return null;
    }

    const supported = await navigator.xr.isSessionSupported("immersive-vr");
    debug.log("immersive-vr supported: " + supported);

    // Initialize WebXR (this adds the "Enter VR" button automatically)
    // For simplicity, createDefaultXRExperienceAsync will find any mesh named "Ground" or default to all meshes.
    const xr = await scene.createDefaultXRExperienceAsync({
        floorMeshes: scene.meshes.filter(m => m.name === "Ground" || m.name.toLowerCase().includes("ground"))
    });

    // Enable explicit Hand Tracking so Babylon properly swaps between controllers and hands
    try {
        xr.baseExperience.featuresManager.enableFeature(WebXRFeatureName.HAND_TRACKING, "latest", {
            xrInput: xr.input,
        });
        debug.log("Hand tracking feature enabled.");
    } catch (err) {
        debug.log("Hand tracking not supported on this device.");
    }

    return xr;
}
