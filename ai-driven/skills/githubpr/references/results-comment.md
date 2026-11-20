# Loop Results PR Comment

Post the **full loop report as a PR comment** — everything in markdown, plus the QA replay videos attached inline. Post it after `gh pr ready <PR_NUMBER>` and before CI polling: all loop artifacts already exist at PR time, and the evidence must be visible during review.

The comment must be **self-sufficient**: a reviewer who has no access to the local machine must be able to read every result (scores, findings, QA, bugs, spec, timeline) directly in the PR. Local `file://` paths are only a bonus for the user's own machine — never the sole source of a result.

If there is no loop (standalone task), post the comment anyway with whatever results exist (code review, tests, lint) and skip the loop-specific sections.

## 1. Collect the loop results

Gather every result before writing the comment. Sources (absolute paths):

| Result | Source | Pointer line / path |
|--------|--------|----------------------|
| Spec | `<LOOP_DIR>/specs/<slug>.md` | `SPEC_FILE: <path>` |
| Code review (6 dimensions + overall score, critical count, findings) | `<LOOP_DIR>/code-reviews/<slug>.md` | `REVIEW: <path>` |
| QA bugs (tickets or `none`) | `<LOOP_DIR>/bug-reports/<slug>.md` | `BUG_REPORT: <path\|none>` |
| Loop iterations + per-step timeline | `<LOOP_DIR>/loop-trace.md` | trace events |
| Loop report (HTML — same content, visual version) | `<LOOP_DIR>/loop-report.html` | `LOOP_REPORT: <path>` |
| QA video report (self-contained HTML, all videos embedded) | `<e2e>/qa-video-report.html` | `QA_VIDEO_REPORT: <path>` |
| QA replay videos | `<e2e>/test-results/**/*.webm` | glob on disk |

Also collect from the session: lint result, Sonar result, Trivy result, unit test result, e2e replay result, number of loop iterations.

**Read the spec, review, and bug report files IN FULL** — the comment carries their real content, not summaries of summaries.

## 2. Build the comment (full loop report in markdown)

Rebuild the content of `<LOOP_DIR>/loop-report.html` as markdown, directly from the artifacts. Write the body to a temp file (e.g. `/private/var/folders/.../pr-results-comment.md`) with the `write` tool.

Long sections (spec, full review, bug tickets, trace) go inside `<details><summary>` blocks — GitHub renders them in comments and keeps the comment scannable.

Template:

````markdown
## 🔄 Loop Report — <loop_id or feature slug>

<loop_id> · <date> · stack: <stack> · outcome: <PR created / QA green / score>

### Gates
| Gate | Result |
|------|--------|
| Code review | ✅ <overall>/10 (0 critical) |
| QA (manual + e2e) | ✅ <N>/<N> e2e specs passed |
| Bugs | ✅ none / ❌ <N> (tickets below) |
| Lint | ✅ 0 issues |
| Sonar | ✅ 0 issues |
| Trivy | ✅ 0 vulnerabilities |
| Unit tests | ✅ <N>/<N> passed |
| Loop iterations | <N> |

### Code review — <overall>/10, 0 critical

| Dimension | Score |
|-----------|-------|
| Correctness | x/10 |
| Security | x/10 |
| Performance | x/10 |
| Maintainability | x/10 |
| Testability | x/10 |
| Architecture | x/10 |

<details><summary><b>Full review findings</b> (from code-reviews/<slug>.md)</summary>

<FULL review content pasted here, markdown preserved>

</details>

### QA
- Manual QA: <what was tested — happy path / edge / error cases, with results>
- New e2e specs: `<N>` in `soludev-compose-apps/<app>/e2e/tests/<feature>/` — all green
- Bugs: none / <one line per bug with severity>

<details><summary><b>Bug tickets</b> (from bug-reports/<slug>.md, if any)</summary>

<FULL bug report content pasted here>

</details>

<details><summary><b>Spec</b> (from specs/<slug>.md)</summary>

<FULL spec content pasted here>

</details>

