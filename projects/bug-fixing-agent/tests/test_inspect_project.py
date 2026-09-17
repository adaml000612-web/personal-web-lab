import json
from pathlib import Path

import pytest

import inspect_project


def test_inspect_project_reads_structured_codex_result(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    project = tmp_path / "project"
    project.mkdir()

    def fake_run(command: list[str], **kwargs: object) -> object:
        output_path = Path(command[command.index("--output-last-message") + 1])
        output_path.write_text(
            json.dumps(
                {
                    "title": "加法实现使用了减法",
                    "file": "calculator.py",
                    "line": 2,
                    "evidence": "return a - b",
                    "explanation": "add(2, 3) 会返回 -1，而不是 5。",
                },
                ensure_ascii=False,
            ),
            encoding="utf-8",
        )
        return type("Completed", (), {"returncode": 0, "stdout": "", "stderr": ""})()

    monkeypatch.setattr(inspect_project.subprocess, "run", fake_run)
    log_file = tmp_path / "operations.jsonl"
    finding = inspect_project.inspect_project(
        project, codex_binary="codex", log_file=log_file
    )
    assert finding["file"] == "calculator.py"
    assert finding["line"] == 2
    records = [json.loads(line) for line in log_file.read_text(encoding="utf-8").splitlines()]
    assert [record["event"] for record in records] == [
        "run_started",
        "codex_completed",
        "result_parsed",
        "run_completed",
    ]
    assert len({record["run_id"] for record in records}) == 1
    assert all("evidence" not in record for record in records)


def test_print_finding_is_readable(capsys: pytest.CaptureFixture[str]) -> None:
    inspect_project.print_finding(
        {
            "title": "错误",
            "file": "app.py",
            "line": 7,
            "evidence": "return None",
            "explanation": "调用方会崩溃。",
        }
    )
    output = capsys.readouterr().out
    assert "发现问题：错误" in output
    assert "位置：app.py:7" in output


def test_rejects_missing_project(tmp_path: Path) -> None:
    with pytest.raises(ValueError, match="项目目录不存在"):
        inspect_project.inspect_project(tmp_path / "missing", codex_binary="codex")
