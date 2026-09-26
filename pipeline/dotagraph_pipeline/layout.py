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
    max_nearest_distance: float = 88.0,
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

    repulsion_strength = 0.0035
    attraction_strength = 0.22
    gravity_strength = 0.0022
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

            target_length = 0.23 - 0.11 * edge.weight
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

    degrees = [0 for _ in nodes]
    neighbors: list[list[int]] = [[] for _ in nodes]
    for edge in valid_edges:
        source_index = index[edge.source]
        target_index = index[edge.target]
        degrees[source_index] += 1
        degrees[target_index] += 1
        neighbors[source_index].append(target_index)
        neighbors[target_index].append(source_index)

    # Rare heroes with only a couple of real affinity edges can be pushed onto the
    # outer hull by pairwise repulsion. Pull only those low-degree nodes toward the
    # centroid of their real layout neighbors before collision relaxation.
    for _ in range(40):
        moved = False
        for node_index, degree in enumerate(degrees):
            if degree == 0 or degree > 2:
                continue

            neighbor_indices = neighbors[node_index]
            target_x = sum(pixel_positions[i][0] for i in neighbor_indices) / len(
                neighbor_indices
            )
            target_y = sum(pixel_positions[i][1] for i in neighbor_indices) / len(
                neighbor_indices
            )
            x, y = pixel_positions[node_index]
            distance = math.hypot(target_x - x, target_y - y)
            if distance <= 150.0:
                continue

            step = min(8.0, (distance - 150.0) * 0.18)
            pixel_positions[node_index][0] += (target_x - x) / distance * step
            pixel_positions[node_index][1] += (target_y - y) / distance * step
            pixel_positions[node_index][0] = _clamp(
                pixel_positions[node_index][0], layout_left, layout_right
            )
            pixel_positions[node_index][1] = _clamp(
                pixel_positions[node_index][1], layout_top, layout_bottom
            )
            moved = True

        if not moved:
            break

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

    # Keep a lone hull node from looking detached from the rest of the graph.
    # A node is moved only when every other node is farther away than the
    # approved visual-gap target. Moving it toward its current nearest node by
    # exactly the excess distance cannot violate the minimum spacing because
    # every current pair is at least that far apart at the time of the move.
    sparse_gap_target = max(min_distance, max_nearest_distance)
    for _ in range(12):
        moved = False
        for node_index in range(count):
            x, y = pixel_positions[node_index]
            nearest_index = -1
            nearest_distance = math.inf

            for other_index, (other_x, other_y) in enumerate(pixel_positions):
                if other_index == node_index:
                    continue
                distance = math.hypot(other_x - x, other_y - y)
                if distance < nearest_distance:
                    nearest_distance = distance
                    nearest_index = other_index

            if (
                nearest_index < 0
                or nearest_distance <= sparse_gap_target + 1e-8
            ):
                continue

            target_x, target_y = pixel_positions[nearest_index]
            excess = nearest_distance - sparse_gap_target
            pixel_positions[node_index][0] += (
                (target_x - x) / nearest_distance * excess
            )
            pixel_positions[node_index][1] += (
                (target_y - y) / nearest_distance * excess
            )
            moved = True

        if not moved:
            break

    # Straight Focus links should not depend on masks to look readable. Push
    # unrelated portraits away from the interior of relationship segments while
    # keeping endpoints fixed. This is deliberately a soft relaxation: the
    # force pass still owns the organic topology, this pass only removes the
    # most distracting line-through-node accidents.
    edge_clearance = max(9.5, min_distance * 0.17)
    for _ in range(6):
        offsets = [[0.0, 0.0] for _ in nodes]
        conflicts = 0

        for edge_index, edge in enumerate(valid_edges):
            source_index = index[edge.source]
            target_index = index[edge.target]
            start_x, start_y = pixel_positions[source_index]
            end_x, end_y = pixel_positions[target_index]
            segment_x = end_x - start_x
            segment_y = end_y - start_y
            segment_length_sq = segment_x * segment_x + segment_y * segment_y
            if segment_length_sq < 1e-8:
                continue
            segment_length = math.sqrt(segment_length_sq)

            for node_index, (node_x, node_y) in enumerate(pixel_positions):
                if node_index in (source_index, target_index):
                    continue

                projection = (
                    (node_x - start_x) * segment_x
                    + (node_y - start_y) * segment_y
                ) / segment_length_sq
                if projection <= 0.08 or projection >= 0.92:
                    continue

                closest_x = start_x + segment_x * projection
                closest_y = start_y + segment_y * projection
                away_x = node_x - closest_x
                away_y = node_y - closest_y
                distance = math.hypot(away_x, away_y)
                if distance >= edge_clearance:
                    continue

                conflicts += 1
                if distance < 1e-8:
                    side = -1.0 if (node_index + edge_index) % 2 else 1.0
                    away_x = -segment_y / segment_length * side
                    away_y = segment_x / segment_length * side
                    distance = 1.0

                intrusion = edge_clearance - distance
                push = min(
                    1.8,
                    0.05 + intrusion * (0.14 + edge.weight * 0.06),
                )
                offsets[node_index][0] += away_x / distance * push
                offsets[node_index][1] += away_y / distance * push

        if conflicts == 0:
            break

        moved = False
        for node_index, (offset_x, offset_y) in enumerate(offsets):
            magnitude = math.hypot(offset_x, offset_y)
            if magnitude < 1e-8:
                continue
            if magnitude > 2.5:
                offset_x *= 2.5 / magnitude
                offset_y *= 2.5 / magnitude

            pixel_positions[node_index][0] = _clamp(
                pixel_positions[node_index][0] + offset_x,
                layout_left,
                layout_right,
            )
            pixel_positions[node_index][1] = _clamp(
                pixel_positions[node_index][1] + offset_y,
                layout_top,
                layout_bottom,
            )
            moved = True

        # Keep the edge-clearance pass from trading line readability for portrait
        # overlap. One deterministic collision sweep after every clearance step
        # is enough because the earlier 220-pass phase already established the
        # minimum spacing.
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
                pixel_positions[left][0] = _clamp(
                    pixel_positions[left][0] - ux * push,
                    layout_left,
                    layout_right,
                )
                pixel_positions[left][1] = _clamp(
                    pixel_positions[left][1] - uy * push,
                    layout_top,
                    layout_bottom,
                )
                pixel_positions[right][0] = _clamp(
                    pixel_positions[right][0] + ux * push,
                    layout_left,
                    layout_right,
                )
                pixel_positions[right][1] = _clamp(
                    pixel_positions[right][1] + uy * push,
                    layout_top,
                    layout_bottom,
                )

        if not moved:
            break

    return {
        node_id: (round(pixel_positions[i][0], 2), round(pixel_positions[i][1], 2))
        for i, node_id in enumerate(nodes)
    }