<details><summary><b>Loop timeline</b> (from loop-trace.md)</summary>

<compact table: step → agent/skill → status → key detail, loop-backs highlighted; one row per step, not per event>

</details>

### Local artifacts (reporter's machine)
- Loop report (visual HTML): `file://<LOOP_DIR>/loop-report.html`
- QA video report (all videos embedded): `file://<e2e>/qa-video-report.html`

### Videos

<video embeds — see §4, one `![]()` reference per video, each alone in its paragraph>
````

## 3. Size limit — 65,536 characters

GitHub rejects comment bodies longer than **65,536 characters** (API 422 `Body is too long`). Before posting:

```bash
wc -c pr-results-comment.md
```

- **≤ ~60,000 chars**: post as ONE comment.
- **> ~60,000 chars**: split at a section boundary (never mid-table, mid-code-block, or mid-`<details>`) into sequential comments, each titled `## 🔄 Loop Report (part N/M)`. Post them in order. Attach the videos to the **last** comment (the Videos section lives there).
- Prefer splitting over trimming: the full review, spec, and bug tickets always ship in full; if anything gets compressed, compress the trace timeline table first (one row per step).

## 4. Videos

Attach the QA replay videos (`.webm`) so they render **inline as players** in the comment.

### Preconditions (all must hold)

1. **`gh` ≥ 2.99.0** — the `--attach` flag does not exist before that. Check with `gh --version`.
2. **Push access** to the repository (the token must be able to write to the repo).
3. **Size limit per video**: ≤ 10 MB on Free plans, ≤ 100 MB on paid plans. Check with `stat -f%z <file>` (macOS) or `stat -c%s <file>` (Linux).
4. Not GitHub Enterprise Server (`--attach` is unsupported on GHES).
5. **Max 50 attached files per command** — if there are more videos, attach the most important ones (one per test case) and reference `qa-video-report.html` for the rest.

### Embed syntax

For each video, the body file must contain a Markdown image reference whose path **exactly matches** the `--attach` path, and it must be **the only content in its paragraph** — otherwise it renders as a link, not a player:

```markdown
**<spec name> — <test title>**

![](/abs/path/to/soludev-compose-apps/<app>/e2e/test-results/<...>.webm)
```

### Command

```bash
gh pr comment $PR_NUMBER \
  --body-file <path-to-pr-results-comment.md> \
  --attach /abs/path/to/video-1.webm \
  --attach /abs/path/to/video-2.webm
```

`gh` rewrites each `![](<path>)` reference in place with the uploaded URL. Any attached file NOT referenced in the body is appended at the end (still fine).

### Ordering and fallbacks

- Videos live under `<e2e>/test-results/**/*.webm` — glob them (`find <e2e>/test-results -name '*.webm'`), order them by spec, and put a short bold caption (`**<spec> — <test>**`) above each.
- Prefer the smallest video per test case when several recordings of the same test exist (re-runs) — pick the **latest** one.
- **Oversized video** (> limit): skip the `--attach`/embed for it, and instead list its local path in the comment body under a `> ⚠️ Video too large for GitHub upload (<size>): <local path>` note. The `qa-video-report.html` always contains it.
- **`gh` too old** (< 2.99.0): post the comment WITHOUT any `--attach` flag, add the `QA_VIDEO_REPORT` local path under Videos, and tell the user to run `brew upgrade gh` then re-attach manually.
- `qa-video-report.html` and `loop-report.html` are HTML files — **never pass them to `--attach`** (only images/videos are supported). Their content is already in the comment (§2); reference them as `file://` local paths.

## 5. Verify

After posting, confirm every comment exists and is well-formed:

```bash
gh pr view $PR_NUMBER --json comments --jq '.comments | length'
gh pr view $PR_NUMBER --json comments --jq '.comments[-1].body' | head -40
```

Check that each `![]()` was rewritten to a `github.com/user-attachments/...` URL (proof the videos uploaded) — if a local path remains in the body, the attachment failed: re-run with the correct matching path.
