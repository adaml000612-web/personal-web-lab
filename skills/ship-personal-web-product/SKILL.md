---
name: ship-personal-web-product
description: Turn a conversational website idea into a scoped, implemented, verified, and releasable personal web product. Use when building, extending, debugging, or publishing the user's websites, dashboards, browser-connected tools, personal automations, or small full-stack products, especially when the request starts broad, depends on real data, must preserve history, should minimize manual operation, or needs end-to-end acceptance in the real browser and production environment.
---

# Ship Personal Web Product

Convert the user's desired experience into explicit acceptance criteria before implementation. Treat completion as a usable end-to-end outcome, not merely code that builds.

## Working defaults

Apply these defaults unless the user says otherwise:

- Prefer a finished, directly usable workflow over a code-only handoff.
- Use the user's existing Chrome session for browser work when login state or extensions matter.
- Use real data sources for real product behavior. Label mock, cached, fallback, and simulated data clearly.
- Preserve existing files, records, submissions, and versions. Check before overwriting.
- Support history import and idempotent deduplication when a feature stores recurring records.
- Minimize repeated setup and clicks. Automate normal operation when safe and explain unavoidable user actions.
- Show status in plain language: what succeeded, what is pending, what failed, and what the user must do next.
- Keep secrets out of chat, source code, logs, screenshots, and Git history. Ask the user to enter secrets only in an appropriate protected UI.
- Distinguish local preview, repository state, saved release, and production deployment. Never imply that one means another.
- Verify important claims in the real interface or production environment when practical.

These are defaults, not permission to expand the product silently. Flag choices that materially change cost, scope, security, or maintenance.

## 1. Inspect before designing

Inspect the current project, repository status, connected services, deployment configuration, and applicable instructions before changing files.

Preserve unrelated user changes. Identify whether the request is:

- a new product;
- an extension of an existing product;
- a bug diagnosis;
- a release or deployment;
- a product-level change disguised as a small UI request.

For an existing product, reproduce the current behavior before proposing a replacement.

## 2. Expand the conversational request

Translate the request into a compact working brief:

- **Outcome:** What should become possible?
- **User:** Who uses it and at what technical level?
- **Core journey:** What is the shortest successful end-to-end path?
- **In scope:** What must this iteration deliver?
- **Out of scope:** What is intentionally deferred?
- **Data:** Which sources are real, persistent, private, or third-party?
- **Automation:** What starts, refreshes, syncs, retries, or recovers automatically?
- **Preservation:** What history or existing behavior must not be lost?
- **Environments:** What must work locally, in Chrome, in GitHub, and in production?
- **Acceptance:** Which observable examples prove completion?

Ask only questions whose answers would materially change the result. Otherwise state reasonable assumptions and continue.

## 3. Choose the delivery level

Classify the requested iteration and keep its boundary visible:

- **Prototype:** Validate structure, interaction, and visual direction. Mock data is allowed only when labeled.
- **MVP:** Run the core journey with real data and realistic failure handling.
- **Production-ready iteration:** Add authentication, secret handling, observability, resilience, accessibility, deployment verification, and recovery proportional to risk.

Do not present a prototype shortcut as a complete production feature. If a real search is requested, do not substitute a small hard-coded alias list without explicit agreement.

## 4. Design the whole flow

Before implementing isolated controls, cover the cross-cutting states that affect the complete journey:

- loading, empty, success, partial, stale, and failure states;
- first run, repeat use, historical import, and duplicate events;
- signed-in, signed-out, expired authorization, and insufficient permission;
- desktop and essential mobile behavior;
- third-party timeout, retry, rate limit, and unavailable source;
- local versus deployed configuration;
- restart, refresh, hidden-tab, and concurrent-request behavior where applicable.

Prefer one coherent vertical slice over many disconnected feature fragments.

## 5. Implement in three passes

1. **Structure:** Establish information hierarchy, navigation, data model, and the core journey.
2. **Reality:** Connect real data and persistence, then handle the important edge cases.
3. **Finish:** Unify visual rules, status feedback, responsive behavior, accessibility, and operational safeguards.

Batch feedback by pass. Avoid treating every small visual or functional observation as an unrelated patch when it reveals a missing product rule.

## 6. Verify with adversarial real examples

Create an acceptance matrix from the request and test representative cases. Include:

- the obvious happy path;
- a realistic case not used during implementation;
- ambiguous or multiple results;
- no result or empty history;
- duplicate or repeated operation;
- unavailable data source or expired login;
- preservation of existing data;
- production behavior after deployment, when deployment is in scope.

For search, test names, aliases, identifiers, spacing, multiple markets or categories, and an unknown value as applicable. For automation, test new events, historical events, duplicates, restart behavior, and partial synchronization.

Do not mark a feature complete solely because unit tests or a build pass. Use the actual browser or external system for the core journey when available.

## 7. Release deliberately

Before publishing:

- confirm the exact files and repository scope;
- inspect uncommitted and unpushed changes;
- run proportionate checks;
- verify that secrets and generated artifacts are excluded;
- record the version or commit associated with the release;
- deploy only the intended saved version;
- test the production URL, authentication, core APIs, and current logs;
- confirm that a fresh page does not reference stale assets.

Do not push unrelated commits or publish merely because a local preview works.

## 8. Report completion for a non-technical user

Lead with the usable outcome. Report:

- what the user can do now;
- which real examples were verified;
- whether the result is local, committed, pushed, or deployed;
- whether existing data was preserved;
- what remains incomplete or risky;
- the smallest action the user must take, if any.

Use technical details only when they help the user decide or diagnose.

## 9. Learn without bloating the skill

After substantial work, identify:

- requirements discovered late;
- repeated failure patterns;
- defaults worth reusing;
- project-specific exceptions that should not become global rules.

Suggest updating this skill only for repeated, transferable lessons. Do not embed raw conversation histories, credentials, project secrets, temporary URLs, or one-off implementation details.
