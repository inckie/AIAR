import { Scene, WebXRDefaultExperience, MeshBuilder, Vector3 } from "@babylonjs/core";
import { AdvancedDynamicTexture, Button, Grid, Control } from "@babylonjs/gui";
import { VoiceCommandManager } from "../interaction/VoiceCommandManager";

export class WristMenu {
    private scene: Scene;
    private xr: WebXRDefaultExperience;
    private voiceManager: VoiceCommandManager;

    constructor(scene: Scene, xr: WebXRDefaultExperience, voiceManager: VoiceCommandManager) {
        this.scene = scene;
        this.xr = xr;
        this.voiceManager = voiceManager;
        this.init();
    }

    private init() {
        this.xr.input.onControllerAddedObservable.add((controller) => {
            // Right controller: bind hardware button
            if (controller.inputSource.handedness === "right") {
                controller.onMotionControllerInitObservable.add((motionController) => {
                    const aButton = motionController.getComponent("a-button");
                    if (aButton) {
                        aButton.onButtonStateChangedObservable.add((component) => {
                            if (component.changes.pressed && component.pressed) {
                                this.voiceManager.toggleRecording();
                            }
                        });
                    }
                });
            }

            // Left controller: attach wrist menu
            if (controller.inputSource.handedness === "left" || controller.inputSource.handedness === "none") {
                // sideOrientation: 2 is Mesh.DOUBLESIDE
                const wristMenu = MeshBuilder.CreatePlane("wristMenu", { width: 0.2, height: 0.2, sideOrientation: 2 }, this.scene);
                
                // Attach to the pointer node
                wristMenu.setParent(controller.pointer);
                
                // Position it closer to the hand
                wristMenu.position = new Vector3(0, 0.05, -0.05);
                wristMenu.rotation = new Vector3(Math.PI / 4, 0, 0);

                const advancedTexture = AdvancedDynamicTexture.CreateForMesh(wristMenu);
                
                const grid = new Grid();
                grid.width = "100%";
                grid.height = "100%";
                grid.addRowDefinition(0.5, false);
                grid.addRowDefinition(0.5, false);
                advancedTexture.addControl(grid);
                
                const voiceBtn = Button.CreateSimpleButton("voiceBtn", "Voice Command");
                voiceBtn.width = "80%";
                voiceBtn.height = "40%";
                voiceBtn.color = "white";
                voiceBtn.background = "green";
                voiceBtn.thickness = 2;
                if (voiceBtn.textBlock) {
                    voiceBtn.textBlock.fontSize = 24;
                }
                
                voiceBtn.onPointerUpObservable.add(() => {
                    this.voiceManager.toggleRecording();
                });
                
                grid.addControl(voiceBtn, 0, 0);

                const exitBtn = Button.CreateSimpleButton("exitBtn", "Exit VR");
                exitBtn.width = "80%";
                exitBtn.height = "40%";
                exitBtn.color = "white";
                exitBtn.background = "darkred";
                exitBtn.thickness = 2;
                if (exitBtn.textBlock) {
                    exitBtn.textBlock.fontSize = 24;
                }

                exitBtn.onPointerUpObservable.add(() => {
                    this.xr.baseExperience.exitXRAsync();
                });

                grid.addControl(exitBtn, 1, 0);

                // Subscribe to state changes to update button visually
                this.voiceManager.onStateChange = (isRecording) => {
                    if (isRecording) {
                        voiceBtn.background = "red";
                        if (voiceBtn.textBlock) voiceBtn.textBlock.text = "Recording...";
                    } else {
                        voiceBtn.background = "green";
                        if (voiceBtn.textBlock) voiceBtn.textBlock.text = "Voice Command";
                    }
                };
            }
        });
    }
}
