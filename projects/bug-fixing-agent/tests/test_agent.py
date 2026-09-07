from pathlib import Path

import pytest

import agent


def test_build_prompt_contains_command_and_failure() -> None:
    prompt = agent.build_fix_prompt("python -m pytest", "FAILED test_total")

    assert "python -m pytest" in prompt
    assert "FAILED test_total" in prompt
    assert "不改测试" in prompt


def test_require_clean_git_repo_rejects_non_repository(tmp_path: Path) -> None:
    with pytest.raises(ValueError, match="Git 仓库"):
        agent.require_clean_git_repo(tmp_path)


def test_find_codex_binary_uses_path_first(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(agent.shutil, "which", lambda name: "C:/tools/codex.exe")

    assert agent.find_codex_binary() == "C:/tools/codex.exe"


def test_run_agent_stops_when_tests_already_pass(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    calls: list[list[str]] = []

    monkeypatch.setattr(agent, "require_clean_git_repo", lambda project: None)

    def fake_run(command: list[str], cwd: Path) -> agent.CommandResult:
        calls.append(command)
        return agent.CommandResult(0, "3 passed")

    monkeypatch.setattr(agent, "run_command", fake_run)

    result = agent.run_agent(tmp_path, "python -m pytest", codex_binary="codex")

    assert result == 0
    assert calls == [["python", "-m", "pytest"]]


def test_run_agent_invokes_codex_and_verifies_fix(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    calls: list[list[str]] = []
    results = iter(
        [
            agent.CommandResult(1, "FAILED tests/test_math.py"),
            agent.CommandResult(0, "fixed"),
            agent.CommandResult(0, "1 passed"),
        ]
    )

    monkeypatch.setattr(agent, "require_clean_git_repo", lambda project: None)

    def fake_run(command: list[str], cwd: Path) -> agent.CommandResult:
        calls.append(command)
        return next(results)

    monkeypatch.setattr(agent, "run_command", fake_run)

    result = agent.run_agent(tmp_path, "python -m pytest", codex_binary="codex")

    assert result == 0
    assert calls[0] == ["python", "-m", "pytest"]
    assert calls[1][0:2] == ["codex", "exec"]
    assert "--approve-for-me" in calls[1]
    assert calls[2] == ["python", "-m", "pytest"]

