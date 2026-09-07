# Bug Fixing Agent

> **任务定义：让 Agent 自动读取一个 Git 项目、从失败测试中找到一个 Bug、修改代码并通过测试。**

这是一个用 Python 编排本机 Codex CLI 的可评测原型。它不会直接修改原项目，而是在临时 Git worktree 中完成测试、修复和回归测试，最后保存 JSON 报告与补丁供人工审查。

## 项目结构

```text
bug-fixing-agent/
├─ agent.py                 # 单次隔离修复
├─ benchmark.py             # 批量评测
├─ requirements.txt
├─ benchmarks/              # 五类可复现 Bug
└─ tests/                   # Agent 自身测试
```

## 准备环境

需要 Python 3.11 或更高版本，以及已经登录的 Codex。脚本会先从系统命令路径查找 Codex CLI；在 Windows 上也会自动查找 Codex 桌面应用自带的 CLI。

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python -m pytest
```

## 运行一次修复

目标必须是状态干净的 Git 仓库：

```powershell
python agent.py C:\path\to\target-project --test-command "python -m pytest"
```

流程如下：

1. 验证目标仓库没有未提交内容。
2. 从当前提交创建临时 detached worktree。
3. 在隔离副本中运行测试并收集失败信息。
4. 调用 Codex 做一次最小修复。
5. 拒绝任何测试文件改动或超出数量限制的修改。
6. 重新运行测试。
7. 保存 JSON 报告和 `.patch`，随后销毁临时 worktree。

原项目在整个过程中保持不变。确认补丁后可以自行应用：

```powershell
git apply --check C:\path\to\run.patch
git apply C:\path\to\run.patch
```

## 批量评测

运行全部五个 Bug 案例：

```powershell
python benchmark.py
```

只重跑指定案例：

```powershell
python benchmark.py --case 04-windows-path --case 05-exception-handling
```

当前案例覆盖：边界条件、缺失 JSON 字段、缓存失效、Windows 路径和异常处理。每个案例都会初始化独立 Git 仓库，再由 Agent 创建隔离 worktree。

## 当前实测结果

2026-09-07 的首次完整运行：

- 3/5 首次成功，首次成功率 60%。
- 两个失败案例没有产生代码修改；单独重试后均成功。
- 允许一次人工重试后的累计结果为 5/5。
- 五个成功补丁都通过 `git apply --check`。
- 所有成功案例只修改一个实现文件，没有修改测试。

首次失败发生在 Codex 子进程提前退出。第一轮报告还没有保存子进程错误尾部，因此不能把原因断言为模型、网络或服务状态；当前版本已经补充退出码和错误尾部，后续运行可区分失败原因。

## 安全边界

- 不在原项目内直接修改代码。
- 不自动提交或推送。
- 不允许修改、删除或重命名常规测试文件。
- 默认最多修改 8 个文件，评测案例限制为 3 个。
- 测试原本通过时不调用 Codex。
- 无论成功或失败都清理临时 worktree。
- 每次只尝试一轮；是否重试由运行者决定。

## 仍未解决

- 当前反作弊依赖测试文件命名约定，不能识别所有自定义测试目录。
- 尚未检测测试数量是否减少、配置是否绕过测试发现。
- 未对补丁做静态分析或安全扫描。
- 评测集只有五个小型案例，不能代表真实大型仓库的修复能力。
- 尚未自动管理重试策略，也没有比较不同模型或提示词。
