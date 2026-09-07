# Bug Fixing Agent

> **任务定义：让 Agent 自动读取一个 Git 项目、从失败测试中找到一个 Bug、修改代码并通过测试。**

这是一个刻意缩小范围的 Coding Agent 练习项目。第一版只完成一轮闭环：运行测试、把失败信息交给本机 Codex、允许它修改目标项目，然后再次运行测试验证结果。

## 项目骨架

```text
bug-fixing-agent/
├─ agent.py
├─ requirements.txt
├─ README.md
└─ tests/
   └─ test_agent.py
```

## 准备环境

需要 Python 3.11 或更高版本，以及已经登录的 Codex CLI。

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
```

## 先验证 Agent 自己

```powershell
python -m pytest
```

## 运行一次修复任务

目标必须是一个状态干净的 Git 仓库。下面的命令会在目标仓库内运行测试，并允许 Codex 修改该仓库中的文件：

```powershell
python agent.py C:\path\to\target-project --test-command "python -m pytest"
```

Agent 会依次执行：

1. 确认目标是 Git 仓库且没有未提交改动。
2. 运行测试并收集失败信息。
3. 调用 Codex 阅读项目、定位问题并做最小修改。
4. 再次运行同一测试命令。
5. 只有测试通过才报告成功。

## 第一版边界

- 每次只尝试一轮修复。
- 不自动提交或推送修改，修复后必须由人查看 `git diff`。
- 不处理没有测试的项目。
- 不允许在存在未提交改动的目标仓库中运行。
- Codex 通过自动审批检查需要执行的命令，并限制在指定的目标项目内工作。

## 下一步扩展

- 保存修复前后的测试报告。
- 在成功后生成结构化修复摘要。
- 增加最大修改文件数和允许目录限制。
- 使用临时 Git worktree 隔离每次修复。
- 加入多个 Bug 样例作为可重复评测集。
