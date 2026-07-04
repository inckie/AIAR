import {
    Engine,
    Scene,
    Vector3,
    HemisphericLight,
    MeshBuilder,
    FreeCamera,
    StandardMaterial,
    Color3,
    DirectionalLight,
    ShadowGenerator,
    WebXRFeatureName
} from "@babylonjs/core";
import { AdvancedDynamicTexture, Button, Grid } from "@babylonjs/gui";
import * as GUI from "@babylonjs/gui";

const canvas = document.getElementById("renderCanvas") as HTMLCanvasElement;

const engine = new Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });

const createScene = async function () {
    const scene = new Scene(engine);
    
    // Nice dark blue background
    scene.clearColor = new Color3(0.1, 0.1, 0.15).toColor4(1);

    // Camera
    const camera = new FreeCamera("camera1", new Vector3(0, 1.6, -2), scene);
    camera.setTarget(Vector3.Zero());
    camera.attachControl(canvas, true);

    // Lighting
    const light = new HemisphericLight("light1", new Vector3(0, 1, 0), scene);
    light.intensity = 0.5;

    const dirLight = new DirectionalLight("dirLight", new Vector3(-1, -2, -1), scene);
    dirLight.position = new Vector3(20, 40, 20);
    dirLight.intensity = 0.8;
    
    const shadowGenerator = new ShadowGenerator(1024, dirLight);

    // Ground
    const ground = MeshBuilder.CreateGround("ground", { width: 10, height: 10 }, scene);
    const groundMat = new StandardMaterial("groundMat", scene);
    groundMat.diffuseColor = new Color3(0.2, 0.2, 0.2);
    groundMat.specularColor = new Color3(0, 0, 0);
    ground.material = groundMat;
    ground.receiveShadows = true;

    // A nice glowing sphere
    const sphere = MeshBuilder.CreateSphere("sphere", { diameter: 0.5 }, scene);
    sphere.position.y = 1;
    const sphereMat = new StandardMaterial("sphereMat", scene);
    sphereMat.emissiveColor = new Color3(0.2, 0.5, 1.0);
    sphereMat.diffuseColor = new Color3(0.1, 0.2, 0.5);
    sphere.material = sphereMat;
    shadowGenerator.addShadowCaster(sphere);

    // A box
    const box = MeshBuilder.CreateBox("box", { size: 0.4 }, scene);
    box.position = new Vector3(1, 0.2, 0);
    const boxMat = new StandardMaterial("boxMat", scene);
    boxMat.diffuseColor = new Color3(1.0, 0.4, 0.1);
    box.material = boxMat;
    // Create a debug overlay so we can see errors on the headset
    const debugDiv = document.createElement("div");
    debugDiv.style.position = "absolute";
    debugDiv.style.top = "10px";
    debugDiv.style.left = "10px";
    debugDiv.style.color = "white";
    debugDiv.style.fontFamily = "monospace";
    debugDiv.style.zIndex = "100";
    debugDiv.style.pointerEvents = "none";
    document.body.appendChild(debugDiv);
    const log = (msg: string) => { debugDiv.innerHTML += msg + "<br/>"; };

    log("Scene initialized. Checking WebXR...");
    log("isSecureContext: " + window.isSecureContext);
    log("navigator.xr available: " + !!navigator.xr);

    // Initialize WebXR (this adds the "Enter VR" button automatically)
    try {
        if (!navigator.xr) {
            log("navigator.xr is undefined!");
        } else {
            const supported = await navigator.xr.isSessionSupported("immersive-vr");
            log("immersive-vr supported: " + supported);
        }

        const xr = await scene.createDefaultXRExperienceAsync({
            floorMeshes: [ground]
        });

        // Enable explicit Hand Tracking so Babylon properly swaps between controllers and hands
        let handFeature: any;
        try {
            handFeature = xr.baseExperience.featuresManager.enableFeature(WebXRFeatureName.HAND_TRACKING, "latest", {
                xrInput: xr.input,
            });
            log("Hand tracking feature enabled.");
        } catch (err) {
            log("Hand tracking not supported on this device.");
        }
        
        // Voice recording state
        let isRecording = false;
        let mediaRecorder: MediaRecorder | null = null;
        let audioChunks: Blob[] = [];
        let voiceBtn: Button | null = null;

        const toggleRecording = async () => {
            if (!voiceBtn) return;
            if (isRecording) {
                if (mediaRecorder) {
                    mediaRecorder.stop();
                }
                isRecording = false;
                voiceBtn.background = "green";
                if (voiceBtn.textBlock) voiceBtn.textBlock.text = "Voice Command";
            } else {
                try {
                    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                    mediaRecorder = new MediaRecorder(stream);
                    audioChunks = [];
                    
                    mediaRecorder.ondataavailable = (e) => {
                        if (e.data.size > 0) audioChunks.push(e.data);
                    };
                    
                    mediaRecorder.onstop = () => {
                        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                        log("Audio recorded: " + audioBlob.size + " bytes");
                        stream.getTracks().forEach(track => track.stop());
                    };
                    
                    mediaRecorder.start();
                    isRecording = true;
                    voiceBtn.background = "red";
                    if (voiceBtn.textBlock) voiceBtn.textBlock.text = "Recording...";
                    log("Recording started...");
                } catch (err: any) {
                    log("Mic error: " + err.message);
                }
            }
        };

        // Wrist Menu implementation
        xr.input.onControllerAddedObservable.add((controller) => {
            // Right controller: bind hardware button
            if (controller.inputSource.handedness === "right") {
                controller.onMotionControllerInitObservable.add((motionController) => {
                    const aButton = motionController.getComponent("a-button");
                    if (aButton) {
                        aButton.onButtonStateChangedObservable.add((component) => {
                            if (component.changes.pressed && component.pressed) {
                                toggleRecording();
                            }
                        });
                    }
                });
            }

            // Left controller: attach wrist menu
            if (controller.inputSource.handedness === "left" || controller.inputSource.handedness === "none") {
                // sideOrientation: 2 is Mesh.DOUBLESIDE to ensure it's visible from both sides
                const wristMenu = MeshBuilder.CreatePlane("wristMenu", { width: 0.2, height: 0.2, sideOrientation: 2 }, scene);
                
                // Attach to the pointer node which is guaranteed to exist
                wristMenu.setParent(controller.pointer);
                
                // Position it above the controller/hand (restored original location)
                wristMenu.position = new Vector3(0, 0.15, -0.1);
                wristMenu.rotation = new Vector3(Math.PI / 4, 0, 0);

                const advancedTexture = AdvancedDynamicTexture.CreateForMesh(wristMenu);
                
                const grid = new GUI.Grid();
                grid.width = "100%";
                grid.height = "100%";
                grid.addRowDefinition(0.5);
                grid.addRowDefinition(0.5);
                advancedTexture.addControl(grid);

                voiceBtn = Button.CreateSimpleButton("voiceBtn", "Voice Command");
                voiceBtn.width = 1;
                voiceBtn.height = 1; // 100% of the grid cell
                voiceBtn.color = "white";
                voiceBtn.background = "green";
                voiceBtn.fontSize = 80;
                voiceBtn.onPointerUpObservable.add(() => toggleRecording());
                grid.addControl(voiceBtn, 0, 0); // row 0

                const exitBtn = Button.CreateSimpleButton("exitBtn", "Exit VR");
                exitBtn.width = 1;
                exitBtn.height = 1; // 100% of the grid cell
                exitBtn.color = "white";
                exitBtn.background = "darkred";
                exitBtn.fontSize = 80;
                
                exitBtn.onPointerUpObservable.add(() => {
                    xr.baseExperience.exitXRAsync();
                });
                grid.addControl(exitBtn, 1, 0); // row 1
                
                log("Wrist menu attached.");
            }
        });

        // Automatically hide hands if physical controllers are present
        scene.onBeforeRenderObservable.add(() => {
            let hasPhysicalController = false;
            // Check if any non-hand controllers are currently active
            xr.input.controllers.forEach(c => {
                // If it doesn't have an inputSource.hand, it's a physical controller
                if (c.inputSource && !c.inputSource.hand) {
                    hasPhysicalController = true;
                }
            });

            // Toggle visibility of hand input sources
            xr.input.controllers.forEach(c => {
                if (c.inputSource && c.inputSource.hand) {
                    if (c.pointer) {
                        // Hide the pointer node so its duplicate wrist menu hides
                        c.pointer.setEnabled(!hasPhysicalController);
                    }
                }
            });

            // Brute-force: hide all meshes and transform nodes that look like a hand model
            scene.transformNodes.forEach(t => {
                const name = t.name.toLowerCase();
                if (name.includes("hand") && !name.includes("controller") && !name.includes("wristmenu")) {
                    t.setEnabled(!hasPhysicalController);
                }
            });
            
            scene.meshes.forEach(m => {
                const name = m.name.toLowerCase();
                if (name.includes("hand") && !name.includes("controller") && !name.includes("wristmenu")) {
                    m.setEnabled(!hasPhysicalController);
                }
            });
        });

        log("WebXR initialized successfully.");
    } catch (e: any) {
        log("WebXR Error: " + e.message);
        console.warn("WebXR initialization failed.", e);
    }

    return scene;
};

createScene().then(scene => {
    engine.runRenderLoop(() => {
        scene.render();
    });
});

window.addEventListener("resize", () => {
    engine.resize();
});
