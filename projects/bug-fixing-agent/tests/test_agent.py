import json
import subprocess
import sys
from pathlib import Path

import pytest

import agent


def make_repo(path: Path, files: dict[str, str]) -> None:
    path.mkdir()
    subprocess.run(["git", "init", "-b", "main"], cwd=path, check=True, capture_output=True)
    subprocess.run(["git", "config", "user.email", "tests@example.com"], cwd=path, check=True)
    subprocess.run(["git", "config", "user.name", "Tests"], cwd=path, check=True)
    for name, content in files.items():
        (path / name).write_text(content, encoding="utf-8")
    subprocess.run(["git", "add", "."], cwd=path, check=True)
    subprocess.run(["git", "commit", "-m", "fixture"], cwd=path, check=True, capture_output=True)


def test_build_prompt_contains_constraints() -> None:
    prompt = agent.build_fix_prompt("python -m pytest", "FAILED test_total")
    assert "FAILED test_total" in prompt
    assert "不得修改" in prompt


@pytest.mark.parametrize(
    "path", ["tests/test_math.py", "test_api.py", "src/parser_test.py", "check_case.py"]
)
def test_protects_test_files(path: str) -> None:
    assert agent.is_protected_test_file(path)


def test_does_not_protect_implementation_file() -> None:
    assert not agent.is_protected_test_file("src/calculator.py")


def test_require_clean_git_repo_rejects_non_repository(tmp_path: Path) -> None:
    with pytest.raises(ValueError, match="Git 仓库"):
        agent.require_clean_git_repo(tmp_path)


def test_find_codex_binary_uses_path_first(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(agent.shutil, "which", lambda name: "C:/tools/codex.exe")
    assert agent.find_codex_binary() == "C:/tools/codex.exe"


def test_parse_command_removes_windows_executable_quotes(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(agent.os, "name", "nt")
    assert agent.parse_command('"C:\\Program Files\\Python\\python.exe" check.py') == [
        "C:\\Program Files\\Python\\python.exe",
        "check.py",
    ]


def test_isolated_run_saves_patch_without_changing_original(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    repo, reports = tmp_path / "repo", tmp_path / "reports"
    make_repo(repo, {
        ".gitignore": "__pycache__/\n*.py[cod]\n",
        "value.py": "VALUE = 'bad'\n",
        "check_case.py": "from value import VALUE\nassert VALUE == 'good'\n",
    })

    def fake_codex(executable: str, worktree: Path, prompt: str) -> agent.CommandResult:
        (worktree / "value.py").write_text("VALUE = 'good'\n", encoding="utf-8")
        return agent.CommandResult(0, "fixed")

    monkeypatch.setattr(agent, "invoke_codex", fake_codex)
    result = agent.run_agent(
        repo, f'"{sys.executable}" check_case.py', codex_binary="codex", report_dir=reports
    )
    assert result == 0
    assert (repo / "value.py").read_text(encoding="utf-8") == "VALUE = 'bad'\n"
    report = json.loads(next(reports.glob("*.json")).read_text(encoding="utf-8"))
    assert report["status"] == "passed"
    assert report["changed_files"] == ["value.py"]
    assert next(reports.glob("*.patch")).read_text(encoding="utf-8")


def test_rejects_agent_that_modifies_test(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    repo, reports = tmp_path / "repo", tmp_path / "reports"
    make_repo(repo, {
        ".gitignore": "__pycache__/\n*.py[cod]\n",
        "value.py": "VALUE = 'bad'\n",
        "check_case.py": "from value import VALUE\nassert VALUE == 'good'\n",
    })

    def fake_codex(executable: str, worktree: Path, prompt: str) -> agent.CommandResult:
        (worktree / "check_case.py").write_text("assert True\n", encoding="utf-8")
        return agent.CommandResult(0, "cheated")

    monkeypatch.setattr(agent, "invoke_codex", fake_codex)
    result = agent.run_agent(
        repo, f'"{sys.executable}" check_case.py', codex_binary="codex", report_dir=reports
    )
    assert result == 1
    report = json.loads(next(reports.glob("*.json")).read_text(encoding="utf-8"))
    assert report["status"] == "protected_files_modified"
    assert report["protected_files_modified"] == ["check_case.py"]