def spread_layout_positions(
    positions: dict[str, tuple[float, float]],
    *,
    width: float = 1900.0,
    height: float = 1180.0,
    margin: float = 60.0,
    max_scale: float = 1.50,
) -> dict[str, tuple[float, float]]:
    """Expand one stable organic layout into a larger virtual graph canvas.

    The browser deliberately does not fit this larger canvas perfectly at all
    times. That keeps portraits small relative to the space between them, like
    a natural force-directed graph, while preserving the exact same coordinates
    in Overview, Hover, Focus, and Matchup.
    """

    if not positions:
        return {}

    xs = [point[0] for point in positions.values()]
    ys = [point[1] for point in positions.values()]
    min_x = min(xs)
    max_x = max(xs)
    min_y = min(ys)
    max_y = max(ys)
    span_x = max(max_x - min_x, 1e-8)
    span_y = max(max_y - min_y, 1e-8)

    available_width = max(1.0, width - margin * 2)
    available_height = max(1.0, height - margin * 2)
    scale = min(
        max_scale,
        available_width / span_x,
        available_height / span_y,
    )
    scale = max(1.0, scale)

    center_x = (min_x + max_x) / 2.0
    center_y = (min_y + max_y) / 2.0
    target_x = width / 2.0
    target_y = height / 2.0

    return {
        node_id: (
            round(target_x + (point[0] - center_x) * scale, 2),
            round(target_y + (point[1] - center_y) * scale, 2),
        )
        for node_id, point in positions.items()
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
