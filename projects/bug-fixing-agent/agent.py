"""Run a guarded test-fix-test loop in an isolated Git worktree."""

from __future__ import annotations

import argparse
import json
import os
import shlex
import shutil
import subprocess
import sys
import tempfile
import time
from contextlib import contextmanager
from dataclasses import asdict, dataclass
from datetime import UTC, datetime
from pathlib import Path, PurePosixPath
from typing import Iterator, Sequence


@dataclass(frozen=True)
class CommandResult:
    returncode: int
    output: str


@dataclass
class RunReport:
    run_id: str
    project: str
    test_command: str
    status: str = "started"
    duration_seconds: float = 0.0
    initial_test_returncode: int | None = None
    final_test_returncode: int | None = None
    agent_returncode: int | None = None
    agent_output_tail: str = ""
    changed_files: list[str] | None = None
    protected_files_modified: list[str] | None = None
    patch_file: str | None = None
    note: str = ""


def run_command(command: Sequence[str], cwd: Path) -> CommandResult:
    completed = subprocess.run(
        list(command), cwd=cwd, capture_output=True, text=True,
        encoding="utf-8", errors="replace", check=False,
    )
    output = "\n".join(part for part in (completed.stdout, completed.stderr) if part)
    return CommandResult(completed.returncode, output.rstrip())


def require_clean_git_repo(project: Path) -> None:
    if not project.is_dir():
        raise ValueError(f"目标目录不存在：{project}")
    inside = run_command(["git", "rev-parse", "--is-inside-work-tree"], project)
    if inside.returncode != 0 or inside.output.strip() != "true":
        raise ValueError("目标必须是 Git 仓库。")
    status = run_command(["git", "status", "--porcelain"], project)
    if status.returncode != 0:
        raise ValueError("无法读取目标仓库状态。")
    if status.output:
        raise ValueError("目标仓库存在未提交改动；请先提交或暂存到其他位置。")


def build_fix_prompt(test_command: str, failure_output: str) -> str:
    excerpt = failure_output[-6000:]
    return f"""修复当前仓库中导致测试失败的 Bug。

要求：
- 先阅读相关代码和测试，确认根因。
- 只修改实现代码，不得修改、删除、重命名或绕过测试文件。
- 不提交、不推送、不删除无关文件，不安装新依赖。
- 做解决失败所需的最小修改。
- 修改后运行：{test_command}
- 最后简要说明根因、修改和测试结果。

首次测试失败输出：
{excerpt}
"""


def find_codex_binary() -> str | None:
    on_path = shutil.which("codex")
    if on_path:
        return on_path
    local_app_data = os.environ.get("LOCALAPPDATA")
    if os.name == "nt" and local_app_data:
        bin_root = Path(local_app_data) / "OpenAI" / "Codex" / "bin"
        candidates = sorted(
            bin_root.glob("*/codex.exe"), key=lambda path: path.stat().st_mtime,
            reverse=True,
        )
        if candidates:
            return str(candidates[0])
    return None


def is_protected_test_file(relative_path: str) -> bool:
    path = PurePosixPath(relative_path.replace("\\", "/"))
    lowered_parts = {part.lower() for part in path.parts[:-1]}
    name = path.name.lower()
    return (
        bool(lowered_parts & {"test", "tests", "testing"})
        or name.startswith(("test_", "check_"))
        or name.endswith(("_test.py", "_tests.py"))
    )


def changed_files(worktree: Path) -> list[str]:
    status = run_command(["git", "status", "--porcelain", "-uall"], worktree)
    if status.returncode != 0:
        raise RuntimeError("无法读取隔离工作区的修改。")
    paths: list[str] = []
    for line in status.output.splitlines():
        if len(line) < 4:
            continue
        path = line[3:]
        if " -> " in path:
            path = path.split(" -> ", 1)[1]
        paths.append(path.strip('"'))
    return sorted(set(paths))


def parse_command(command: str) -> list[str]:
    parts = shlex.split(command, posix=os.name != "nt")
    if os.name == "nt":
        parts = [
            part[1:-1]
            if len(part) >= 2 and part[0] == part[-1] and part[0] in {'"', "'"}
            else part
            for part in parts
        ]
    return parts


@contextmanager
def isolated_worktree(project: Path) -> Iterator[Path]:
    worktree = Path(tempfile.mkdtemp(prefix=f"bugfix-{project.name}-"))
    created = False
    try:
        result = run_command(
            ["git", "worktree", "add", "--detach", str(worktree), "HEAD"], project
        )
        if result.returncode != 0:
            raise RuntimeError(f"无法创建隔离工作区：{result.output}")
        created = True
        yield worktree
    finally:
        if created:
            run_command(["git", "worktree", "remove", "--force", str(worktree)], project)
        shutil.rmtree(worktree, ignore_errors=True)


