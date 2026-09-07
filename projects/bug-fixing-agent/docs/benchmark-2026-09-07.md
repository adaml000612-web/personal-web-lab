# Benchmark report — 2026-09-07

## Result

| Case | Bug type | First attempt | Retry | Changed implementation | Test files changed |
| --- | --- | --- | --- | --- | --- |
| 01 | Boundary condition | Passed | — | `statistics.py` | No |
| 02 | Missing JSON field | Passed | — | `profiles.py` | No |
| 03 | Cache invalidation | Passed | — | `preferences.py` | No |
| 04 | Cross-platform path | Agent process failed | Passed | `paths.py` | No |
| 05 | Exception handling | Agent process failed | Passed | `parser.py` | No |

- First-pass success: **3/5 (60%)**.
- Cumulative success after manually retrying the two failed cases: **5/5**.
- All five successful patches passed `git apply --check` against their original fixtures.
- Each successful repair changed one implementation file and no protected test file.

## Interpretation

The first pass does not support a 100% reliability claim. Cases 04 and 05 ended before producing code changes, then passed when rerun without changing their fixtures. The first run did not retain the Codex subprocess error output, so its exact cause is unknown. The reporting schema now records the subprocess return code and the final 2,000 characters of its output for future diagnosis.

The benchmark validates orchestration, isolation, patch capture, basic test-file protection, and repeatability across five small bug types. It does not yet measure performance on large or unfamiliar repositories.
