---
categories:
- skills
created: '2026-07-11T07:42:17.935791+00:00'
id: debugging-skill
modified: '2026-07-11T07:42:17.935811+00:00'
tags:
- skill
- debug
- logging
- python
- javascript
title: Debugging Python and JS Issues
type: leaf
---

# Debugging Python and JS Issues

This skill guide explains how to effectively debug both frontend and backend issues in the AIAR environment using MCP.

## Python Debugging

The Python Host backend utilizes a centralized `SystemLogger`. All logs are tagged with a specific subsystem and severity level.

- Use the **`log_tail`** MCP tool to retrieve the most recent logs from the backend. You can filter by subsystem (e.g., `Voice`, `Scene`, `AI`) and severity level (`INFO`, `WARNING`, `ERROR`, `DEBUG`).
- Use the **`log_since`** MCP tool if you need to fetch logs occurring after a specific timestamp, useful when monitoring the result of a specific action.

## JavaScript Debugging

You do not need to attach to a browser console to debug JS scripts!

The AIAR WebXR frontend automatically hooks into standard JavaScript logging methods (`console.error`, `console.warn`, etc.) and unhandled exceptions (via `window.onerror`). It forwards these directly to the Python backend's `SystemLogger` under the `Browser` subsystem.

**To debug a JS script issue:**
1. Simply use `console.error("My specific debug info:", myVar)` in your JS code.
2. Query the backend logs using `log_tail` with the subsystem filter set to `Browser`.
3. Read the logs directly through your MCP interface.