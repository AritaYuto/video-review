"""Base post-processing plugin interface."""
from typing import Protocol, Dict, Any, List
from abc import abstractmethod



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
        contents: List[str] = []
        frames = analysis.get("frame_analysis") or []

        prev_param = ""

        for frame in frames:
            start_ms = frame.get("start_time_ms", 0)
            end_ms = frame.get("end_time_ms", 0)

            def ms_to_sec(ms):
                return f"{ms / 1000:.1f}s"
            
            param = self._get_parameter(frame)
            if param == prev_param:
                continue

            block = "\n".join([
                f"[{ms_to_sec(start_ms)}–{ms_to_sec(end_ms)}]",
                f"{self.name}: {self._get_parameter(frame)}",
            ])

            contents.append(block)
            prev_param = param

        return {
            "video_file": analysis.get("video_file"),
            "summary": analysis.get("summary"),
            "content": contents,
        }
    
    @abstractmethod
    def _get_parameter(self, analysis: Dict[str, Any]) -> str:
        pass
