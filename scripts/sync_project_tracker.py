#!/usr/bin/env python3
from __future__ import annotations

import argparse
from dataclasses import dataclass
import json
import os
import re
from typing import Iterable
from urllib.parse import urlencode
from urllib.request import Request, urlopen


API_ROOT = "https://api.github.com"
BUG_SECTION = "## Bugs"
NEXT_SECTION = "## Next"
TRACKER_NUMBER = 8


@dataclass(frozen=True)
class IssueRecord:
    number: int
    title: str
    state: str

    @property
    def closed(self) -> bool:
        return self.state == "closed"


def _replace_checkbox(line: str, *, checked: bool) -> str:
    marker = "x" if checked else " "
    return re.sub(r"^- \[[ xX]\]", f"- [{marker}]", line, count=1)


def _section_bounds(lines: list[str], heading: str) -> tuple[int, int] | None:
    try:
        start = lines.index(heading)
    except ValueError:
        return None

    end = len(lines)
    for index in range(start + 1, len(lines)):
        if lines[index].startswith("## "):
            end = index
            break
    return start, end


def _bug_reference(line: str, issue_map: dict[int, IssueRecord]) -> int | None:
    for raw in re.findall(r"#(\d+)", line):
        number = int(raw)
        if number in issue_map:
            return number
    return None


def _sync_bug_section(body: str, issues: Iterable[IssueRecord]) -> str:
    issue_map = {issue.number: issue for issue in issues}
    lines = body.splitlines()
    bounds = _section_bounds(lines, BUG_SECTION)
    if bounds is None:
        return body

    start, end = bounds
    referenced: set[int] = set()

    for index in range(start + 1, end):
        number = _bug_reference(lines[index], issue_map)
        if number is None:
            continue
        referenced.add(number)
        lines[index] = _replace_checkbox(
            lines[index],
            checked=issue_map[number].closed,
        )

    missing_open = sorted(
        (
            issue
            for issue in issue_map.values()
            if not issue.closed and issue.number not in referenced
        ),
        key=lambda issue: issue.number,
    )

    if missing_open:
        insert_at = end
        for index in range(start + 1, end):
            if "Add newly confirmed bugs" in lines[index]:
                insert_at = index
                break

        additions = [
            f"- [ ] {issue.title} — #{issue.number}"
            for issue in missing_open
        ]
        lines[insert_at:insert_at] = additions

    return "\n".join(lines)


def _sync_current_line(body: str, issues: Iterable[IssueRecord]) -> str:
    issue_map = {issue.number: issue for issue in issues}
    open_issues = sorted(
        (issue for issue in issue_map.values() if not issue.closed),
        key=lambda issue: issue.number,
    )

    lines = body.splitlines()
    bounds = _section_bounds(lines, NEXT_SECTION)
    if bounds is None:
        return body

    start, end = bounds
    current_index: int | None = None
    current_number: int | None = None

    for index in range(start + 1, end):
        if "**Current:**" not in lines[index]:
            continue
        current_index = index
        current_number = _bug_reference(lines[index], issue_map)
        break

    if current_index is None:
        return body

    target: IssueRecord | None = None
    if current_number is not None:
        current = issue_map[current_number]
        if not current.closed:
            target = current

    if target is None and open_issues:
        target = open_issues[0]

    if target is None:
        lines[current_index] = "- [ ] **Current:** Continue the roadmap items below"
    else:
        lines[current_index] = (
            f"- [ ] **Current:** {target.title} — #{target.number}"
        )

    return "\n".join(lines)


def synchronize_tracker_body(body: str, issues: Iterable[IssueRecord]) -> str:
    records = list(issues)
    synchronized = _sync_bug_section(body, records)
    synchronized = _sync_current_line(synchronized, records)
    if body.endswith("\n"):
        return synchronized.rstrip("\n") + "\n"
    return synchronized


class GitHubClient:
    def __init__(self, repository: str, token: str) -> None:
        self.repository = repository
        self.token = token

    def _request(
        self,
        method: str,
        path: str,
        *,
        payload: dict[str, object] | None = None,
    ) -> tuple[object, dict[str, str]]:
        body = None
        if payload is not None:
            body = json.dumps(payload).encode("utf-8")

        request = Request(
            f"{API_ROOT}/repos/{self.repository}{path}",
            data=body,
            method=method,
            headers={
                "Accept": "application/vnd.github+json",
                "Authorization": f"Bearer {self.token}",
                "X-GitHub-Api-Version": "2022-11-28",
                "User-Agent": "DotaGraph tracker synchronizer",
                **({"Content-Type": "application/json"} if body is not None else {}),
            },
        )
        with urlopen(request, timeout=30) as response:
            payload_value = json.loads(response.read().decode("utf-8"))
            headers = {key.lower(): value for key, value in response.headers.items()}
            return payload_value, headers

    def tracker_body(self) -> str:
        payload, _ = self._request("GET", f"/issues/{TRACKER_NUMBER}")
        assert isinstance(payload, dict)
        return str(payload.get("body") or "")

    def bug_issues(self) -> list[IssueRecord]:
        records: list[IssueRecord] = []
        page = 1

        while True:
            query = urlencode(
                {
                    "state": "all",
                    "labels": "bug",
                    "per_page": 100,
                    "page": page,
                }
            )
            payload, _ = self._request("GET", f"/issues?{query}")
            assert isinstance(payload, list)

            for item in payload:
                if not isinstance(item, dict) or "pull_request" in item:
                    continue
                number = item.get("number")
                title = item.get("title")
                state = item.get("state")
                if (
                    isinstance(number, int)
                    and isinstance(title, str)
                    and state in {"open", "closed"}
                    and number != TRACKER_NUMBER
                ):
                    records.append(
                        IssueRecord(
                            number=number,
                            title=title,
                            state=state,
                        )
                    )

            if len(payload) < 100:
                break
            page += 1

        return records

    def update_tracker(self, body: str) -> None:
        self._request(
            "PATCH",
            f"/issues/{TRACKER_NUMBER}",
            payload={"body": body},
        )


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Synchronize DotaGraph's permanent GitHub issue tracker."
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print the synchronized tracker without updating GitHub.",
    )
    args = parser.parse_args()

    repository = os.environ.get("GITHUB_REPOSITORY", "").strip()
    token = os.environ.get("GITHUB_TOKEN", "").strip()
    if not repository or not token:
        raise SystemExit("GITHUB_REPOSITORY and GITHUB_TOKEN are required.")

    client = GitHubClient(repository, token)
    original = client.tracker_body()
    synchronized = synchronize_tracker_body(original, client.bug_issues())

    if synchronized == original:
        print("Project tracker is already synchronized.")
        return 0

    if args.dry_run:
        print(synchronized)
        return 0

    client.update_tracker(synchronized)
    print(f"Updated project tracker issue #{TRACKER_NUMBER}.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
