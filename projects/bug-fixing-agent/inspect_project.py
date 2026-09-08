"""Inspect a project with Codex and print one concrete code problem."""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
import tempfile
from pathlib import Path
from typing import Sequence

from agent import find_codex_binary


OUTPUT_SCHEMA = {
    "type": "object",
    "properties": {
        "title": {"type": "string"},
        "file": {"type": "string"},
        "line": {"type": "integer", "minimum": 1},
        "evidence": {"type": "string"},
        "explanation": {"type": "string"},
    },
    "required": ["title", "file", "line", "evidence", "explanation"],
    "additionalProperties": False,
}


INSPECTION_PROMPT = """只读检查当前项目，找出一个明确、可验证的代码问题。

要求：
- 阅读项目中的实现代码和相关测试或调用代码。
- 只报告一个最有把握的问题，不修改任何文件。
- 问题必须指向具体文件和行号，并给出代码证据与可能造成的行为。
- 不报告纯风格、命名或缺少注释之类的问题。
- 如果有测试，优先用测试预期与实现行为之间的矛盾作为证据。
- 最终严格按照给定 JSON Schema 返回结果。
"""


def inspect_project(project: Path, codex_binary: str | None = None) -> dict[str, object]:
    project = project.expanduser().resolve()
    if not project.is_dir():
        raise ValueError(f"项目目录不存在：{project}")
    executable = codex_binary or find_codex_binary()
    if not executable:
        raise RuntimeError("未找到 Codex CLI，请先安装并登录。")

    with tempfile.TemporaryDirectory(prefix="project-inspection-") as temporary:
        temporary_path = Path(temporary)
        schema_path = temporary_path / "issue-schema.json"
        result_path = temporary_path / "issue.json"
        schema_path.write_text(
            json.dumps(OUTPUT_SCHEMA, ensure_ascii=False), encoding="utf-8"
        )
        completed = subprocess.run(
            [
                executable,
                "exec",
                "--ephemeral",
                "--sandbox",
                "read-only",
                "--skip-git-repo-check",
                "--cd",
                str(project),
                "--output-schema",
                str(schema_path),
                "--output-last-message",
                str(result_path),
                INSPECTION_PROMPT,
            ],
            cwd=project,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            check=False,
        )
        if completed.returncode != 0:
            detail = (completed.stderr or completed.stdout).strip()[-1000:]
            raise RuntimeError(f"Codex 检查失败：{detail}")
        if not result_path.exists():
            raise RuntimeError("Codex 没有返回检查结果。")
        try:
            finding = json.loads(result_path.read_text(encoding="utf-8"))
        except json.JSONDecodeError as error:
            raise RuntimeError("Codex 返回的检查结果不是有效 JSON。") from error
        return finding


def print_finding(finding: dict[str, object]) -> None:
    print(f"发现问题：{finding['title']}")
    print(f"位置：{finding['file']}:{finding['line']}")
    print(f"代码证据：{finding['evidence']}")
    print(f"影响：{finding['explanation']}")


def parse_args(argv: Sequence[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="读取项目并打印一个明确的代码问题。")
    parser.add_argument("project", type=Path, help="需要检查的项目目录")
    return parser.parse_args(argv)


def main(argv: Sequence[str] | None = None) -> int:
    args = parse_args(argv)
    try:
        finding = inspect_project(args.project)
        print_finding(finding)
        return 0
    except (ValueError, RuntimeError) as error:
        print(f"错误：{error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
