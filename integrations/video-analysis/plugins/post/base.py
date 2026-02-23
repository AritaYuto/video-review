"""Base post-processing plugin interface."""
from dataclasses import dataclass, field
from typing import Protocol, Dict, Any, List
from abc import abstractmethod


@dataclass
class EventContents:
    @dataclass
    class Block:
        start_ms: int = 0
        end_ms: int = 0
        data: str = ""

    blocks: List[Block] = field(default_factory=list)

    def append(self, s: int, e: int, d: str):
        if not d:
            return

        top = self.blocks[-1] if self.blocks else None

        if top is None or top.data != d:
            self.blocks.append(EventContents.Block(s, e, d))
        else:
            top.end_ms = e

    def is_empty(self):
        return len(self.blocks) == 0


class DataNormalizationPlugin(Protocol):
    """Protocol for post-processing plugins."""

    name: str

    def process(self, analysis: Dict[str, Any]) -> EventContents:
        """Return a JSON-serializable payload derived from analysis."""
        ...


class BaseDataNormalizationPlugin(DataNormalizationPlugin):
    """Export scenes as LLM-friendly text blocks with JSON metadata."""

    name = "Base"

    def process(self, analysis: Dict[str, Any]) -> EventContents:
        event_contents = EventContents()
        frames = analysis.get("frame_analysis") or []

        for frame in frames:
            start_ms = frame.get("start_time_ms", 0)
            end_ms = frame.get("end_time_ms", 0)
            param = self._get_parameter(frame)
            event_contents.append(start_ms, end_ms, param)

        return event_contents
    
    @abstractmethod
    def _get_parameter(self, analysis: Dict[str, Any]) -> List[str]:
        pass
