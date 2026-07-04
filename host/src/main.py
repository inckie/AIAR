from fastapi import FastAPI, UploadFile, File
from fastapi.staticfiles import StaticFiles
from fastmcp import FastMCP
import uvicorn
import os
import tempfile
import shutil
import whisper
import imageio_ffmpeg
import json
from fastapi import Form
from .scene_manager import SceneManager
from .command_processor import HardcodedCommandProcessor

app = FastAPI(title="AIAR Python Host")
mcp = FastMCP("aiar-host")

# Initialize SceneManager and Command Processor
root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
scene_manager = SceneManager(root_dir)
command_processor = HardcodedCommandProcessor(scene_manager)

# Setup PATH so whisper can find the bundled ffmpeg executable natively
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
print("Loading Whisper model (this may download the model to your ~/.cache/whisper folder the first time)...")
whisper_model = whisper.load_model("small")
print("Whisper model loaded.")

@app.get("/api/scene")
def get_scene():
    return scene_manager.get_scene_json()

@app.post("/api/voice/transcribe")
async def transcribe_voice(file: UploadFile = File(...), context: str = Form(None)):
    # Parse context
    ctx_data = {}
    if context:
        try:
            ctx_data = json.loads(context)
        except Exception as e:
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
        
        # Process voice command
        action_response = None
        if text:
            action_response = command_processor.process(text, ctx_data)
            
        return {"text": text, "action_response": action_response}
    except Exception as e:
        return {"error": str(e), "text": ""}
    finally:
        os.remove(temp_file_path)

# API routes can go here
@app.get("/api/status")
def read_root():
    return {"status": "AIAR Host is running"}

# Serve the compiled frontend engine
engine_dist_path = os.path.join(os.path.dirname(__file__), "..", "..", "engine", "dist")
app.mount("/", StaticFiles(directory=engine_dist_path, html=True), name="engine")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=9080)
