"""Base post-processing plugin interface."""
from typing import Protocol, Dict, Any


class PostPlugin(Protocol):
    """Protocol for post-processing plugins."""

    name: str

    def process(self, analysis: Dict[str, Any]) -> Dict[str, Any]:
        """Return a JSON-serializable payload derived from analysis."""
        ...
