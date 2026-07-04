from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastmcp import FastMCP
import uvicorn
import os

app = FastAPI(title="AIAR Python Host")
mcp = FastMCP("aiar-host")

# API routes can go here
@app.get("/api/status")
def read_root():
    return {"status": "AIAR Host is running"}

# Serve the compiled frontend engine
engine_dist_path = os.path.join(os.path.dirname(__file__), "..", "..", "engine", "dist")
app.mount("/", StaticFiles(directory=engine_dist_path, html=True), name="engine")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=9080)
