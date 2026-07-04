---
categories:
- user-interaction
created: '2026-07-04T02:25:54.380437+00:00'
id: voice-control
modified: '2026-07-04T02:25:54.380452+00:00'
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

## Workflow

1.  **Voice Capture:** The user speaks a command using the VR headset's built-in microphone.
2.  **Transmission:** The [[web-frontend|frontend client]] captures the audio (or transcribed text, if processing is done on-device/browser) and sends it to the [[python-host|Python Host Backend]] via the REST HTTP API.
3.  **AI Processing:** The Python host uses the Antigravity SDK to process the natural language intent. It analyzes the current scene context to understand what the user wants to achieve (e.g., "make this cube larger", "generate a red sports car here").
4.  **Scene Modification:** The AI formulates the necessary structural changes and sends commands back to the frontend's model layer to update the scene.
5.  **Feedback:** The system provides visual or audio feedback to acknowledge the command and display the resulting modifications.