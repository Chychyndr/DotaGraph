from pathlib import Path
import re
import unittest


REPO_ROOT = Path(__file__).resolve().parents[2]
WORKFLOW_DIR = REPO_ROOT / ".github" / "workflows"

MINIMUM_NODE24_MAJORS = {
    "actions/checkout": 7,
    "actions/setup-node": 7,
    "actions/setup-python": 7,
    "actions/cache": 6,
    "actions/upload-artifact": 7,
    "actions/configure-pages": 6,
    "actions/upload-pages-artifact": 5,
    "actions/deploy-pages": 5,
    "astral-sh/setup-uv": 10,
}

USES_PATTERN = re.compile(
    r"uses:\s*([A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+)@v(\d+)"
)


class ActionRuntimeVersionTests(unittest.TestCase):
    def test_workflows_use_node24_ready_action_majors(self) -> None:
        seen: set[str] = set()
        violations: list[str] = []

        for path in sorted(WORKFLOW_DIR.glob("*.yml")):
            content = path.read_text(encoding="utf-8")
            for action, major_text in USES_PATTERN.findall(content):
                if action not in MINIMUM_NODE24_MAJORS:
                    continue
                seen.add(action)
                major = int(major_text)
                minimum = MINIMUM_NODE24_MAJORS[action]
                if major < minimum:
                    violations.append(
                        f"{path.relative_to(REPO_ROOT)}: "
                        f"{action}@v{major} is below Node 24-ready v{minimum}"
                    )

        self.assertFalse(
            violations,
            "Deprecated action runtime references found:\n" + "\n".join(violations),
        )

        missing = sorted(set(MINIMUM_NODE24_MAJORS) - seen)
        self.assertFalse(
            missing,
            "Expected Node 24 action families were not found in workflows: "
            + ", ".join(missing),
        )


if __name__ == "__main__":
    unittest.main()