def invoke_codex(executable: str, worktree: Path, prompt: str) -> CommandResult:
    return run_command(
        [executable, "exec", "--ephemeral", "--approve-for-me", "--cd", str(worktree), prompt],
        worktree,
    )


def save_report(report: RunReport, report_dir: Path, patch: str) -> Path:
    report_dir.mkdir(parents=True, exist_ok=True)
    patch_path = report_dir / f"{report.run_id}.patch"
    if patch:
        patch_path.write_text(patch, encoding="utf-8")
        report.patch_file = str(patch_path)
    report_path = report_dir / f"{report.run_id}.json"
    report_path.write_text(
        json.dumps(asdict(report), ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    return report_path


def run_agent(
    project: Path,
    test_command: str,
    codex_binary: str | None = None,
    report_dir: Path | None = None,
    max_changed_files: int = 8,
) -> int:
    started = time.monotonic()
    project = project.expanduser().resolve()
    require_clean_git_repo(project)
    test_args = parse_command(test_command)
    if not test_args:
        raise ValueError("测试命令不能为空。")
    if max_changed_files < 1:
        raise ValueError("最大修改文件数必须至少为 1。")
    executable = codex_binary or find_codex_binary()
    if not executable:
        raise RuntimeError("未找到 Codex CLI，请先安装并登录。")

    report = RunReport(
        run_id=datetime.now(UTC).strftime("%Y%m%dT%H%M%S%fZ"),
        project=str(project), test_command=test_command,
    )
    destination = report_dir or Path(__file__).resolve().parent / "runs"
    patch = ""
    exit_code = 1
    try:
        with isolated_worktree(project) as worktree:
            print("[1/4] 在隔离 worktree 中运行测试……")
            initial = run_command(test_args, worktree)
            report.initial_test_returncode = initial.returncode
            if initial.returncode == 0:
                report.status, report.note, exit_code = (
                    "already_passing", "测试已经通过，无需修改。", 0
                )
                return exit_code

            print("[2/4] 测试失败，交给 Codex 定位并修复……")
            fix = invoke_codex(executable, worktree, build_fix_prompt(test_command, initial.output))
            report.agent_returncode = fix.returncode
            report.agent_output_tail = fix.output[-2000:]
            files = changed_files(worktree)
            report.changed_files = files
            protected = [path for path in files if is_protected_test_file(path)]
            report.protected_files_modified = protected
            patch = run_command(["git", "diff", "--binary", "--no-ext-diff"], worktree).output
            if fix.returncode != 0:
                report.status, report.note = "agent_failed", "Codex 没有完成修复。"
                return exit_code
            if not files:
                report.status, report.note = "no_changes", "Codex 结束运行，但没有修改文件。"
                return exit_code
            if protected:
                report.status, report.note = (
                    "protected_files_modified", "Agent 修改了受保护的测试文件。"
                )
                return exit_code
            if len(files) > max_changed_files:
                report.status = "change_limit_exceeded"
                report.note = f"Agent 修改了 {len(files)} 个文件，超过限制 {max_changed_files}。"
                return exit_code

            print("[3/4] 检查测试文件和修改范围……通过")
            print("[4/4] 再次运行测试……")
            final = run_command(test_args, worktree)
            report.final_test_returncode = final.returncode
            if final.returncode != 0:
                report.status, report.note = "tests_failed", "修改完成，但测试仍然失败。"
                return exit_code
            report.status, report.note, exit_code = (
                "passed", "测试通过；补丁已保存，原项目未被修改。", 0
            )
            return exit_code
    finally:
        report.duration_seconds = round(time.monotonic() - started, 3)
        report_path = save_report(report, destination, patch)
        print(f"结果：{report.note}")
        print(f"报告：{report_path}")
        if report.patch_file:
            print(f"补丁：{report.patch_file}")


def parse_args(argv: Sequence[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="在隔离 Git worktree 中让 Codex 根据失败测试修复 Bug。"
    )
    parser.add_argument("project", type=Path, help="需要修复的 Git 项目路径")
    parser.add_argument("--test-command", default="python -m pytest")
    parser.add_argument("--report-dir", type=Path, help="报告和补丁保存目录")
    parser.add_argument("--max-changed-files", type=int, default=8)
    return parser.parse_args(argv)


def main(argv: Sequence[str] | None = None) -> int:
    args = parse_args(argv)
    try:
        return run_agent(
            args.project, args.test_command, report_dir=args.report_dir,
            max_changed_files=args.max_changed_files,
        )
    except (ValueError, RuntimeError) as error:
        print(f"错误：{error}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
