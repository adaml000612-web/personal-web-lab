# 可复用训练组件结构

## 内容模型

一节关卡由有序 `steps` 组成。普通教学步骤使用 `type` 区分：

- `concept`：知识点教学
- `case`：教学案例
- `question`：互动训练
- `complete`：关卡总结与完成动作

## 题目模型

互动训练统一使用 `type: "question"`，再通过 `questionType` 路由到对应渲染器：

- `singleChoice`：单选题，第二阶段已实现
- `trueFalse`：判断题，第三阶段已实现
- `simulatedTrade`：模拟交易题，预留
- `candlestick`：K 线训练题，预留

所有题型共享以下生命周期：

选择/操作 → 提交 → 校验 → 针对性反馈 → 正确答案解析 → 记录结果 → 继续

## 渲染接口

`app.js` 中的 `TRAINING_RENDERERS` 是题型注册表。新增题型时：

1. 在关卡数据中声明新的 `questionType`。
2. 为该类型补充数据字段。
3. 在 `TRAINING_RENDERERS` 中实现同名渲染函数。
4. 沿用统一的提交、重试、反馈和完成状态。

单选题和判断题共用选择、提交、反馈和重试生命周期；模拟交易与 K 线题仍只保留注册入口，后续按真实交互逐个实现。

## 进度模型

浏览器本地记录：

- `completedLevels`：完成的关卡 ID
- `answers`：题目结果与完成时间
- `currentLesson`：当前关卡、步骤位置和更新时间

关卡解锁规则：第一关默认开放；其余关卡只有在上一关完成后解锁。

