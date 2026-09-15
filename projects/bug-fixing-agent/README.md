# Bug Fixing Agent

> **任务定义：让 Agent 自动读取一个 Git 项目、从失败测试中找到一个 Bug、修改代码并通过测试。**

这是一个用 Python 编排本机 Codex CLI 的可评测原型。它不会直接修改原项目，而是在临时 Git worktree 中完成测试、修复和回归测试，最后保存 JSON 报告与补丁供人工审查。

## 入门闭环与本次收尾（2026-09-15）

参考学习对话《搭建 Agent 项目骨架》中，最初完成的是 Python + DeepSeek 的最小 Coding Agent。学习者已反馈看到 `Bug fixed successfully`。本次整理日期为 2026-09-15；缓存对话没有原始学习日期与完整源码，因此不把这一天写成原始实验日期，也不宣称本次重新跑通了 DeepSeek。

入门流程：

1. **运行 pytest（Observe）**：收集退出码、标准输出和错误输出；加法误写成减法时，`add(2, 3)` 得到 `-1`，测试预期为 `5`。
2. **读取源码**：将相关实现与失败测试信息提供给模型。
3. **调用 DeepSeek LLM 分析（Reason）**：根据测试失败定位原因，并生成候选修复代码。
4. **备份原文件（Act）**：写回前保存原始内容，保留回滚依据。
5. **自动写回修复代码（Act）**：由 Python 执行实际文件修改。
6. **重新运行 pytest（Verify）**：使用外部测试验证候选修改。
7. **失败回滚 / 成功提示**：再次测试失败则恢复备份；通过则输出 `Bug fixed successfully`。模型声称修好了不能替代测试结果。

这是入门设计与学习成果记录。当前仓库中的 `agent.py` 已演进为调用 **Codex CLI**、在临时 Git worktree 中修复、输出报告与补丁的版本。它没有 DeepSeek 调用，也不在原项目中执行上述备份与写回；隔离副本承担保护原项目的职责。原始 DeepSeek `agent.py` 与 `demo_project/calculator.py` 在本次检查的 Documents、Desktop、Downloads 与 D 盘 Documents 范围内未找到，不补造历史源码、不覆盖现有版本。

### 关键概念

- **LLM**：根据上下文生成分析与代码的模型；可能生成不存在的函数或错误接口。
- **Agent**：Python 把观察、模型推理、工具执行与结果验证连接起来，使模型输出产生实际动作。
- **Observe → Reason → Act → Verify**：失败测试 → 根因与候选修复 → 备份和写入 → 再次测试。
- **测试是外部验证**：通过只说明当前测试覆盖的行为符合预期，不代表全部代码正确。应保护测试，防止通过修改测试掩盖 Bug。

### 入门排错记录

| 现象 | 原因与处理 |
| --- | --- |
| pytest 收集到 0 tests | 测试文件实际是 `.txt`（如 `test_calculator.py.txt`），或不符合发现命名规则；显示文件扩展名并改成 `test_*.py`，再检查收集结果。 |
| `read_file` 未定义 | 使用了尚未定义或导入的辅助函数；先实现文件读取函数，确认名称一致。 |
| `No module named dotenv` | 当前 Python 环境未安装 `python-dotenv`；在入门项目的同一环境安装该包，导入名为 `dotenv`。 |
| DeepSeek key 未读取 | 本地配置文件名错误（例如 `.env.txt`）；确认实际名称为 `.env`、加载路径正确、变量名与代码一致。 |
| `chat.responses` 接口错误 | 将不同 API 的调用层级混用；原入门方案使用 OpenAI 兼容客户端的 `client.chat.completions.create(...)`。具体配置以原版本及服务文档为准。 |
| PowerShell `ParserError / Missing argument in parameter list` | 在终端输入了 Python 多变量赋值；将 `new_code, new_stdout, new_stderr = run_tests()` 写入 `agent.py` 的 `main()`，终端执行 `python agent.py`。 |
| `assert -1 == 5` | pytest 已正常执行，实现仍是减法；这是实际 Bug，不是终端或测试安装失败。 |

### 凭证保护与验证范围

项目 `.gitignore` 明确忽略 `.env`、`.env.*`、`.venv/`、`__pycache__/` 和 `.pytest_cache/`。`.env.example` 仅允许占位示例，真实 key 只保留本地；已被 Git 跟踪的文件不会因新增忽略规则而自动取消跟踪，因此提交前同时检查跟踪列表与待提交内容。

当前版本只依赖 `requirements.txt` 中的 pytest 与已登录的 Codex CLI，无需为本次文档收尾增加 DeepSeek 或 dotenv 依赖。下面的使用说明适用于当前 Codex 版本。历史 3/5 基准成绩与人工重试结果保留原日期，不算本次重新测得的成绩。

下一步：先保存能找回的原始入门源码；再逐项考虑自动选文件、修改范围约束、最多 3 次尝试、逐轮测试日志与最终修复报告。当前版本已有部分范围约束和报告能力，自动重试仍待实现。

## 项目结构

```text
bug-fixing-agent/
├─ agent.py                 # 单次隔离修复
├─ benchmark.py             # 批量评测
├─ inspect_project.py       # 只读问题检查
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
