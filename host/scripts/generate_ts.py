import os
import json
import subprocess
import sys

# Add the src directory to sys.path so we can import models
current_dir = os.path.dirname(os.path.abspath(__file__))
host_dir = os.path.dirname(current_dir)
sys.path.insert(0, os.path.join(host_dir, "src"))

from models import Scene

def main():
    print("Generating JSON schema from Pydantic models...")
    schema = Scene.model_json_schema()
    
    engine_dir = os.path.join(host_dir, "..", "engine")
    schema_path = os.path.join(engine_dir, "schema.json")
    
    print(f"Writing schema to {schema_path}...")
    with open(schema_path, "w") as f:
        json.dump(schema, f, indent=2)
        
    print("Running typescript codegen in engine directory...")
    try:
        subprocess.run(["npm", "run", "codegen"], cwd=engine_dir, check=True, shell=True)
        print("Codegen successful!")
    except subprocess.CalledProcessError as e:
        print(f"Error running codegen: {e}")
    finally:
        if os.path.exists(schema_path):
            os.remove(schema_path)
            print("Cleaned up schema.json.")

if __name__ == "__main__":
    main()
