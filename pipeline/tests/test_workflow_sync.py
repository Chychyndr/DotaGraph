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


if __name__ == "__main__":
    unittest.main()
