"""Analysis result structures."""
from dataclasses import dataclass
from typing import List, Optional

from core.types import FrameAnalysis


@dataclass
class VideoAnalysisResult:
    """Minimal video analysis result."""

    video_file: str
    frame_analysis: List[FrameAnalysis]
    error: Optional[str] = None
