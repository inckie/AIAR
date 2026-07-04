---
categories:
- user-interaction
created: '2026-07-04T02:25:54.380437+00:00'
id: voice-control
modified: '2026-07-04T04:41:29.393713+00:00'
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

### 1. Voice Capture & Spatial Context (Frontend)
*   **Activation:** The user can start/stop recording by clicking the "Voice Command" button on their left-hand Wrist Menu, or by simply pressing the **'A' Button** on the right physical controller.
*   **Spatial Context Snapshot:** When the recording finishes, the frontend instantly snapshots the user's spatial context. This includes the head's position/direction, and an invisible raycast from the right controller that records exact intersection points and target mesh names if pointing at objects.
*   **Transmission:** The audio (WebM blob) and the spatial context (JSON string) are bundled into a `FormData` POST request and uploaded to the Python backend's `/api/voice/transcribe` endpoint.

### 2. Speech Recognition (Backend)
*   **Decoding:** Because standard Windows machines may not have FFmpeg installed, the backend utilizes `imageio-ffmpeg`. This injects a static FFmpeg binary into the system `PATH` at runtime, enabling zero-setup decoding.
*   **Transcription:** The decoded audio is fed into a local **OpenAI Whisper** model (the `small` model). We explicitly restrict transcription to English (`language="en"`) which removes language-detection overhead, resulting in faster and more accurate processing.

### 3. Command Processing
The backend utilizes a clean `AbstractCommandProcessor` architecture to evaluate intents. Currently, a `HardcodedCommandProcessor` evaluates the transcribed text alongside the spatial context:
*   **Add Intent:** Saying "add box" or "create sphere" uses the raycast intersection to spawn the object precisely where the user is pointing, or floating 1.5 meters in front of their head if pointing at nothing.
*   **Remove Intent:** Saying "remove this" deletes the specific object the user is currently pointing at.
*   **Undo Intent:** The `SceneManager` maintains a rolling 50-action `undo_stack`. Saying "undo" instantly pops the previous state and reverts the scene.

### 4. VR Visual Feedback
*   The backend returns an `action_response` (e.g., "Added box", "Undid last action").
*   The frontend displays the transcribed text and the system response via a dynamically generated, auto-fading VR popup anchored in the user's lower field of view.

### 5. Hardcoded System Commands
Certain commands bypass the AI entirely for instantaneous, reliable execution. 
*   **Exit VR:** The phrases `"exit vr"` or `"exit immersion"` trigger `xr.baseExperience.exitXRAsync()`, dropping the user out of the session.

## Next Steps: AI Integration
With the spatial context pipeline and abstract command processor firmly established, the next major step is swapping out the `HardcodedCommandProcessor` for an actual AI backend (e.g., Local LM Studio, Gemini) that can parse complex semantic requests into scene modification commands.