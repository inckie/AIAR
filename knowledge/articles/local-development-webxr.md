---
categories:
- system-architecture
created: '2026-07-04T03:07:11.883204+00:00'
id: local-development-webxr
modified: '2026-07-04T07:53:22.972564+00:00'
tags:
- development
- webxr
- https
- vite
- mkcert
title: Local Development & WebXR Testing
type: leaf
---

# Local Development and WebXR Testing

Testing WebXR applications on an actual VR headset over a local network introduces a strict security requirement: **WebXR requires a secure context (HTTPS)**. Modern browsers will entirely disable WebXR features (like `navigator.xr`) if the site is served over plain HTTP, with the only exceptions being `localhost` or `127.0.0.1`.

Since you cannot test on the headset using `localhost` (the headset has its own `localhost` separate from the development PC), you must connect via the PC's local IP address (e.g., `192.168.1.X`). This triggers the security block, resulting in WebXR failing to initialize and the "Enter VR" button being hidden.

## The Solution: Vite & mkcert

To circumvent this during development, the engine utilizes Vite's development server combined with the `vite-plugin-mkcert` plugin. 

This plugin automatically generates a locally-trusted self-signed SSL certificate, allowing the Vite dev server to serve the application over HTTPS.

### Configuration (`vite.config.ts`)

The configuration ensures that:
1. The server binds to `0.0.0.0` to be accessible on the local network.
2. `https` is enabled via the `mkcert()` plugin.
3. API and asset requests are transparently proxied back to the Python Host backend.

```typescript
import { defineConfig } from 'vite'
import mkcert from 'vite-plugin-mkcert'

export default defineConfig({
  server: {
    https: true,
    host: '0.0.0.0', // expose on local network
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:9080',
        changeOrigin: true
      },
      '/assets': {
        target: 'http://127.0.0.1:9080',
        changeOrigin: true
      }
    }
  },
  plugins: [ mkcert() ]
})
```

## Development Workflow

1. **Start the Python Host:** Ensure the backend is running (typically on port `9080`).
2. **Start the Engine Dev Server:** In the `engine/` directory, run `npm run dev`. This will start the Vite server on a port like `5173`.
3. **Connect the Headset:** Open the VR headset's browser and navigate to the provided HTTPS IP address (e.g., `https://192.168.1.196:5173`).
4. **Accept the Warning:** Because the certificate is self-signed, the browser will display a security warning (e.g., "Your connection is not private"). Click **Advanced** and then **Proceed (unsafe)**.

Once accepted, the browser recognizes the secure context, WebXR initializes successfully, and the "Enter VR" button becomes available for testing.