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
    WebXRFeatureName,
    WebXRState,
    Ray
} from "@babylonjs/core";
import { AdvancedDynamicTexture, Button, Grid } from "@babylonjs/gui";
import * as GUI from "@babylonjs/gui";
import { SceneLoader } from "./model/SceneLoader";

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

    // Dynamic Component Object Model Scene Loader
    const sceneLoader = new SceneLoader(scene);
    
    // We do an initial fetch to populate the scene before entering VR
    await sceneLoader.fetchAndUpdateScene();

    // Set up a polling loop to automatically reflect changes in scene.json every 2 seconds
    setInterval(() => {
        sceneLoader.fetchAndUpdateScene();
    }, 2000);
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

        // Since the ground is now dynamic, we let Babylon infer the floor or we find it manually.
        // For simplicity, createDefaultXRExperienceAsync will find any mesh named "Ground".
        const xr = await scene.createDefaultXRExperienceAsync({
            floorMeshes: scene.meshes.filter(m => m.name === "Ground")
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

        const showVRPopup = (message: string) => {
            const popup = MeshBuilder.CreatePlane("vrPopup", { width: 1, height: 0.3 }, scene);
            // Attach to camera so it follows the user's view (HUD style)
            if (xr.baseExperience.camera) {
                popup.setParent(xr.baseExperience.camera);
                // Position it slightly down and forward
                popup.position = new Vector3(0, -0.4, 0.8);
                // Rotate to face up towards the user (positive X rotation tilts normal upwards)
                popup.rotation = new Vector3(Math.PI / 6, 0, 0);
            }
            
            const popupTex = AdvancedDynamicTexture.CreateForMesh(popup);
            const rect = new GUI.Rectangle();
            rect.background = "rgba(0,0,0,0.7)";
            rect.color = "cyan";
            rect.thickness = 2;
            
            const textBlock = new GUI.TextBlock();
            textBlock.text = message;
            textBlock.color = "white";
            textBlock.fontSize = 50;
            textBlock.textWrapping = true;
            rect.addControl(textBlock);
            
            popupTex.addControl(rect);
            
            // Auto-dispose after 5 seconds
            setTimeout(() => {
                popup.dispose();
                popupTex.dispose();
            }, 5000);
        };

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
                    
                    mediaRecorder.onstop = async () => {
                        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                        log("Sending audio: " + audioBlob.size + " bytes");
                        stream.getTracks().forEach(track => track.stop());

                        // Gather Spatial Context
                        const context = {
                            head: {
                                position: xr.baseExperience.camera.position.asArray(),
                                direction: xr.baseExperience.camera.getForwardRay().direction.asArray()
                            },
                            intersection: null as any
                        };

                        xr.input.controllers.forEach(c => {
                            if (c.inputSource.handedness === "right" && c.pointer) {
                                const ray = new Ray(c.pointer.position, c.pointer.forward, 100);
                                const pick = scene.pickWithRay(ray);
                                if (pick && pick.hit && pick.pickedMesh) {
                                    context.intersection = {
                                        point: pick.pickedPoint?.asArray(),
                                        meshName: pick.pickedMesh.name,
                                        distance: pick.distance
                                    };
                                }
                            }
                        });

                        const formData = new FormData();
                        formData.append("file", audioBlob, "recording.webm");
                        formData.append("context", JSON.stringify(context));
                        
                        try {
                            const res = await fetch("/api/voice/transcribe", {
                                method: "POST",
                                body: formData
                            });
                            const data = await res.json();
                            if (data.text) {
                                log("Recognized: " + data.text);
                                let popupMsg = '"' + data.text + '"';
                                if (data.action_response) {
                                    popupMsg += "\n\nSystem: " + data.action_response;
                                }
                                showVRPopup(popupMsg);

                                // Hardcoded system commands
                                const txt = data.text.toLowerCase();
                                if (txt.includes("exit vr") || txt.includes("exit immersion")) {
                                    setTimeout(() => {
                                        xr.baseExperience.exitXRAsync();
                                    }, 1500); // Short delay to let the user read the popup
                                }
                            } else if (data.error) {
                                log("Error: " + data.error);
                                showVRPopup("Error: " + data.error);
                            }
                        } catch (err: any) {
                            log("Transcribe err: " + err.message);
                            showVRPopup("Transcribe Error: " + err.message);
                        }
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
                
                // Position it closer to the hand
                wristMenu.position = new Vector3(0, 0.05, -0.05);
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

        // Welcome message on XR entry
        xr.baseExperience.onStateChangedObservable.add((state) => {
            if (state === WebXRState.IN_XR) {
                // Short delay to let camera settle
                setTimeout(() => {
                    showVRPopup("Welcome to AIAR! Voice commands ready.");
                }, 1000);
            }
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
