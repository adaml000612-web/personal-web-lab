"""Append privacy-conscious operation events as JSON Lines."""

from __future__ import annotations

import json
from datetime import UTC, datetime
from pathlib import Path
from typing import Any


DEFAULT_LOG_FILE = Path(__file__).resolve().parent / "logs" / "operations.jsonl"


class OperationLogger:
    def __init__(
        self, run_id: str, project: Path, mode: str, log_file: Path | None = None
    ) -> None:
        self.run_id = run_id
        self.project = str(project)
        self.mode = mode
        self.log_file = (log_file or DEFAULT_LOG_FILE).expanduser().resolve()

    def write(self, event: str, status: str, **details: Any) -> None:
        record = {
            "timestamp": datetime.now(UTC).isoformat().replace("+00:00", "Z"),
            "run_id": self.run_id,
            "mode": self.mode,
            "project": self.project,
            "event": event,
            "status": status,
            **details,
        }
        self.log_file.parent.mkdir(parents=True, exist_ok=True)
        with self.log_file.open("a", encoding="utf-8") as stream:
            stream.write(json.dumps(record, ensure_ascii=False) + "\n")
