"""Base post-processing plugin interface."""
from dataclasses import dataclass, field
from typing import Protocol, Dict, Any, List
from abc import abstractmethod


@dataclass
class Block:
    start_ms: int = 0
    end_ms: int = 0
    data: str = ""


@dataclass
class Contents:
    blocks: List[Block] = field(default_factory=list)

    def append(self, s: int, e: int, d: str):
        if not d:
            return

        top = self.blocks[-1] if self.blocks else None

        if top is None or top.data != d:
            self.blocks.append(Block(s, e, d))
        else:
            top.end_ms = e

    def to_contents_string(self, name: str) -> List[str]:
        contents: List[str] = []
        for block in self.blocks:
            start = f"{block.start_ms / 1000:.1f}s"
            end = f"{block.end_ms / 1000:.1f}s"
            contents.append(
                "\n".join([
                    f"[{start}–{end}]",
                    f"{name}: {block.data}"
                ])
            )
        return contents
    

class PostPlugin(Protocol):
    """Protocol for post-processing plugins."""

    name: str

    def process(self, analysis: Dict[str, Any]) -> Dict[str, Any]:
        """Return a JSON-serializable payload derived from analysis."""
        ...


class BaseFrameExportPlugin(PostPlugin):
    """Export scenes as LLM-friendly text blocks with JSON metadata."""

    name = "Base"


    def process(self, analysis: Dict[str, Any]) -> Dict[str, Any]:
        contents = Contents()
        frames = analysis.get("frame_analysis") or []

        for frame in frames:
            start_ms = frame.get("start_time_ms", 0)
            end_ms = frame.get("end_time_ms", 0)
            param = self._get_parameter(frame)
            contents.append(start_ms, end_ms, param)

        result = contents.to_contents_string(self.name)
        if len(result) > 0:
            return {
                "video_file": analysis.get("video_file"),
                "summary": analysis.get("summary"),
                "content": result,
            }
        else:
            return {}
        
    
    @abstractmethod
    def _get_parameter(self, analysis: Dict[str, Any]) -> str:
        pass
