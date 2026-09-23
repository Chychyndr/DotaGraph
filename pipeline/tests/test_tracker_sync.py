from pathlib import Path
import sys
import unittest


REPO_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO_ROOT / "scripts"))

from sync_project_tracker import IssueRecord, synchronize_tracker_body  # noqa: E402


TRACKER = """Tracker intro.

## Next

- [x] Finished thing
- [ ] **Current:** Route active edges around unrelated active portraits — #55
- [ ] Roadmap item

## Bugs

- [ ] Fix win-rate badges overlapping hero labels — #54
- [ ] Route active edges around unrelated active portraits — #55
- [ ] Pipeline/schema merges can deploy before a compatible regenerated dataset — #60
- [ ] CI does not surface dependency vulnerabilities as an explicit audit result — #63
- [ ] Add newly confirmed bugs here before or while opening a focused bug issue

## Durable product decisions

Text.
"""


class TrackerSynchronizationTests(unittest.TestCase):
    def test_updates_bug_checkboxes_and_appends_missing_open_bugs(self) -> None:
        issues = [
            IssueRecord(54, "Fix win-rate badges overlapping hero labels", "closed"),
            IssueRecord(55, "Route active edges around unrelated active portraits", "closed"),
            IssueRecord(60, "Keep production data generation synchronized", "closed"),
            IssueRecord(61, "Keep the permanent project tracker synchronized after merges", "open"),
            IssueRecord(63, "Surface npm dependency vulnerabilities in CI", "open"),
            IssueRecord(75, "Keep mobile Focus win-rate badges inside the viewport", "open"),
        ]

        result = synchronize_tracker_body(TRACKER, issues)

        self.assertIn(
            "- [x] Fix win-rate badges overlapping hero labels — #54",
            result,
        )
        self.assertIn(
            "- [x] Route active edges around unrelated active portraits — #55",
            result,
        )
        self.assertIn(
            "- [x] Pipeline/schema merges can deploy before a compatible regenerated dataset — #60",
            result,
        )
        self.assertIn(
            "- [ ] Keep the permanent project tracker synchronized after merges — #61",
            result,
        )
        self.assertIn(
            "- [ ] Keep mobile Focus win-rate badges inside the viewport — #75",
            result,
        )
        self.assertEqual(result.count("#63"), 1)
        self.assertLess(
            result.index("#75"),
            result.index("Add newly confirmed bugs"),
        )

    def test_moves_current_to_oldest_open_bug(self) -> None:
        issues = [
            IssueRecord(55, "Old fixed bug", "closed"),
            IssueRecord(61, "Tracker sync", "closed"),
            IssueRecord(63, "Surface npm dependency vulnerabilities in CI", "open"),
            IssueRecord(64, "Update GitHub Actions runtime", "open"),
        ]

        result = synchronize_tracker_body(TRACKER, issues)

        self.assertIn(
            "- [ ] **Current:** Surface npm dependency vulnerabilities in CI — #63",
            result,
        )

    def test_keeps_current_bug_when_it_is_still_open(self) -> None:
        tracker = TRACKER.replace(
            "Route active edges around unrelated active portraits — #55",
            "Surface npm dependency vulnerabilities in CI — #63",
            1,
        )
        issues = [
            IssueRecord(55, "Old fixed bug", "closed"),
            IssueRecord(63, "Surface npm dependency vulnerabilities in CI", "open"),
            IssueRecord(64, "Update GitHub Actions runtime", "open"),
        ]

        result = synchronize_tracker_body(tracker, issues)

        self.assertIn(
            "- [ ] **Current:** Surface npm dependency vulnerabilities in CI — #63",
            result,
        )

    def test_is_idempotent(self) -> None:
        issues = [
            IssueRecord(54, "Fix win-rate badges overlapping hero labels", "closed"),
            IssueRecord(55, "Route active edges around unrelated active portraits", "closed"),
            IssueRecord(60, "Keep production data generation synchronized", "closed"),
            IssueRecord(63, "Surface npm dependency vulnerabilities in CI", "open"),
            IssueRecord(75, "Keep mobile Focus win-rate badges inside the viewport", "open"),
        ]

        once = synchronize_tracker_body(TRACKER, issues)
        twice = synchronize_tracker_body(once, issues)

        self.assertEqual(twice, once)


if __name__ == "__main__":
    unittest.main()
