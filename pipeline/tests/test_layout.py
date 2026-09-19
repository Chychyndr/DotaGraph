from __future__ import annotations

import math
import unittest

from dotagraph_pipeline.layout import WeightedEdge, compute_layout, layout_metrics


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
