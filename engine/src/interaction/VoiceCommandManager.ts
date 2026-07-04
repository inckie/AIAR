import { Scene, WebXRDefaultExperience, Ray } from "@babylonjs/core";
import { DebugOverlay } from "../ui/DebugOverlay";
import { VRPopup } from "../ui/VRPopup";

export class VoiceCommandManager {
    private scene: Scene;
    private xr: WebXRDefaultExperience;
    private debug: DebugOverlay;
    private vrPopup: VRPopup;
    
    public isRecording: boolean = false;
    private mediaRecorder: MediaRecorder | null = null;
    private audioChunks: Blob[] = [];
    
    // Callback so the WristMenu can update its button text/color
    public onStateChange?: (isRecording: boolean) => void;

    constructor(scene: Scene, xr: WebXRDefaultExperience, debug: DebugOverlay, vrPopup: VRPopup) {
        this.scene = scene;
        this.xr = xr;
        this.debug = debug;
        this.vrPopup = vrPopup;
    }

    public async toggleRecording() {
        if (this.isRecording) {
            if (this.mediaRecorder) {
                this.mediaRecorder.stop();
            }
            this.isRecording = false;
            if (this.onStateChange) this.onStateChange(this.isRecording);
        } else {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                this.mediaRecorder = new MediaRecorder(stream);
                this.audioChunks = [];
                
                this.mediaRecorder.ondataavailable = (e) => {
                    if (e.data.size > 0) this.audioChunks.push(e.data);
                };
                
                this.mediaRecorder.onstop = async () => {
                    await this.handleRecordingStop(stream);
                };
                
                this.mediaRecorder.start();
                this.isRecording = true;
                this.debug.log("Recording started...");
                if (this.onStateChange) this.onStateChange(this.isRecording);
            } catch (err: any) {
                this.debug.log("Mic error: " + err.message);
            }
        }
    }

    private async handleRecordingStop(stream: MediaStream) {
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
        this.debug.log("Sending audio: " + audioBlob.size + " bytes");
        stream.getTracks().forEach(track => track.stop());

        // Gather Spatial Context
        const context = {
            head: {
                position: this.xr.baseExperience.camera.position.asArray(),
                direction: this.xr.baseExperience.camera.getForwardRay().direction.asArray()
            },
            intersection: null as any
        };

        this.xr.input.controllers.forEach(c => {
            if (c.inputSource.handedness === "right" && c.pointer) {
                const ray = new Ray(c.pointer.position, c.pointer.forward, 100);
                const pick = this.scene.pickWithRay(ray);
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
                this.debug.log("Recognized: " + data.text);
                let popupMsg = '"' + data.text + '"';
                if (data.action_response) {
                    popupMsg += "\n\nSystem: " + data.action_response;
                }
                this.vrPopup.show(popupMsg);

                // Hardcoded system commands
                const txt = data.text.toLowerCase();
                if (txt.includes("exit vr") || txt.includes("exit immersion")) {
                    setTimeout(() => {
                        this.xr.baseExperience.exitXRAsync();
                    }, 1500);
                }
            } else if (data.error) {
                this.debug.log("Error: " + data.error);
                this.vrPopup.show("Error: " + data.error);
            }
        } catch (err: any) {
            this.debug.log("Transcribe err: " + err.message);
            this.vrPopup.show("Transcribe Error: " + err.message);
        }
    }
}
