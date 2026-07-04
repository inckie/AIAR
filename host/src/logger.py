import time
from typing import List, Optional
from pydantic import BaseModel


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
        subsystem: Optional[str] = None,
    ) -> List[LogEntry]:
        results = self.entries
        if level:
            results = [r for r in results if r.level == level.upper()]
        if subsystem:
            results = [r for r in results if r.subsystem.lower() == subsystem.lower()]

        return results[-limit:]

    def get_since(
        self,
        timestamp: float,
        level: Optional[str] = None,
        subsystem: Optional[str] = None,
    ) -> List[LogEntry]:
        results = [r for r in self.entries if r.timestamp >= timestamp]
        if level:
            results = [r for r in results if r.level == level.upper()]
        if subsystem:
            results = [r for r in results if r.subsystem.lower() == subsystem.lower()]

        return results


# Global singleton instance
_logger_instance = SystemLogger()


def get_logger() -> SystemLogger:
    return _logger_instance
