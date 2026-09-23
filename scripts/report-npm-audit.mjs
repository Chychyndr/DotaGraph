#!/usr/bin/env node

import { readFileSync } from "node:fs";

const severityRank = new Map([
  ["info", 0],
  ["low", 1],
  ["moderate", 2],
  ["high", 3],
  ["critical", 4]
]);

const args = process.argv.slice(2);
const reportPath = args.find((arg) => !arg.startsWith("--"));
const failArg = args.find((arg) => arg.startsWith("--fail-on="));
const failOn = (failArg?.split("=", 2)[1] ?? "high").toLowerCase();

if (!reportPath) {
  console.error("Usage: report-npm-audit.mjs <npm-audit.json> [--fail-on=high]");
  process.exit(2);
}

if (!severityRank.has(failOn)) {
  console.error(`Unsupported severity threshold: ${failOn}`);
  process.exit(2);
}

const escapeCell = (value) =>
  String(value ?? "")
    .replaceAll("|", "\\|")
    .replaceAll("\n", " ")
    .trim();

const audit = JSON.parse(readFileSync(reportPath, "utf8"));

if (audit.error) {
  const message =
    typeof audit.error === "string"
      ? audit.error
      : audit.error.summary ?? audit.error.message ?? JSON.stringify(audit.error);
  console.log("## npm dependency audit");
  console.log();
  console.log(`Audit failed to produce a vulnerability report: ${escapeCell(message)}`);
  console.error(`npm audit infrastructure error: ${message}`);
  process.exit(2);
}

if (!audit.metadata?.vulnerabilities || typeof audit.vulnerabilities !== "object") {
  console.error("npm audit JSON is missing vulnerability metadata.");
  process.exit(2);
}

const counts = audit.metadata.vulnerabilities;
const vulnerabilities = audit.vulnerabilities;

const normalizedCounts = {
  info: Number(counts.info ?? 0),
  low: Number(counts.low ?? 0),
  moderate: Number(counts.moderate ?? 0),
  high: Number(counts.high ?? 0),
  critical: Number(counts.critical ?? 0),
  total: Number(counts.total ?? 0)
};

const rows = [];
for (const [packageName, vulnerability] of Object.entries(vulnerabilities)) {
  const via = Array.isArray(vulnerability.via) ? vulnerability.via : [];
  const advisories = via.filter((entry) => entry && typeof entry === "object");
  const indirect = via.filter((entry) => typeof entry === "string");

  if (advisories.length) {
    for (const advisory of advisories) {
      rows.push({
        packageName,
        severity: advisory.severity ?? vulnerability.severity ?? "unknown",
        direct: vulnerability.isDirect ? "yes" : "no",
        range: advisory.range ?? vulnerability.range ?? "",
        title: advisory.title ?? advisory.name ?? "",
        url: advisory.url ?? ""
      });
    }
    continue;
  }

  rows.push({
    packageName,
    severity: vulnerability.severity ?? "unknown",
    direct: vulnerability.isDirect ? "yes" : "no",
    range: vulnerability.range ?? "",
    title: indirect.length ? `via ${indirect.join(", ")}` : "",
    url: ""
  });
}

rows.sort((a, b) => {
  const severityDelta =
    (severityRank.get(b.severity) ?? -1) - (severityRank.get(a.severity) ?? -1);
  return severityDelta || a.packageName.localeCompare(b.packageName);
});

console.log("## npm dependency audit");
console.log();
console.log(
  `- Threshold: **fail on ${failOn} or higher**`
);
console.log(
  `- Counts: **${normalizedCounts.critical} critical**, **${normalizedCounts.high} high**, **${normalizedCounts.moderate} moderate**, **${normalizedCounts.low} low**, **${normalizedCounts.info} info**`
);
console.log();

if (!rows.length) {
  console.log("No known npm dependency vulnerabilities were reported.");
} else {
  console.log("| Package | Severity | Direct | Range | Advisory |");
  console.log("| --- | --- | --- | --- | --- |");
  for (const row of rows) {
    const advisory = row.url
      ? `[${escapeCell(row.title || row.url)}](${row.url})`
      : escapeCell(row.title || "dependency chain");
    console.log(
      `| ${escapeCell(row.packageName)} | ${escapeCell(row.severity)} | ${row.direct} | ${escapeCell(row.range)} | ${advisory} |`
    );
  }
}

const thresholdRank = severityRank.get(failOn);
const blocking = Object.entries(normalizedCounts)
  .filter(([severity]) => severityRank.has(severity))
  .some(([severity, count]) =>
    Number(count) > 0 && severityRank.get(severity) >= thresholdRank
  );

if (blocking) {
  console.error(`npm audit found vulnerabilities at or above ${failOn} severity.`);
  process.exit(1);
}
