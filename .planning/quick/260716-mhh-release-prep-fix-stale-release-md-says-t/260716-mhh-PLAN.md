---
phase: quick-260716-mhh
plan: 01
type: execute
wave: 1
depends_on: []
files_modified: [RELEASE.md, package.json, CHANGELOG.md, CLAUDE.md, .claude/CLAUDE.md]
autonomous: true
requirements: [RELEASE-DOC-ACCURACY-01, VERSION-BUMP-2.1.1-01, CLAUDE-MD-RELEASE-XREF-01, RELEASE-PR-01]

must_haves:
  truths:
    - "RELEASE.md no longer instructs a tag-based publish flow anywhere in the document; it states that the actual trigger is any push landing on the `main` branch (matching `.github/workflows/publish.yml`'s `on: push: branches: [main]` + `workflow_dispatch`), and that merging a PR into `main` IS the publish action with no separate manual step after."
    - "package.json's `version` field is `2.1.1`, and CHANGELOG.md has a new top entry `## [2.1.1] - 2026-07-16` (above `## [2.1.0]`) summarizing the post-ajustes-fanout.sh idempotency hotfix in the project's existing voice (plain-language summary bullet(s) + a `**`-file-labeled technical bullet, per the `2.0.7` entry's style)."
    - "Both root CLAUDE.md and .claude/CLAUDE.md (mirrors) contain an identical 1-3 line addition pointing at RELEASE.md, stating that any push to main auto-publishes to npm and that version bump + CHANGELOG must happen before merging."
    - "dev is pushed to origin with all of this plan's new commits, and a PR from dev into main exists on GitHub (created via gh CLI) whose title/body summarizes both the 260716-lv5 post-ajustes-fanout hotfix and this release-prep work — and that PR is left open (NOT merged) because merging triggers a real, irreversible `npm publish --access public`."
  artifacts:
    - path: "RELEASE.md"
      provides: "Corrected release doc — push-to-main is documented as the actual npm publish trigger; tag-based instructions removed/repurposed; semver guidance, CHANGELOG step, commit convention, secrets table, and rollback section kept intact."
    - path: "package.json"
      provides: "version bumped 2.1.0 -> 2.1.1"
    - path: "CHANGELOG.md"
      provides: "New [2.1.1] entry documenting the post-ajustes-fanout.sh idempotency hotfix, above the existing [2.1.0] entry"
    - path: "CLAUDE.md"
      provides: "New RELEASE.md cross-reference bullet in the Platform Requirements section"
    - path: ".claude/CLAUDE.md"
      provides: "Same RELEASE.md cross-reference bullet, kept in sync with root CLAUDE.md"
  key_links:
    - from: "RELEASE.md"
      to: ".github/workflows/publish.yml"
      via: "documented trigger mechanism (`on: push: branches: [main]` + `workflow_dispatch`)"
      pattern: "branches"
    - from: "package.json version"
      to: "CHANGELOG.md top entry"
      via: "matching version string 2.1.1, so the published npm package traces back to an accurate changelog entry"
      pattern: "2.1.1"
    - from: "CLAUDE.md / .claude/CLAUDE.md"
      to: "RELEASE.md"
      via: "one-sentence cross-reference bullet, present verbatim in both mirrored files"
      pattern: "RELEASE.md"
    - from: "dev branch (pushed to origin)"
      to: "PR dev -> main"
      via: "gh pr create --base main --head dev, left unmerged"
      pattern: "gh pr create"
---

<objective>
Bring the release process documentation back in line with reality, ship a patch release entry for the already-committed `post-ajustes-fanout.sh` hotfix (quick task 260716-lv5), make the release process discoverable from CLAUDE.md, and open (but do not merge) a PR from `dev` into `main` so a human can trigger the actual publish deliberately.

RELEASE.md currently documents a tag-triggered publish flow (`git tag vX.Y.Z && git push origin vX.Y.Z` "dispara o publish", plus a warning that pushing to `main` does NOT publish). This is factually wrong: `.github/workflows/publish.yml` triggers on `push: branches: [main]` (plus `workflow_dispatch`) — it has no tag trigger at all. Left uncorrected, following RELEASE.md's own instructions would push a tag that does nothing, then leave a human wondering why npm never updated after merging the PR that actually published it.

