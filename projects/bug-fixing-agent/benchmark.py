"""Run the bundled bug fixtures through the isolated agent and summarize results."""

from __future__ import annotations

import argparse
import json
import shutil
import subprocess
import tempfile
from datetime import UTC, datetime
from pathlib import Path

import agent


ROOT = Path(__file__).resolve().parent


def initialize_repo(case_dir: Path, destination: Path) -> None:
    shutil.copytree(case_dir, destination)
    commands = [
        ["git", "init", "-b", "main"],
        ["git", "config", "user.email", "benchmark@example.com"],
        ["git", "config", "user.name", "Bug Fixing Agent Benchmark"],
        ["git", "add", "."],
        ["git", "commit", "-m", "Add reproducible bug fixture"],
    ]
    for command in commands:
        subprocess.run(command, cwd=destination, check=True, capture_output=True)


def run_benchmarks(
    cases_dir: Path, results_dir: Path, selected_cases: set[str] | None = None
) -> dict[str, object]:
    run_stamp = datetime.now(UTC).strftime("%Y%m%dT%H%M%SZ")
    run_dir = results_dir / run_stamp
    rows: list[dict[str, object]] = []

    case_dirs = sorted(path for path in cases_dir.iterdir() if path.is_dir())
    if selected_cases:
        case_dirs = [path for path in case_dirs if path.name in selected_cases]
        missing = selected_cases - {path.name for path in case_dirs}
        if missing:
            raise ValueError(f"未知案例：{', '.join(sorted(missing))}")

    for case_dir in case_dirs:
        metadata = json.loads((case_dir / "case.json").read_text(encoding="utf-8"))
        print(f"\n=== {metadata['name']}：{metadata['bug_type']} ===")
        with tempfile.TemporaryDirectory(prefix=f"benchmark-{case_dir.name}-") as temp:
            repo = Path(temp) / "repo"
            initialize_repo(case_dir, repo)
            case_reports = run_dir / case_dir.name
            exit_code = agent.run_agent(
                repo,
                metadata["test_command"],
                report_dir=case_reports,
                max_changed_files=metadata.get("max_changed_files", 3),
            )
            report_path = next(case_reports.glob("*.json"))
            report = json.loads(report_path.read_text(encoding="utf-8"))
            rows.append(
                {
                    "case": case_dir.name,
                    "name": metadata["name"],
                    "bug_type": metadata["bug_type"],
                    "status": report["status"],
                    "passed": exit_code == 0 and report["status"] == "passed",
                    "duration_seconds": report["duration_seconds"],
                    "changed_files": report["changed_files"] or [],
                    "protected_files_modified": report["protected_files_modified"] or [],
                    "report": str(report_path),
                    "patch": report["patch_file"],
                }
            )

    passed = sum(bool(row["passed"]) for row in rows)
    summary: dict[str, object] = {
        "run_id": run_stamp,
        "total": len(rows),
        "passed": passed,
        "failed": len(rows) - passed,
        "success_rate": round(passed / len(rows), 3) if rows else 0,
        "cases": rows,
    }
    run_dir.mkdir(parents=True, exist_ok=True)
    summary_path = run_dir / "summary.json"
    summary_path.write_text(
        json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(f"\n完成：{passed}/{len(rows)} 通过")
    print(f"汇总：{summary_path}")
    return summary


def main() -> int:
    parser = argparse.ArgumentParser(description="运行五类 Bug 的可重复评测。")
    parser.add_argument("--cases-dir", type=Path, default=ROOT / "benchmarks")
    parser.add_argument("--results-dir", type=Path, default=ROOT / "benchmark-results")
    parser.add_argument("--case", action="append", dest="cases", help="只运行指定案例")
    args = parser.parse_args()
    summary = run_benchmarks(
        args.cases_dir.resolve(), args.results_dir.resolve(), set(args.cases or []) or None
    )
    return 0 if summary["failed"] == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
