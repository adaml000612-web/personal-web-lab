import json
from pathlib import Path

from operation_log import OperationLogger


def test_operation_logger_appends_json_lines(tmp_path: Path) -> None:
    log_file = tmp_path / "nested" / "operations.jsonl"
    logger = OperationLogger("run-1", tmp_path / "project", "inspection", log_file)

    logger.write("run_started", "started")
    logger.write("run_completed", "passed", duration_seconds=1.25)

    records = [json.loads(line) for line in log_file.read_text(encoding="utf-8").splitlines()]
    assert [record["event"] for record in records] == [
        "run_started",
        "run_completed",
    ]
    assert records[0]["run_id"] == "run-1"
    assert records[1]["duration_seconds"] == 1.25
    assert records[0]["timestamp"].endswith("Z")
