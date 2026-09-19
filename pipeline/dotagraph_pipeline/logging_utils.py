from __future__ import annotations

import json
import logging
from typing import Any


LOGGER_NAME = "dotagraph.pipeline"


def configure_logging(*, verbose: bool = False) -> logging.Logger:
    logger = logging.getLogger(LOGGER_NAME)
    logger.setLevel(logging.DEBUG if verbose else logging.INFO)

    if not logger.handlers:
        handler = logging.StreamHandler()
        handler.setFormatter(
            logging.Formatter(
                fmt="%(asctime)sZ %(levelname)s %(message)s",
                datefmt="%Y-%m-%dT%H:%M:%S",
            )
        )
        logger.addHandler(handler)

    logger.propagate = False
    return logger


def log_event(
    logger: logging.Logger,
    event: str,
    *,
    level: int = logging.INFO,
    **fields: Any,
) -> None:
    payload = {"event": event, **fields}
    logger.log(
        level,
        json.dumps(payload, ensure_ascii=False, sort_keys=True, default=str),
    )
