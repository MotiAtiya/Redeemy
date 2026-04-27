# Commit Workflow

**Goal:** Stage relevant changes, write a meaningful commit message, and commit — following the project's conventions.

---

## INSTRUCTIONS

1. Run the following in parallel:
   - `git status` — see what files are modified/untracked
   - `git diff HEAD` — see all staged + unstaged changes
   - `git log --oneline -5` — understand this project's commit message style

2. Analyze the diff:
   - Identify what changed and why (feature, fix, refactor, docs, chore)
   - Group related changes together
   - Note any files that should NOT be committed (`.env`, secrets, binaries)

3. **Sweep for leftover changes** — before staging anything, check the full working tree:
   - Look at ALL modified, untracked, and deleted files in `git status`
   - For each file not explicitly requested by the user, ask yourself: *is this file related to the task just completed?*
   - If yes — include it in the commit (do not leave related changes uncommitted)
   - If uncertain — mention it to the user and ask whether to include it
   - Never silently leave behind modified files that are clearly part of the same change

4. Stage files:
   - Prefer staging specific files by name over `git add -A`
   - Do NOT stage `.env*`, credential files, or large binary files
   - Stage all files identified in step 3 as related

5. Draft a commit message following this project's style:
   - Format: `type(scope): short description` (e.g. `feat(subscriptions): add special period step`)
   - Types: `feat`, `fix`, `refactor`, `docs`, `chore`, `style`, `test`
   - Keep subject line under 72 characters
   - Write in English
   - Focus on WHY, not just WHAT

6. Show the user:
   - Full list of files being committed
   - Any files left uncommitted and why
   - The proposed commit message
   - Ask for confirmation before committing (unless user already said "just commit" or similar)

7. Commit using a HEREDOC to preserve formatting:
   ```bash
   git commit -m "$(cat <<'EOF'
   type(scope): description

   Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
   EOF
   )"
   ```

8. After committing, run `git status` again and report any files still uncommitted — so the user always knows the full state.

9. If the user asked to push, run `git push` after a successful commit.

## RULES

- NEVER use `--no-verify` unless the user explicitly asks
- NEVER amend a previous commit — always create a new one
- NEVER commit if there is nothing to commit (no changes)
- If a pre-commit hook fails, fix the issue and create a NEW commit (do not amend)
- Do NOT push unless the user explicitly asks to push
- ALWAYS report remaining uncommitted files after the commit completes
