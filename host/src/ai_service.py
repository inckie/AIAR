import json
import os
import urllib.request
import urllib.error
from pathlib import Path
from typing import Any, Dict, List


class AIService:
    """Manages AI integration settings, API fetching, and MCP binding."""

    def __init__(self, host_dir: Path | str):
        self.host_dir = Path(host_dir)
        self.settings_dir = self.host_dir / ".settings"
        self.config_path = self.settings_dir / "ai_config.json"

        # Make sure directory exists and seed defaults if empty
        self.settings_dir.mkdir(parents=True, exist_ok=True)
        if not self.config_path.exists():
            self.save_settings("http://localhost:1234/v1", "", "local-model", False)

    def load_settings(self) -> Dict[str, Any]:
        """Load AI configuration settings from disk."""
        defaults = {
            "url": "http://localhost:1234/v1",
            "api_key": "",
            "model": "local-model",
            "enabled": False,
        }

        if not self.config_path.exists():
            return defaults

        try:
            with open(self.config_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                defaults.update(data)
        except Exception as e:
            print(f"Error reading AI config: {e}")

        return defaults

    def save_settings(
        self, url: str, api_key: str, model: str, enabled: bool = True
    ) -> Dict[str, Any]:
        """Save AI configuration settings to disk."""
        data = {
            "url": url.strip(),
            "api_key": api_key.strip(),
            "model": model.strip(),
            "enabled": enabled,
        }

        try:
            with open(self.config_path, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
        except Exception as e:
            print(f"Error saving AI config: {e}")
            raise RuntimeError(f"Failed to save AI settings: {e}")

        return data

    async def invoke_remote_model_with_tools(
        self, system_prompt: str, user_prompt: str, mcp_server: Any
    ) -> str:
        """
        Invoke the remote model with an active MCP tool calling loop.
        Allows the remote OpenAI API model to inspect and call tools.
        """
        settings = self.load_settings()
        if not settings.get("enabled"):
            raise RuntimeError("AI Integration is not enabled in settings.")

        url = settings.get("url", "").rstrip("/")
        api_key = settings.get("api_key", "dummy")  # Default dummy for LM Studio
        model = settings.get("model", "")

        if not url or not model:
            raise RuntimeError("AI Base URL or Model is not configured in settings.")

        endpoint = f"{url}/chat/completions"
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }

        # Convert FastMCP tools to OpenAI API tool definitions
        openapi_tools = []
        try:
            mcp_tools = await mcp_server.list_tools()
            for t in mcp_tools:
                params = (
                    t.inputSchema
                    if getattr(t, "inputSchema", None)
                    else {"type": "object", "properties": {}}
                )
                openapi_tools.append(
                    {
                        "type": "function",
                        "function": {
                            "name": t.name,
                            "description": t.description or f"Execute {t.name}",
                            "parameters": params,
                        },
                    }
                )
        except Exception as e:
            print(f"Error listing MCP tools: {e}")

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ]

        max_iterations = 10

        for _ in range(max_iterations):
            payload = {
                "model": model,
                "messages": messages,
            }
            if openapi_tools:
                payload["tools"] = openapi_tools

            data_bytes = json.dumps(payload, ensure_ascii=False).encode("utf-8")
            req = urllib.request.Request(
                endpoint, data=data_bytes, headers=headers, method="POST"
            )

            try:
                with urllib.request.urlopen(req, timeout=30) as response:
                    body = response.read().decode("utf-8")
                    resp_data = json.loads(body)
            except urllib.error.HTTPError as e:
                err_body = e.read().decode("utf-8", errors="ignore")
                raise RuntimeError(f"AI endpoint HTTPError {e.code}: {err_body}")
            except Exception as e:
                raise RuntimeError(f"Failed to communicate with AI endpoint: {e}")

            choices = resp_data.get("choices", [])
            if not choices:
                raise RuntimeError("No choices returned in AI response.")

            message = choices[0].get("message", {})
            tool_calls = message.get("tool_calls")

            if not tool_calls:
                # No tool calls requested, return final content
                return message.get("content") or "Executed successfully."

            # Model requested tool call(s), append assistant message to history
            messages.append(message)

            for tc in tool_calls:
                tc_id = tc.get("id")
                func = tc.get("function", {})
                func_name = func.get("name")
                func_args_str = func.get("arguments", "{}")

                try:
                    func_args = json.loads(func_args_str) if func_args_str else {}
                    content_list = await mcp_server.call_tool(func_name, func_args)
                    # FastMCP returns a list of objects with text property or similar
                    if isinstance(content_list, list):
                        tool_result = "\n".join(
                            [getattr(c, "text", str(c)) for c in content_list]
                        )
                    else:
                        tool_result = str(content_list)
                except Exception as e:
                    tool_result = f"Error executing tool '{func_name}': {e}"

                messages.append(
                    {
                        "role": "tool",
                        "tool_call_id": tc_id,
                        "name": func_name,
                        "content": tool_result,
                    }
                )

        return "Error: Exceeded maximum tool execution iterations."
