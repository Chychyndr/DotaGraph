from __future__ import annotations

from dataclasses import dataclass
import math
from statistics import median
from typing import Iterable


@dataclass(frozen=True)
class WeightedEdge:
    source: str
    target: str
    weight: float


def _clamp(value: float, low: float, high: float) -> float:
    return max(low, min(high, value))


def _percentile(values: list[float], percentile: float) -> float:
    if not values:
        return 0.0
    ordered = sorted(values)
    if len(ordered) == 1:
        return ordered[0]
    position = (len(ordered) - 1) * percentile
    lower = math.floor(position)
    upper = math.ceil(position)
    if lower == upper:
        return ordered[lower]
    fraction = position - lower
    return ordered[lower] * (1.0 - fraction) + ordered[upper] * fraction


def compute_layout(
    node_ids: Iterable[str],
    edges: Iterable[WeightedEdge],
    *,
    width: float = 1200.0,
    height: float = 760.0,
    margin: float = 52.0,
    min_distance: float = 58.0,
    fill_ratio: float = 0.90,
    iterations: int = 900,
) -> dict[str, tuple[float, float]]:
    """Return deterministic force-directed coordinates.

    The algorithm intentionally has no randomness. Stronger relationship edges
    use shorter target lengths, while every node pair repels to preserve
    portrait readability.
    """

    nodes = sorted(set(node_ids))
    if not nodes:
        return {}

    index = {node_id: i for i, node_id in enumerate(nodes)}
    valid_edges = [
        WeightedEdge(edge.source, edge.target, _clamp(edge.weight, 0.0, 1.0))
        for edge in edges
        if edge.source in index and edge.target in index and edge.source != edge.target
    ]

    count = len(nodes)
    golden_angle = math.pi * (3.0 - math.sqrt(5.0))
    positions: list[list[float]] = []

    for i in range(count):
        fraction = math.sqrt((i + 0.5) / count)
        angle = i * golden_angle
        positions.append([
            math.cos(angle) * fraction,
            math.sin(angle) * fraction * 0.72,
        ])

    repulsion_strength = 0.0085
    attraction_strength = 0.058
    gravity_strength = 0.0035
    max_step = 0.045

    for iteration in range(iterations):
        forces = [[0.0, 0.0] for _ in nodes]

        for left in range(count):
            x1, y1 = positions[left]
            for right in range(left + 1, count):
                x2, y2 = positions[right]
                dx = x2 - x1
                dy = y2 - y1
                distance_sq = dx * dx + dy * dy + 1e-8
                distance = math.sqrt(distance_sq)
                force = repulsion_strength / distance_sq
                fx = force * dx / distance
                fy = force * dy / distance
                forces[left][0] -= fx
                forces[left][1] -= fy
                forces[right][0] += fx
                forces[right][1] += fy

        for edge in valid_edges:
            source_index = index[edge.source]
            target_index = index[edge.target]
            x1, y1 = positions[source_index]
            x2, y2 = positions[target_index]
            dx = x2 - x1
            dy = y2 - y1
            distance = math.hypot(dx, dy) + 1e-8

            target_length = 0.34 - 0.17 * edge.weight
            spring = attraction_strength * (0.35 + edge.weight) * (distance - target_length)
            fx = spring * dx / distance
            fy = spring * dy / distance

            forces[source_index][0] += fx
            forces[source_index][1] += fy
            forces[target_index][0] -= fx
            forces[target_index][1] -= fy

        cooling = max(0.08, 1.0 - iteration / iterations)
        step_limit = max_step * cooling

        for i, (x, y) in enumerate(positions):
            forces[i][0] -= x * gravity_strength
            forces[i][1] -= y * gravity_strength

            fx, fy = forces[i]
            magnitude = math.hypot(fx, fy)
            if magnitude > step_limit:
                scale = step_limit / magnitude
                fx *= scale
                fy *= scale

            positions[i][0] += fx
            positions[i][1] += fy

    min_x = min(point[0] for point in positions)
    max_x = max(point[0] for point in positions)
    min_y = min(point[1] for point in positions)
    max_y = max(point[1] for point in positions)

    fill_ratio = _clamp(fill_ratio, 0.5, 1.0)
    usable_width = (width - margin * 2) * fill_ratio
    usable_height = (height - margin * 2) * fill_ratio
    layout_left = (width - usable_width) / 2
    layout_top = (height - usable_height) / 2
    layout_right = layout_left + usable_width
    layout_bottom = layout_top + usable_height
    x_span = max(max_x - min_x, 1e-8)
    y_span = max(max_y - min_y, 1e-8)

    pixel_positions = [
        [
            layout_left + (point[0] - min_x) / x_span * usable_width,
            layout_top + (point[1] - min_y) / y_span * usable_height,
        ]
        for point in positions
    ]

    # Deterministic collision relaxation. It only prevents portrait overlap;
    # graph attraction has already determined the topology.
    for _ in range(220):
        moved = False
        for left in range(count):
            x1, y1 = pixel_positions[left]
            for right in range(left + 1, count):
                x2, y2 = pixel_positions[right]
                dx = x2 - x1
                dy = y2 - y1
                distance = math.hypot(dx, dy)

                if distance >= min_distance:
                    continue

                if distance < 1e-8:
                    angle = (left * 97 + right * 193) * golden_angle
                    dx = math.cos(angle)
                    dy = math.sin(angle)
                    distance = 1.0

                push = (min_distance - distance) / 2.0 + 0.05
                ux = dx / distance
                uy = dy / distance

                pixel_positions[left][0] -= ux * push
                pixel_positions[left][1] -= uy * push
                pixel_positions[right][0] += ux * push
                pixel_positions[right][1] += uy * push
                moved = True

        for point in pixel_positions:
            point[0] = _clamp(point[0], layout_left, layout_right)
            point[1] = _clamp(point[1], layout_top, layout_bottom)

        if not moved:
            break

    return {
        node_id: (round(pixel_positions[i][0], 2), round(pixel_positions[i][1], 2))
        for i, node_id in enumerate(nodes)
    }


