import { SceneLoader } from "./model/SceneLoader";
import { ScriptManager } from "./model/ScriptManager";
import { createBaseScene } from "./core/EngineSetup";
import { initWebXR } from "./core/WebXRSetup";
import { DebugOverlay } from "./ui/DebugOverlay";
import { VRPopup } from "./ui/VRPopup";
import { VoiceCommandManager } from "./interaction/VoiceCommandManager";
import { WristMenu } from "./ui/WristMenu";
import { Logger } from "./core/Logger";

const browserLogger = new Logger("Browser");

window.addEventListener('error', (event) => {
    browserLogger.error(`Uncaught error: ${event.message} at ${event.filename}:${event.lineno}`);
});

window.addEventListener('unhandledrejection', (event) => {
    browserLogger.error(`Unhandled promise rejection: ${event.reason}`);
});

console.error = (...args: any[]) => {
    const msg = args.map(a => {
        if (typeof a === 'object') {
            try { return JSON.stringify(a); } catch (e) { return String(a); }
        }
        return String(a);
    }).join(' ');
    browserLogger.error(`Console Error: ${msg}`);
};

const canvas = document.getElementById("renderCanvas") as HTMLCanvasElement;

const init = async () => {
    // 1. Setup Base Engine & Scene
    const { engine, scene } = createBaseScene(canvas);
    const debug = new DebugOverlay();
    
    // 2. Setup Data-Driven Scene Loader
    const scriptManager = new ScriptManager();
    const sceneLoader = new SceneLoader(scene, scriptManager);
    
    // 3. Setup Error Handling
    const vrPopup = new VRPopup(scene, null as any); // We will update xr later
    sceneLoader.onError = (msg: string) => {
        debug.log(msg);
        vrPopup.show(msg);
    };

    // 4. Initial fetch and Polling loop
    await sceneLoader.fetchAndUpdateScene();
    setInterval(() => {
        sceneLoader.fetchAndUpdateScene();
    }, 2000);

    // 5. Setup WebXR
    const xr = await initWebXR(scene, debug);
    if (!xr) {
        debug.log("Could not initialize XR. Running in 2D mode.");
    } else {
        // Update popup with real XR instance
        (vrPopup as any).xr = xr;
        
        // 6. Setup Interaction & UI
        const voiceManager = new VoiceCommandManager(scene, xr, debug, vrPopup);
        const wristMenu = new WristMenu(scene, xr, voiceManager);
    }

    // 7. Start Render Loop
    engine.runRenderLoop(() => {
        scriptManager.update(engine.getDeltaTime() / 1000.0);
        scene.render();
    });

    window.addEventListener("resize", () => {
        engine.resize();
    });
};

init();
