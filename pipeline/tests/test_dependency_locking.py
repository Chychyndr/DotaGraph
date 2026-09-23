from __future__ import annotations

import json
from pathlib import Path
import unittest


REPO_ROOT = Path(__file__).resolve().parents[2]


class DependencyLockingTests(unittest.TestCase):
    def test_lockfiles_are_committed_and_parseable(self) -> None:
        npm_lock = REPO_ROOT / "package-lock.json"
        uv_lock = REPO_ROOT / "pipeline" / "uv.lock"

        self.assertTrue(npm_lock.is_file(), "package-lock.json must be committed")
        self.assertTrue(uv_lock.is_file(), "pipeline/uv.lock must be committed")

        npm_data = json.loads(npm_lock.read_text(encoding="utf-8"))
        self.assertGreaterEqual(npm_data.get("lockfileVersion", 0), 3)

        uv_text = uv_lock.read_text(encoding="utf-8")
        self.assertIn('name = "dotagraph-pipeline"', uv_text)

    def test_python_build_backend_is_pinned(self) -> None:
        pyproject = (REPO_ROOT / "pipeline" / "pyproject.toml").read_text(
            encoding="utf-8"
        )
        self.assertIn('requires = ["hatchling==1.32.4"]', pyproject)

    def test_ci_uses_locked_dependency_installs(self) -> None:
        ci = (REPO_ROOT / ".github" / "workflows" / "ci.yml").read_text(
            encoding="utf-8"
        )
        self.assertIn("uv run --locked --project pipeline", ci)
        self.assertIn("- run: npm ci", ci)
        self.assertNotIn("- run: npm install\n", ci)

    def test_pages_uses_npm_ci(self) -> None:
        pages = (REPO_ROOT / ".github" / "workflows" / "pages.yml").read_text(
            encoding="utf-8"
        )
        self.assertGreaterEqual(pages.count("- run: npm ci"), 2)
        self.assertNotIn("- run: npm install\n", pages)

    def test_data_refresh_uses_locked_uv_environment(self) -> None:
        workflow = (
            REPO_ROOT / ".github" / "workflows" / "update-current-data.yml"
        ).read_text(encoding="utf-8")

        self.assertIn("uv run --locked --project pipeline", workflow)
        self.assertNotIn("uv run --project pipeline", workflow)


if __name__ == "__main__":
    unittest.main()
