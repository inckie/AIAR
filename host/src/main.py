import json
import tempfile
import whisper
import os
import imageio_ffmpeg
import shutil
from fastapi import FastAPI, File, UploadFile, Form, BackgroundTasks, Request
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from typing import Dict, Any
import uvicorn
from .scene_manager import SceneManager
from .command_processor import HardcodedCommandProcessor, OpenAIBackend
from .mcp_server import create_mcp_server
from .ai_service import AIService
from .sse import create_sse_server
from .logger import get_logger

logger = get_logger()

app = FastAPI()

# Allow CORS for local dev
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize core services
host_dir = os.path.dirname(os.path.dirname(__file__))
root_dir = os.path.abspath(os.path.join(host_dir, ".."))
scene_manager = SceneManager(root_dir)

# Initialize MCP and AI services
mcp_server = create_mcp_server(scene_manager)
ai_service = AIService(host_dir=host_dir)

# Mount MCP SSE Server
sse_app = create_sse_server(mcp_server)
app.mount("/mcp", sse_app)

# Pick Command Processor
ai_settings = ai_service.load_settings()
if ai_settings.get("enabled"):
    print("AI integration is enabled. Using OpenAIBackend.")
    command_processor = OpenAIBackend(scene_manager, mcp_server, ai_service)
else:
    print("AI integration is disabled. Using HardcodedCommandProcessor.")
    command_processor = HardcodedCommandProcessor(scene_manager)

# We need to manually tell whisper where ffmpeg is, since it relies on system PATH.
# We'll prepend the bundled imageio_ffmpeg executable directory to PATH.
ffmpeg_exe_path = imageio_ffmpeg.get_ffmpeg_exe()
ffmpeg_alias_dir = os.path.join(tempfile.gettempdir(), "ffmpeg_alias")
os.makedirs(ffmpeg_alias_dir, exist_ok=True)
ffmpeg_alias_path = os.path.join(ffmpeg_alias_dir, "ffmpeg.exe")

if not os.path.exists(ffmpeg_alias_path):
    try:
        shutil.copy(ffmpeg_exe_path, ffmpeg_alias_path)
    except Exception:
        pass

os.environ["PATH"] = ffmpeg_alias_dir + os.pathsep + os.environ.get("PATH", "")

# Load Whisper model
print(
    "Loading Whisper model (this may download the model to your ~/.cache/whisper folder the first time)..."
)
whisper_model = whisper.load_model("small")
print("Whisper model loaded.")


@app.get("/api/scene")
def get_scene():
    return scene_manager.get_scene_json()


@app.post("/api/scene/entities")
async def create_entity(request: Request):
    try:
        data = await request.json()
    except Exception:
        return {"status": "error", "message": "Invalid JSON"}

    try:
        from .models import Entity
        import uuid

        if "id" not in data:
            shape = (
                data.get("components", {}).get("mesh", {}).get("type", "obj")
                if isinstance(data.get("components"), dict)
                and isinstance(data.get("components").get("mesh"), dict)
                else "obj"
            )
            data["id"] = f"{shape}_{uuid.uuid4().hex[:6]}"
        if "name" not in data:
            data["name"] = data["id"]

        entity = Entity(**data)
        scene_manager.add_entity(entity)
        return {"status": "success", "id": entity.id}
    except Exception as e:
        return {"status": "error", "message": str(e)}


@app.patch("/api/scene/entities/{entity_id}")
async def update_entity(entity_id: str, request: Request):
    try:
        updates = await request.json()
    except Exception:
        updates = {}

    if scene_manager.update_entity(entity_id, updates):
        return {"status": "success", "message": f"Updated entity {entity_id}"}
    return {"status": "error", "message": f"Failed to update entity {entity_id}"}


@app.post("/api/voice/transcribe")
async def transcribe_voice(file: UploadFile = File(...), context: str = Form(None)):
    logger.info("Voice", "Received voice command audio.")

    # Parse context
    ctx_data = {}
    if context:
        try:
            ctx_data = json.loads(context)
        except Exception as e:
            logger.error("Voice", f"Error parsing context: {e}")
            print(f"Error parsing context: {e}")

    # Whisper requires a file path or numpy array. We save the uploaded WebM to a temp file.
    with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as temp_file:
        temp_file.write(await file.read())
        temp_file_path = temp_file.name

    try:
        # load_audio runs ffmpeg (using the bundled imageio-ffmpeg we injected into PATH)
        audio = whisper.load_audio(temp_file_path)
        result = whisper_model.transcribe(temp_file_path, language="en")
        text = result["text"].strip()
        logger.info("Voice", f"Transcribed text: '{text}'")

        # Process voice command
        action_response = None
        if text:
            lower_text = text.lower()
            if "exit vr" in lower_text or "exit immersion" in lower_text:
                action_response = "Exiting VR session..."
                logger.info("Voice", "Intercepted 'Exit VR' command.")
            else:
                action_response = command_processor.process(text, ctx_data)
                logger.info("Voice", f"Command processor response: {action_response}")

        return {"text": text, "action_response": action_response}
    except Exception as e:
        logger.error("Voice", f"Transcription error: {e}")
        return {"error": str(e), "text": ""}
    finally:
        os.remove(temp_file_path)


# API routes can go here
@app.get("/api/status")
def read_root():
    return {"status": "AIAR Host is running"}


# IMPORTANT: When adding new API routes, controller paths, or static file mounts (like /scripts) 
# on the backend, you MUST update the Vite development server proxy list in 'engine/vite.config.ts'.
# See the KB article: [[local-development-webxr]] (Local Development & WebXR Testing) for details.

# Serve assets
assets_dir_path = os.path.join(os.path.dirname(__file__), "..", "..", "projects", "default", "assets")
os.makedirs(assets_dir_path, exist_ok=True)
app.mount("/assets", StaticFiles(directory=assets_dir_path), name="assets")

# Serve custom scripts
scripts_dir_path = os.path.join(os.path.dirname(__file__), "..", "..", "projects", "default", "scripts")
os.makedirs(scripts_dir_path, exist_ok=True)
app.mount("/scripts", StaticFiles(directory=scripts_dir_path), name="scripts")

# Serve the compiled frontend engine
engine_dist_path = os.path.join(os.path.dirname(__file__), "..", "..", "engine", "dist")
app.mount("/", StaticFiles(directory=engine_dist_path, html=True), name="engine")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=9080)
