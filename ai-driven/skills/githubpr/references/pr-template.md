# PR Template and Full Agent Flow

## PR creation

```bash
gh pr create \
  --title "<short summary>" \
  --body "$(cat <<'EOF'
## Changes
- <point 1>
- <point 2>

## Tests
- [ ] Unit tests
- [ ] Integration tests
EOF
)" \
  --base main \
  --draft
```

> Always open as **draft** by default. Mark as "ready for review" only once the CI is green and the code is finalized.

Mark as ready for review:
```bash
gh pr ready <PR_NUMBER>
```

## Full agent flow

```bash
DESC="add-user-auth"
BRANCH="$DESC"

# 1. Branch
git checkout main && git pull origin main
git checkout -b $BRANCH

# 2. [Dev / Tests / Sonar / Trivy here]
#    Commits: Gitmoji + Conventional Commits (see SKILL.md section 2), e.g.:
#    git commit -m "✨ feat: add user authentication endpoint"

# 3. Push + PR
git push origin $BRANCH
PR_URL=$(gh pr create --title "..." --body "..." --base main --draft)
PR_NUMBER=$(gh pr view --json number -q .number)

# 4. Ready for review
gh pr ready $PR_NUMBER

# 5. Post loop report comment (see references/results-comment.md)
#    - full loop report in markdown: gates, review scores + findings, QA, bugs,
#      spec, timeline (65,536-char limit -> split into part N/M comments)
#    - embed videos: ![](/abs/.../test-results/<video>.webm) alone in its paragraph
gh pr comment $PR_NUMBER \
  --body-file pr-results-comment.md \
  --attach /abs/path/to/test-results/video-1.webm  # repeat --attach per video (gh >= 2.99.0)

# 6. Wait for CI
bash wait-ci.sh $PR_NUMBER
CI_EXIT=$?

# 7. Report and STOP — no automatic merge. The user decides when to merge.
if [ $CI_EXIT -eq 0 ]; then
  echo "CI green on $TICKET — PR ready: $PR_URL (merge only on explicit user request)"
else
  echo "CI failed on $TICKET — skipping"
fi
```