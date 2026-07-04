---
categories: []
created: '2026-07-04T02:26:04.612034+00:00'
id: overview
modified: '2026-07-04T02:29:11.925912+00:00'
tags:
- overview
- documentation
- ar
- vr
- ai
title: AIAR Project Overview
type: category
---

<!-- human:start -->
# AIAR WebGL Prototyping System

Welcome to the documentation for the AIAR WebGL AR Prototyping System.

This project is a rapid prototyping environment for Augmented Reality (AR) and Virtual Reality (VR) applications. It enables users to iteratively build and modify 3D scenes from within VR using a combination of natural language voice commands and traditional 3D editing tools.

At its core, the system relies on an AI assistant powered by the Antigravity SDK to interpret user intent and manipulate the underlying data structures, drastically reducing the friction of building spatial applications.

## Key Modules
The project is split into two primary components:
1. **[[web-frontend|Web Frontend]]**: Built with TypeScript and Babylon.js. It separates the scene's logical data model (a Unity-like component system) from the 3D visual rendering.
2. **[[python-host|Python Host Backend]]**: A versatile server that drives the AI integrations, manages the build pipeline, and exposes interfaces via REST and MCP.
<!-- human:end -->

## Articles in This Category

<!-- ai:start -->
This overview serves as the entry point to understanding the complete scope of the AIAR WebGL Prototyping System. 

### Categories

*   [[system-architecture]]: Explores the structural design of the platform. It details the separation of concerns, the backend Python infrastructure handling the AI layer, and the TypeScript frontend managing state and Babylon.js rendering.
*   [[user-interaction]]: Focuses on the user experience within the AR/VR environment. It explains how high-level AI voice control integrates with low-level spatial 3D editing tools to provide a seamless prototyping workflow.
<!-- ai:end -->