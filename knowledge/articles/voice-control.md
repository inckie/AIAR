---
categories:
- user-interaction
created: '2026-07-04T02:25:54.380437+00:00'
id: voice-control
modified: '2026-07-04T04:10:14.565353+00:00'
tags:
- voice
- ai
- vr
- interaction
title: AI Voice Control
type: leaf
---

# AI Voice Control in VR

The primary and most intuitive method for users to interact with the prototyping system's AI is through direct voice commands while immersed in the VR environment.

## Current Implementation

We have implemented a fully local, offline speech-to-text pipeline that processes voice input instantly without relying on external cloud APIs.

### 1. Voice Capture & UI (Frontend)
*   **Activation:** The user can start/stop recording by clicking the "Voice Command" button on their left-hand Wrist Menu, or by simply pressing the **'A' Button** on the right physical controller.
*   **Recording:** The browser captures audio using the standard `MediaRecorder` API, compiling the microphone stream into `audio/webm` blobs.
*   **Transmission:** When the recording is stopped, the frontend uploads the WebM blob via a `FormData` POST request to the Python backend's `/api/voice/transcribe` endpoint.

### 2. Speech Recognition (Backend)
*   **Decoding:** Because standard Windows machines may not have FFmpeg installed (and Whisper requires it to decode WebM), the backend utilizes `imageio-ffmpeg`. This library provides a bundled, static FFmpeg binary that is dynamically injected into the system `PATH` at runtime, enabling zero-setup decoding.
*   **Transcription:** The decoded audio is fed into a local **OpenAI Whisper** model. The system currently uses the highly capable `small` model, which offers an excellent balance of transcription accuracy and performance on standard CPUs.

### 3. VR Visual Feedback
*   Once the backend returns the transcribed text, the frontend displays it to the user via a dynamically generated VR popup.
*   The popup is a semi-transparent HUD plane anchored directly to the user's headset (`xr.baseExperience.camera`).
*   It is positioned slightly downwards and tilted up by 30 degrees, placing it comfortably in the user's lower field of view for natural reading. The message remains visible for 5 seconds before automatically fading away to keep the viewport clean.

### 4. Hardcoded System Commands
Certain commands bypass the AI entirely for instantaneous, reliable execution. 
*   **Exit VR:** If the transcribed text contains the phrases `"exit vr"` or `"exit immersion"`, the frontend directly intercepts this and triggers `xr.baseExperience.exitXRAsync()`, smoothly dropping the user out of the immersive session.

## Next Steps: Action Execution
Currently, the pipeline correctly transcribes speech to text and handles hardcoded commands. The next major architectural step is passing arbitrary transcribed text into the Antigravity SDK. The AI will then analyze the context and formulate scene modification commands (e.g., "make this cube larger", "generate a red sports car here") which will be sent back to the frontend's model layer.