Purpose: prevent a repeat of the exact confusion this task is fixing, and make sure the pending hotfix reaches npm as `2.1.1` with an accurate changelog trail — without silently auto-publishing (merge remains a deliberate human action).
Output: corrected `RELEASE.md`; `package.json` at `2.1.1`; new `CHANGELOG.md` entry; `RELEASE.md` cross-referenced from both `CLAUDE.md` copies; `dev` pushed to `origin`; an open PR `dev` -> `main` with its URL surfaced in the SUMMARY.
</objective>

<execution_context>
@$HOME/.claude/gsd-core/workflows/execute-plan.md
@$HOME/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@RELEASE.md
@.github/workflows/publish.yml
@package.json
@CHANGELOG.md
@CLAUDE.md
@.claude/CLAUDE.md
@.planning/quick/260716-lv5-hotfix-post-ajustes-fanout-sh-loop-bug-h/260716-lv5-SUMMARY.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Correct RELEASE.md's publish trigger throughout</name>
  <files>RELEASE.md</files>
  <action>
    Rewrite RELEASE.md so every passage that currently assumes a tag push triggers the npm publish is replaced with the real mechanism: any push that lands on the `main` branch triggers `.github/workflows/publish.yml` automatically (`on: push: branches: [main]`, plus `workflow_dispatch` for manual runs). Concretely, touch these passages and leave everything else (semver guidance table, the CHANGELOG.md update instructions/example, the commit-message convention including the no-signature rule, the Secrets table, and "Verificar publicação") untouched:

    1. The TL;DR bash block: change the final numbered step from creating/pushing a git tag to opening a PR from `dev` into `main` and merging it — make explicit that merging into `main` is what triggers the publish, and that there is no tag step in the current workflow. Renumber the steps so bump-version, update-CHANGELOG, and commit come first, then push `dev` + open PR, then merge (the publish trigger).

    2. The sentence immediately below the TL;DR block currently attributing the trigger to a tag push: rewrite it to attribute the trigger to a push landing on `main` (which, in this repo's PR-based flow, happens the moment a PR is merged).

    3. The "Como o CI/CD funciona" section: change the prose from "dispara apenas em push de tag no formato v*" to describe the real trigger (push to `main`, plus manual `workflow_dispatch`). Replace the embedded YAML snippet (currently showing a `tags: - "v*"` trigger) with the real trigger block from `.github/workflows/publish.yml` (`on:` / `push:` / `branches:` / `- main` / `workflow_dispatch:`). Invert the warning callout directly below it: instead of claiming a push to main does not publish, state clearly that any push landing on `main` DOES publish automatically — so merging a PR into `main` is itself the publish action, no separate manual step follows — and that this makes bumping the version and updating CHANGELOG.md BEFORE that merge mandatory (an unbumped version causes a 403 Forbidden — duplicate version already on npm — on the auto-publish). Update the numbered job-step list right after (currently "Faz checkout do repo na ref da tag") to describe checkout of the merged commit on `main` instead of a tag ref.

    4. "Fluxo de release passo a passo": keep steps 1 (semver bump) and 2 (CHANGELOG.md update) as-is. In step 3 ("Commit"), add a short clause noting the commit happens on the working branch (`dev`) before the PR is opened — keep the existing `chore: release vX.Y.Z — <resumo>` message convention and the no-signature rule verbatim. Repurpose step 4 (currently "Push do commit (opcional, mas recomendado antes da tag)") into a mandatory step: push `dev` to `origin` and open a PR from `dev` into `main` (`gh pr create --base main --head dev`). Repurpose step 5 (currently "Criar e empurrar a tag") into the step describing the merge itself: merging the PR into `main` is what makes the GitHub Action run — since this is irreversible and public, treat it as a deliberate, reviewed human action, not something to automate away. Leave step 6 ("Acompanhar o run", the `gh run list` / `gh run watch` commands) unchanged in content, just following directly after the new step 5.

    5. "Erros comuns" table: fix the row that currently blames a plain push to `main` for not publishing (that claim is now backwards) — replace it with a row about the real risk in a PR-based flow: merging into `main` without having bumped the version first, which causes the very next row's `403 Forbidden` failure. Fix the last row (currently about a tag pushed with a version mismatch, telling the reader to delete and recreate the tag) — since there is no tag anymore, replace it with a row about merging a PR into `main` where the version wasn't bumped before merge: the fix is that the previous version is already published and can't be reused, so the remedy is bumping the version again and pushing a new commit (or PR) rather than trying to "redo" a merge.

    6. "Rollback" section: the closing sentence currently says the recovery path is a version bump plus a new tag. Change it to describe the recovery path as a version bump plus a new commit and PR into `main` (no tag involved) — merging that PR is what republishes the corrected version.

    Do not change the document's overall heading structure, tone, or any of the sections listed as untouched above.
  </action>
  <verify>
    <automated>! grep -q 'git tag v' RELEASE.md && grep -q 'branches' RELEASE.md && ! grep -qi 'NÃO publica' RELEASE.md && grep -q 'workflow_dispatch' RELEASE.md</automated>
  </verify>
  <done>RELEASE.md contains no tag-creation/push commands, documents `branches`-based trigger matching `.github/workflows/publish.yml`, no longer claims a push to main fails to publish, still mentions `workflow_dispatch`, and the semver/CHANGELOG/commit-convention/secrets/rollback sections that were accurate remain present and unmodified in substance.</done>
</task>

<task type="auto">
  <name>Task 2: Bump version to 2.1.1 and add the CHANGELOG entry for the post-ajustes-fanout hotfix</name>
  <files>package.json, CHANGELOG.md</files>
  <action>
    In package.json, change the `"version": "2.1.0"` field to `"version": "2.1.1"`. No other field changes.

    In CHANGELOG.md, insert a new entry directly above the existing `## [2.1.0] - 2026-07-16` heading, matching the exact Markdown shape used by every existing entry (heading line, blank line, one bold user-facing one-line summary, blank line, bullet list). Heading: `## [2.1.1] - 2026-07-16`.

    Content, styled like the `2.0.7` entry (also a hook-loop hotfix, same file touched) — plain-language framing in the bold summary and the first bullet(s), technical specifics pushed into a `**`-file-labeled bullet, not the opening line: summarize that the `/ei-ajustes` Stop hook could, in rare cases, re-block a round of adjustments that had already been completed — because its "was this already finished?" check only looked at a recent slice of the conversation history, which could scroll past the marker proving completion when the parallel reviewer fan-out (Passo 6) generated a lot of intermediate activity; this no longer happens because that check now looks at the entire conversation history instead of just the recent slice (round-id extraction itself stays scoped to the recent slice, unchanged). Follow with a `**`.claude/hooks/post-ajustes-fanout.sh`**-labeled bullet naming the concrete mechanism (idempotency check in Passo 5 now scans the full transcript via a new `FULL_ASSISTANT` variable instead of the 400-line `$TAIL` window used only for `ROUND_ID` extraction in Passo 4), a `**`.claude/hooks/post-ajustes-fanout.test.js`**-labeled bullet noting the new committed regression suite (4 cases, `node:test` + `execFileSync`, following `check-claude-md-audience.test.js` conventions, confirmed failing against the pre-fix code and passing against the fix), and a final `**`package.json`**-labeled bullet noting the version bump `2.1.0` -> `2.1.1`, matching the closing-bullet pattern used by prior entries.

    Keep chronological reverse order (this new entry stays above `[2.1.0]`); do not alter any existing entry.
  </action>
  <verify>
    <automated>grep -q '"version": "2.1.1"' package.json && grep -q '^## \[2.1.1\] - 2026-07-16' CHANGELOG.md && grep -q 'post-ajustes-fanout.sh' CHANGELOG.md</automated>
  </verify>
  <done>package.json's version field reads 2.1.1; CHANGELOG.md has a new `## [2.1.1] - 2026-07-16` entry directly above `## [2.1.0]`, following the existing entry shape (bold summary + bullets), with a plain-language opening bullet and a `.claude/hooks/post-ajustes-fanout.sh`-labeled technical bullet, a `.claude/hooks/post-ajustes-fanout.test.js`-labeled bullet, and a closing `package.json`-labeled bullet noting the version bump.</done>
</task>

<task type="auto">
  <name>Task 3: Cross-reference RELEASE.md from both CLAUDE.md copies</name>
  <files>CLAUDE.md, .claude/CLAUDE.md</files>
  <action>
    Root CLAUDE.md and .claude/CLAUDE.md are maintained as byte-identical mirrors (per the recent "docs: restore root CLAUDE.md as a mirror of .claude/CLAUDE.md" convention). In both files, locate the "## Platform Requirements" section (inside the auto-generated stack block) and insert one new bullet immediately after the existing line noting the publish target ("Publishing target: npm registry ..., automated via GitHub Actions (.github/workflows/publish.yml), Node 20 runner."). The new bullet should read, verbatim in both files: a pointer to `RELEASE.md` as the canonical release-process doc, plus a one-sentence statement that any push landing on `main` triggers `npm publish` automatically via that workflow, so the version bump (`package.json`) and the `CHANGELOG.md` entry must happen BEFORE a PR is merged into `main`.

    Keep the addition to a single new bullet line (1-3 lines of wrapped text is fine). Do not touch any other section, do not restructure the surrounding auto-generated headings, and make sure the wording is identical between the two files (they must remain mirrors).
  </action>
  <verify>
    <automated>grep -q 'RELEASE.md' CLAUDE.md && grep -q 'RELEASE.md' .claude/CLAUDE.md && grep -c 'RELEASE.md' CLAUDE.md | grep -qx 1 && grep -c 'RELEASE.md' .claude/CLAUDE.md | grep -qx 1</automated>
  </verify>
  <done>Both CLAUDE.md and .claude/CLAUDE.md contain exactly one new bullet referencing RELEASE.md in the Platform Requirements section, worded identically, stating that a push to main auto-publishes and that version bump + CHANGELOG must precede a merge into main.</done>
</task>

<task type="auto">
  <name>Task 4: Push dev and open (but do not merge) the PR into main</name>
  <files>N/A — git/gh operations only, no file edits</files>
  <action>
    First, run the full test suite (`npm test`) to confirm the existing 47 tests still pass unaffected by the documentation and version-field changes made in Tasks 1-3 — this is a sanity check before pushing, not a task that modifies any test file.

    Commit Tasks 1-3's changes as separate, atomic commits if they are not already committed by the executor's per-task workflow: a `docs:` commit for the RELEASE.md correction, a `chore: release v2.1.1 — hotfix post-ajustes-fanout idempotency loop` commit for the package.json + CHANGELOG.md bump, and a `docs:` commit for the CLAUDE.md cross-reference. None of these commits may include a "Generated with Claude Code" or "Co-Authored-By" signature (hard project rule).

    Run `git push origin dev` to publish all new commits (the pre-existing 260716-lv5 hotfix commits are already on `origin/dev`; this push adds this plan's three new commits on top).

    Then run `gh pr create --base main --head dev` with a title summarizing both pieces of work (e.g. "Release v2.1.1 -- post-ajustes-fanout hotfix + release docs correction") and a body covering: (1) what the `post-ajustes-fanout.sh` hotfix fixed (full-transcript idempotency scan closing the false re-block loop, with a committed regression test), (2) the RELEASE.md correction (push-to-main is the real publish trigger, not a tag push), (3) the version bump `2.1.0` -> `2.1.1` with its matching CHANGELOG entry, (4) the new CLAUDE.md cross-reference to RELEASE.md, and (5) a prominent, explicit warning that merging this PR into `main` immediately triggers a real `npm publish --access public` to the public npm registry (per `.github/workflows/publish.yml`'s push-to-main trigger) — so the merge itself must be a deliberate human decision, not something automated as part of this task.

    Do NOT run `gh pr merge` or any command that merges the PR. Creating the PR is the last action of this task and of this plan. Capture the PR URL that `gh pr create` prints and surface it prominently in the plan's SUMMARY, along with the explicit non-merge warning.
  </action>
  <verify>
    <automated>npm test >/dev/null 2>&1 && test "$(git rev-parse dev)" = "$(git rev-parse origin/dev)" && gh pr view --json state -q .state | grep -qx OPEN</automated>
  </verify>
  <done>npm test passes (47/47); `dev` and `origin/dev` point at the same commit after the push; `gh pr view` reports an OPEN pull request from `dev` into `main` whose body covers both the hotfix and this release-prep work; no merge command was run; the PR URL and the non-merge warning are both recorded in the SUMMARY.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Local `dev` branch -> `origin` (GitHub) -> human-reviewed merge into `main` | This plan pushes commits and opens a PR, but never merges — the actual trust boundary crossing into the auto-publish pipeline (`.github/workflows/publish.yml`) is the human's deliberate merge action, which stays entirely outside this plan's scope. |
| Executor (Claude) -> RELEASE.md / CLAUDE.md content | These files become instructions read by future Claude Code sessions and human contributors; inaccurate release documentation is exactly the bug this plan fixes, so its own correctness is safety-critical for every future release. |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-quick260716mhh-01 | Tampering | RELEASE.md documented trigger mechanism | medium | mitigate | RELEASE.md is rewritten to exactly match `.github/workflows/publish.yml`'s real trigger (`push: branches: [main]`), verified via the automated grep checks in Task 1's `<verify>` (absence of tag-based instructions, presence of the branch-based trigger and `workflow_dispatch`). |
| T-quick260716mhh-02 | Elevation of Privilege | `gh` CLI PR authority (create vs. merge) | high | mitigate | Task 4 explicitly runs only `gh pr create`, never `gh pr merge` or any merge command; merging `dev` into `main` is left as a deliberate human-gated action because it immediately triggers a real, irreversible `npm publish --access public` to the public registry. The task's `<verify>` confirms the PR state is `OPEN` (not merged) after this plan completes, and the SUMMARY must surface the PR URL plus this warning explicitly. |
| T-quick260716mhh-03 | Repudiation | package.json version vs. CHANGELOG.md vs. eventual npm registry state | medium | mitigate | The version bump (`2.1.1`) and the new CHANGELOG entry are committed together before the PR is opened, so if/when a human merges, the auto-publish succeeds on the first attempt (no duplicate-version `403`) and the published version traces back to an accurate, matching changelog entry. |

No npm/pip/cargo package-manager install tasks are part of this plan (docs + version bump + PR only) — the Package Legitimacy Gate (T-{phase}-SC) does not apply.
</threat_model>

<verification>
- `! grep -q 'git tag v' RELEASE.md` and `grep -q 'branches' RELEASE.md` and `! grep -qi 'NÃO publica' RELEASE.md` — RELEASE.md's trigger mechanism matches `.github/workflows/publish.yml`.
- `grep -q '"version": "2.1.1"' package.json` and `grep -q '^## \[2.1.1\]' CHANGELOG.md` — version and changelog are bumped together.
- `grep -q 'RELEASE.md' CLAUDE.md` and `grep -q 'RELEASE.md' .claude/CLAUDE.md` — both mirrors reference RELEASE.md.
- `npm test` passes 47/47 after all doc/version edits.
- `git rev-parse dev` equals `git rev-parse origin/dev` (dev fully pushed) and `gh pr view --json state -q .state` reports `OPEN` — PR exists and is not merged.
- `git diff` since this plan started is restricted to exactly: `RELEASE.md`, `package.json`, `CHANGELOG.md`, `CLAUDE.md`, `.claude/CLAUDE.md`. No changes to `.claude/commands/ei-ajustes.md`, `manifest.json`, `.claude/hooks/*`, or any file already touched by quick task 260716-lv5.
</verification>

<success_criteria>
- A future maintainer reading RELEASE.md can correctly predict that merging a PR into `main` publishes to npm, with no tag step required or expected.
- `@expertzinhointegrado/ei-prompt` is ready to publish as `2.1.1` the moment a human merges the opened PR — version and CHANGELOG already match, avoiding a `403 Forbidden` on the first attempt.
- CLAUDE.md (both copies) makes RELEASE.md discoverable without anyone having to stumble onto it separately.
- A PR from `dev` into `main` exists, covers both the 260716-lv5 hotfix and this release-prep work, and remains unmerged — merging is an explicit, separate, human-gated decision.
</success_criteria>

<output>
Create `.planning/quick/260716-mhh-release-prep-fix-stale-release-md-says-t/260716-mhh-SUMMARY.md` when done. The SUMMARY must prominently include: the PR URL returned by `gh pr create`, and an explicit statement that the PR is NOT merged and merging it will immediately trigger a public `npm publish`.
</output>