def layout_metrics(
    positions: dict[str, tuple[float, float]],
    edges: Iterable[WeightedEdge],
) -> dict[str, float | int]:
    edge_list = list(edges)
    distances = []
    weighted_distances = []
    degrees = {node_id: 0 for node_id in positions}

    for edge in edge_list:
        source = positions.get(edge.source)
        target = positions.get(edge.target)
        if source is None or target is None:
            continue

        distance = math.hypot(target[0] - source[0], target[1] - source[1])
        distances.append(distance)
        weighted_distances.append(distance * (0.35 + _clamp(edge.weight, 0.0, 1.0)))
        degrees[edge.source] = degrees.get(edge.source, 0) + 1
        degrees[edge.target] = degrees.get(edge.target, 0) + 1

    nearest_distances = []
    position_items = list(positions.items())
    for index, (_, first) in enumerate(position_items):
        nearest = min(
            (
                math.hypot(second[0] - first[0], second[1] - first[1])
                for other_index, (_, second) in enumerate(position_items)
                if other_index != index
            ),
            default=0.0,
        )
        nearest_distances.append(nearest)

    spacing_metrics = {
        "minimumNodeDistance": round(min(nearest_distances), 2)
        if nearest_distances
        else 0.0,
        "medianNearestNodeDistance": round(median(nearest_distances), 2)
        if nearest_distances
        else 0.0,
        "maxNearestNodeDistance": round(max(nearest_distances), 2)
        if nearest_distances
        else 0.0,
        "coveredNodeCount": sum(1 for degree in degrees.values() if degree > 0),
        "isolatedNodeCount": sum(1 for degree in degrees.values() if degree == 0),
    }

    if not distances:
        return {
            "edgeCount": 0,
            "medianDistance": 0.0,
            "p90Distance": 0.0,
            "p95Distance": 0.0,
            "maxDistance": 0.0,
            "weightedMeanDistance": 0.0,
            **spacing_metrics,
        }

    return {
        "edgeCount": len(distances),
        "medianDistance": round(median(distances), 2),
        "p90Distance": round(_percentile(distances, 0.90), 2),
        "p95Distance": round(_percentile(distances, 0.95), 2),
        "maxDistance": round(max(distances), 2),
        "weightedMeanDistance": round(sum(weighted_distances) / len(weighted_distances), 2),
        **spacing_metrics,
    }
