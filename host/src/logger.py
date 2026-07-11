import time
from typing import List, Optional
from pydantic import BaseModel

LEVEL_SEVERITY = {
    "DEBUG": 0,
    "INFO": 1,
    "WARNING": 2,
    "ERROR": 3,
}


class LogEntry(BaseModel):
    timestamp: float
    level: str
    subsystem: str
    message: str


class SystemLogger:
    def __init__(self, max_entries: int = 1000):
        self.max_entries = max_entries
        self.entries: List[LogEntry] = []

    def _add_log(self, level: str, subsystem: str, message: str):
        entry = LogEntry(
            timestamp=time.time(),
            level=level.upper(),
            subsystem=subsystem,
            message=message,
        )
        self.entries.append(entry)
        if len(self.entries) > self.max_entries:
            self.entries.pop(0)

        # Also print to standard output for local console viewing
        print(f"[{entry.level}] [{entry.subsystem}] {entry.message}")

    def debug(self, subsystem: str, message: str):
        self._add_log("DEBUG", subsystem, message)

    def info(self, subsystem: str, message: str):
        self._add_log("INFO", subsystem, message)

    def warning(self, subsystem: str, message: str):
        self._add_log("WARNING", subsystem, message)

    def error(self, subsystem: str, message: str):
        self._add_log("ERROR", subsystem, message)

    def get_tail(
        self,
        limit: int = 50,
        level: Optional[str] = None,
        subsystems: Optional[List[str]] = None,
    ) -> List[LogEntry]:
        results = self.entries
        if level:
            req_severity = LEVEL_SEVERITY.get(level.upper(), 0)
            results = [r for r in results if LEVEL_SEVERITY.get(r.level.upper(), 0) >= req_severity]
        if subsystems:
            if isinstance(subsystems, str):
                subsystems = [subsystems]
            subsystems_lower = {s.lower() for s in subsystems}
            results = [r for r in results if r.subsystem.lower() in subsystems_lower]

        return results[-limit:]

    def get_since(
        self,
        timestamp: float,
        level: Optional[str] = None,
        subsystems: Optional[List[str]] = None,
    ) -> List[LogEntry]:
        results = [r for r in self.entries if r.timestamp >= timestamp]
        if level:
            req_severity = LEVEL_SEVERITY.get(level.upper(), 0)
            results = [r for r in results if LEVEL_SEVERITY.get(r.level.upper(), 0) >= req_severity]
        if subsystems:
            if isinstance(subsystems, str):
                subsystems = [subsystems]
            subsystems_lower = {s.lower() for s in subsystems}
            results = [r for r in results if r.subsystem.lower() in subsystems_lower]

        return results


# Global singleton instance
_logger_instance = SystemLogger()


def get_logger() -> SystemLogger:
    return _logger_instance
