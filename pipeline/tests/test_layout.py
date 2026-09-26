from __future__ import annotations

import math
import unittest

from dotagraph_pipeline.layout import (
    WeightedEdge,
    compute_layout,
    layout_metrics,
    spread_layout_positions,
)


class LayoutTests(unittest.TestCase):
    def setUp(self) -> None:
        self.nodes = ["axe", "viper", "huskar", "spectre", "lich", "pugna"]
        self.edges = [
            WeightedEdge("axe", "viper", 1.0),
            WeightedEdge("viper", "huskar", 0.9),
            WeightedEdge("lich", "pugna", 0.8),
            WeightedEdge("spectre", "viper", 0.7),
        ]

    def test_layout_is_deterministic(self) -> None:
        first = compute_layout(self.nodes, self.edges, iterations=180)
        second = compute_layout(self.nodes, self.edges, iterations=180)
        self.assertEqual(first, second)

    def test_layout_stays_inside_canvas(self) -> None:
        positions = compute_layout(self.nodes, self.edges, iterations=180)

        for x, y in positions.values():
            self.assertGreaterEqual(x, 52)
            self.assertLessEqual(x, 1148)
            self.assertGreaterEqual(y, 52)
            self.assertLessEqual(y, 708)

    def test_portraits_do_not_overlap(self) -> None:
        positions = compute_layout(
            self.nodes,
            self.edges,
            min_distance=46,
            iterations=180,
        )

        values = list(positions.values())
        for index, first in enumerate(values):
            for second in values[index + 1 :]:
                self.assertGreaterEqual(
                    math.hypot(second[0] - first[0], second[1] - first[1]),
                    45.8,
                )

    def test_default_spacing_keeps_portraits_separated(self) -> None:
        positions = compute_layout(self.nodes, self.edges, iterations=180)
        values = list(positions.values())

        for index, first in enumerate(values):
            for second in values[index + 1 :]:
                self.assertGreaterEqual(
                    math.hypot(second[0] - first[0], second[1] - first[1]),
                    57.8,
                )

    def test_low_degree_hero_stays_near_real_affinity_neighbors(self) -> None:
        nodes = ["chen", "axe", "viper", "huskar", "lich", "pugna", "spectre"]
        edges = [
            WeightedEdge("chen", "axe", 0.7),
            WeightedEdge("chen", "viper", 0.65),
            WeightedEdge("axe", "viper", 0.9),
            WeightedEdge("axe", "huskar", 0.8),
            WeightedEdge("viper", "lich", 0.75),
            WeightedEdge("huskar", "pugna", 0.7),
            WeightedEdge("lich", "spectre", 0.7),
            WeightedEdge("pugna", "spectre", 0.65),
        ]

        positions = compute_layout(nodes, edges, iterations=240)
        chen = positions["chen"]
        axe = positions["axe"]
        viper = positions["viper"]
        neighbor_centroid = ((axe[0] + viper[0]) / 2, (axe[1] + viper[1]) / 2)

        self.assertLessEqual(
            math.hypot(
                chen[0] - neighbor_centroid[0],
                chen[1] - neighbor_centroid[1],
            ),
            180.0,
        )

    def test_sparse_gap_compaction_caps_detached_nodes(self) -> None:
        positions = compute_layout(
            ["alpha", "beta", "gamma", "delta"],
            [],
            width=600,
            height=400,
            min_distance=40,
            max_nearest_distance=70,
            iterations=1,
        )
        metrics = layout_metrics(positions, [])

        self.assertGreaterEqual(metrics["minimumNodeDistance"], 39.8)
        self.assertLessEqual(metrics["maxNearestNodeDistance"], 70.1)

    def test_relationship_segments_keep_clear_of_foreign_portraits(self) -> None:
        nodes = ["a", "b", "c", "d", "e", "f"]
        edges = [
            WeightedEdge("a", "b", 1.0),
            WeightedEdge("c", "d", 0.9),
            WeightedEdge("e", "f", 0.8),
            WeightedEdge("a", "c", 0.7),
            WeightedEdge("b", "e", 0.7),
        ]
        positions = compute_layout(
            nodes,
            edges,
            width=800,
            height=520,
            min_distance=52,
            iterations=240,
        )

        for edge in edges:
            start = positions[edge.source]
            end = positions[edge.target]
            segment_x = end[0] - start[0]
            segment_y = end[1] - start[1]
            segment_length_sq = segment_x * segment_x + segment_y * segment_y
            if segment_length_sq <= 1e-8:
                continue

            for node_id, point in positions.items():
                if node_id in (edge.source, edge.target):
                    continue

                projection = (
                    (point[0] - start[0]) * segment_x
                    + (point[1] - start[1]) * segment_y
                ) / segment_length_sq
                if projection <= 0.08 or projection >= 0.92:
                    continue

                closest = (
                    start[0] + segment_x * projection,
                    start[1] + segment_y * projection,
                )
                self.assertGreaterEqual(
                    math.hypot(point[0] - closest[0], point[1] - closest[1]),
                    7.5,
                    f"{edge.source}->{edge.target} crosses {node_id}",
                )

    def test_spread_layout_uses_more_canvas_without_changing_topology(self) -> None:
        positions = {
            "left": (100.0, 200.0),
            "center": (600.0, 380.0),
            "right": (1100.0, 560.0),
        }

        spread = spread_layout_positions(positions)
        before = math.hypot(
            positions["right"][0] - positions["left"][0],
            positions["right"][1] - positions["left"][1],
        )
        after = math.hypot(
            spread["right"][0] - spread["left"][0],
            spread["right"][1] - spread["left"][1],
        )

        self.assertGreater(after, before)
        self.assertAlmostEqual(spread["center"][0], 950.0, places=2)
        self.assertAlmostEqual(spread["center"][1], 590.0, places=2)
        self.assertGreaterEqual(min(x for x, _ in spread.values()), 60.0)
        self.assertLessEqual(max(x for x, _ in spread.values()), 1840.0)
        self.assertGreaterEqual(min(y for _, y in spread.values()), 60.0)
        self.assertLessEqual(max(y for _, y in spread.values()), 1120.0)

    def test_spread_layout_preserves_relative_angles(self) -> None:
        positions = {
            "origin": (400.0, 300.0),
            "a": (500.0, 340.0),
            "b": (360.0, 420.0),
        }
        spread = spread_layout_positions(positions)

        before_a = math.atan2(
            positions["a"][1] - positions["origin"][1],
            positions["a"][0] - positions["origin"][0],
        )
        after_a = math.atan2(
            spread["a"][1] - spread["origin"][1],
            spread["a"][0] - spread["origin"][0],
        )
        before_b = math.atan2(
            positions["b"][1] - positions["origin"][1],
            positions["b"][0] - positions["origin"][0],
        )
        after_b = math.atan2(
            spread["b"][1] - spread["origin"][1],
            spread["b"][0] - spread["origin"][0],
        )

        self.assertAlmostEqual(before_a, after_a, places=3)
        self.assertAlmostEqual(before_b, after_b, places=3)

    def test_metrics_cover_layout_edges(self) -> None:
        positions = compute_layout(self.nodes, self.edges, iterations=180)
        metrics = layout_metrics(positions, self.edges)

        self.assertEqual(metrics["edgeCount"], len(self.edges))
        self.assertGreater(metrics["medianDistance"], 0)
        self.assertGreaterEqual(metrics["p95Distance"], metrics["medianDistance"])
        self.assertGreaterEqual(metrics["minimumNodeDistance"], 57.8)
        self.assertEqual(metrics["isolatedNodeCount"], 0)
        self.assertEqual(metrics["coveredNodeCount"], len(self.nodes))


if __name__ == "__main__":
    unittest.main()
