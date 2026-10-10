from pathlib import Path
import unittest


REPO_ROOT = Path(__file__).resolve().parents[2]
UPDATE_WORKFLOW = REPO_ROOT / ".github" / "workflows" / "update-current-data.yml"
PAGES_WORKFLOW = REPO_ROOT / ".github" / "workflows" / "pages.yml"

DATA_SENSITIVE_PATHS = (
    "pipeline/**",
    "src/data/productionSnapshot.ts",
    "src/data/dataset.ts",
    "src/data/heroCatalog.json",
    "src/domain/types.ts",
    ".github/workflows/update-current-data.yml",
)


class WorkflowSynchronizationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.update = UPDATE_WORKFLOW.read_text(encoding="utf-8")
        cls.pages = PAGES_WORKFLOW.read_text(encoding="utf-8")

    def test_data_sensitive_paths_trigger_refresh_and_defer_automatic_pages(self) -> None:
        for path in DATA_SENSITIVE_PATHS:
            with self.subTest(path=path):
                self.assertIn(f"- {path}", self.update)

        page_guard_patterns = (
            "pipeline/*",
            "src/data/productionSnapshot.ts",
            "src/data/dataset.ts",
            "src/data/heroCatalog.json",
            "src/domain/types.ts",
            ".github/workflows/update-current-data.yml",
        )
        for pattern in page_guard_patterns:
            with self.subTest(pattern=pattern):
                self.assertIn(pattern, self.pages)

        self.assertIn("Pages deployment deferred", self.pages)
        self.assertIn("deploy=false", self.pages)

    def test_pages_concurrency_is_scoped_to_target_sha(self) -> None:
        self.assertIn("group: pages-${{", self.pages)
        self.assertIn(
            "|| github.event.inputs.target_sha || github.event.workflow_run.head_sha || github.sha }}",
            self.pages,
        )
        self.assertNotIn("group: pages\n", self.pages)

    def test_manual_ci_completion_cannot_deploy_or_cancel_explicit_pages(self) -> None:
        guard_start = self.pages.index("deployment-guard:")
        guard_end = self.pages.index("runs-on:", guard_start)
        guard = self.pages[guard_start:guard_end]
        self.assertIn("github.event_name == 'workflow_dispatch' ||", guard)
        self.assertIn("github.event.workflow_run.conclusion == 'success'", guard)
        self.assertIn("github.event.workflow_run.head_branch == 'main'", guard)
        self.assertIn("github.event.workflow_run.event != 'workflow_dispatch'", guard)

        concurrency = self.pages[self.pages.index("concurrency:"):self.pages.index("env:")]
        self.assertIn("github.event_name == 'workflow_run'", concurrency)
        self.assertIn("github.event.workflow_run.event == 'workflow_dispatch'", concurrency)
        self.assertIn("format('skipped-{0}', github.run_id)", concurrency)
        self.assertIn("|| github.event.inputs.target_sha || github.event.workflow_run.head_sha || github.sha", concurrency)

    def test_pages_manual_dispatch_accepts_and_verifies_exact_sha(self) -> None:
        self.assertIn("target_sha:", self.pages)
        self.assertIn("TARGET_SHA:", self.pages)
        self.assertIn("VITE_BUILD_SHA: ${{ env.TARGET_SHA }}", self.pages)
        self.assertIn("EXPECTED_BUILD_SHA: ${{ env.TARGET_SHA }}", self.pages)
        self.assertIn("ref: ${{ env.TARGET_SHA }}", self.pages)

    def test_refresh_waits_for_main_ci_and_pages_live_verification(self) -> None:
        self.assertIn("Validate merged main revision with CI", self.update)
        self.assertIn("select(.headSha ==", self.update)
        self.assertIn("Deploy validated main revision to Pages", self.update)
        self.assertIn('-f target_sha="$TARGET_SHA"', self.update)
        self.assertIn('EXPECTED_TITLE="Deploy GitHub Pages $TARGET_SHA"', self.update)
        self.assertIn('gh run watch "$RUN_ID"', self.update)
        self.assertIn("Pages + live Chromium verification: passed", self.update)

    def test_refresh_refuses_to_deploy_when_main_moves(self) -> None:
        self.assertIn("Ensure deployment target is current main", self.update)
        self.assertIn("refusing to deploy a stale revision", self.update)

    def test_refresh_rechecks_current_main_after_ci_before_pages_dispatch(self) -> None:
        main_ci = self.update.index("- name: Validate merged main revision with CI")
        pages = self.update.index("- name: Deploy validated main revision to Pages")
        self.assertLess(main_ci, pages)
        self.assertIn('gh run watch "$RUN_ID"', self.update[main_ci:pages])
        deployment = self.update[pages:]
        guard = deployment.index('[ "$REMOTE_MAIN" != "$TARGET_SHA" ]')
        refusal = deployment.index("refusing to deploy a stale revision")
        stop = deployment.index("exit 1", refusal)
        dispatch = deployment.index("gh workflow run pages.yml")
        self.assertLess(guard, refusal)
        self.assertLess(refusal, stop)
        self.assertLess(stop, dispatch)
        self.assertIn("git ls-remote origin refs/heads/main", deployment[:guard])

    def test_refresh_can_recover_old_layout_without_publishing_unvalidated_data(self) -> None:
        before = self.update.index("- name: Run pipeline code tests before generation")
        generate = self.update.index("- name: Generate current matchup bundle")
        validate = self.update.index("- name: Validate generated bundle with all pipeline tests")
        publish = self.update.index("- name: Publish generated data branch and pull request")

        self.assertLess(before, generate)
        self.assertLess(generate, validate)
        self.assertLess(validate, publish)
        self.assertIn(
            'DOTAGRAPH_SKIP_COMMITTED_SNAPSHOT_CHECK: "1"',
            self.update[before:generate],
        )
        validation_step = self.update[validate:self.update.index("- name:", validate + 1)]
        self.assertNotIn("DOTAGRAPH_SKIP_COMMITTED_SNAPSHOT_CHECK", validation_step)
        self.assertIn("python -m unittest discover -s pipeline/tests -v", validation_step)
        self.assertIn("set -o pipefail", validation_step)
        self.assertIn("generated-data-validation.log", validation_step)

    def test_manual_validation_keeps_non_main_refs_out_of_publication(self) -> None:
        self.assertIn("type: boolean", self.update)
        self.assertIn("default: false", self.update)
        guard = self.update.index("- name: Guard manual refresh scope")
        checkout = self.update.index("- uses: actions/checkout@")
        self.assertLess(guard, checkout)
        guard_step = self.update[guard:checkout]
        self.assertIn('[ "$WORKFLOW_REF" != "refs/heads/main" ]', guard_step)
        self.assertIn('[ "$VALIDATE_ONLY" != "true" ]', guard_step)
        self.assertIn("exit 1", guard_step)
        self.assertIn("inputs.validate_only && github.ref || 'main'", self.update)
        self.assertIn("Upload validated bundle without publishing", self.update)

        for name in (
            "Publish generated data branch and pull request",
            "Validate generated data branch with CI",
            "Merge validated data pull request",
            "Resolve deployment target",
            "Ensure deployment target is current main",
            "Validate merged main revision with CI",
            "Deploy validated main revision to Pages",
        ):
            with self.subTest(step=name):
                start = self.update.index(f"- name: {name}")
                end = self.update.find("- name:", start + 1)
                step = self.update[start:end if end >= 0 else len(self.update)]
                self.assertIn("!inputs.validate_only", step)

    def test_generated_branch_ci_and_merge_require_the_same_commit(self) -> None:
        publish = self.update.index("- name: Publish generated data branch and pull request")
        validate = self.update.index("- name: Validate generated data branch with CI")
        merge = self.update.index("- name: Merge validated data pull request")
        target = self.update.index("- name: Resolve deployment target")
        self.assertIn('echo "sha=$REFRESH_SHA" >> "$GITHUB_OUTPUT"', self.update[publish:validate])
        validation_step = self.update[validate:merge]
        merge_step = self.update[merge:target]
        for step in (validation_step, merge_step):
            self.assertIn("REFRESH_SHA: ${{ steps.publish.outputs.sha }}", step)
        self.assertIn("--json databaseId,headSha", validation_step)
        self.assertIn('select(.headSha == \\"$REFRESH_SHA\\")', validation_step)
        self.assertIn('--match-head-commit "$REFRESH_SHA"', merge_step)


if __name__ == "__main__":
    unittest.main()
