"""Run one guarded test-fix-test loop with the local Codex CLI."""

from __future__ import annotations

import argparse
import os
import shlex
import shutil
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Sequence


@dataclass(frozen=True)
class CommandResult:
    returncode: int
    output: str


def run_command(command: Sequence[str], cwd: Path) -> CommandResult:
    """Run a command without invoking a shell and combine its output."""
    completed = subprocess.run(
        list(command),
        cwd=cwd,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        check=False,
    )
    output = "\n".join(part for part in (completed.stdout, completed.stderr) if part)
    return CommandResult(completed.returncode, output.strip())


def require_clean_git_repo(project: Path) -> None:
    """Refuse targets where rollback and review would be ambiguous."""
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
    """Create a bounded task for the coding agent."""
    excerpt = failure_output[-6000:]
    return f"""修复当前仓库中导致测试失败的 Bug。

要求：
- 先阅读相关代码和测试，确认根因。
- 只做解决失败所需的最小修改，不改测试来掩盖问题。
- 不提交、不推送、不删除无关文件。
- 修改后运行：{test_command}
- 最后简要说明根因、修改和测试结果。

首次测试失败输出：
{excerpt}
"""


def find_codex_binary() -> str | None:
    """Find Codex on PATH or inside the Windows desktop app installation."""
    on_path = shutil.which("codex")
    if on_path:
        return on_path

    local_app_data = os.environ.get("LOCALAPPDATA")
    if os.name == "nt" and local_app_data:
        bin_root = Path(local_app_data) / "OpenAI" / "Codex" / "bin"
        candidates = sorted(
            bin_root.glob("*/codex.exe"),
            key=lambda path: path.stat().st_mtime,
            reverse=True,
        )
        if candidates:
            return str(candidates[0])

    return None


def run_agent(project: Path, test_command: str, codex_binary: str | None = None) -> int:
    """Execute one test-fix-test cycle and return a process-style status code."""
    project = project.expanduser().resolve()
    require_clean_git_repo(project)

    test_args = shlex.split(test_command, posix=os.name != "nt")
    if not test_args:
        raise ValueError("测试命令不能为空。")

    print("[1/3] 运行测试……")
    initial = run_command(test_args, project)
    if initial.returncode == 0:
        print("测试已经通过，无需修改。")
        return 0

    executable = codex_binary or find_codex_binary()
    if not executable:
        raise RuntimeError("未找到 Codex CLI，请先安装并登录。")

    print("[2/3] 测试失败，交给 Codex 定位并修复……")
    prompt = build_fix_prompt(test_command, initial.output)
    fix = run_command(
        [
            executable,
            "exec",
            "--ephemeral",
            "--approve-for-me",
            "--cd",
            str(project),
            prompt,
        ],
        project,
    )
    if fix.returncode != 0:
        print(fix.output, file=sys.stderr)
        print("Codex 没有完成修复。", file=sys.stderr)
        return 1

    print("[3/3] 再次运行测试……")
    final = run_command(test_args, project)
    if final.returncode != 0:
        print(final.output, file=sys.stderr)
        print("修改完成，但测试仍然失败。请检查 git diff。", file=sys.stderr)
        return 1

    print("测试通过。请使用 git diff 审查修改，再决定是否提交。")
    return 0


def parse_args(argv: Sequence[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="让 Codex 根据失败测试修复一个状态干净的 Git 项目。"
    )
    parser.add_argument("project", type=Path, help="需要修复的 Git 项目路径")
    parser.add_argument(
        "--test-command",
        default="python -m pytest",
        help='测试命令，默认值为 "python -m pytest"',
    )
    return parser.parse_args(argv)


def main(argv: Sequence[str] | None = None) -> int:
    args = parse_args(argv)
    try:
        return run_agent(args.project, args.test_command)
    except (ValueError, RuntimeError) as error:
        print(f"错误：{error}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
