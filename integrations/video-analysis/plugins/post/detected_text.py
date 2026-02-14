"""LLM-friendly JSON export."""
from typing import Dict, Any
from plugins.post.base import BaseFrameExportPlugin


class DetectedTextExportPlugin(BaseFrameExportPlugin):
    """Export scenes as LLM-friendly text blocks with JSON metadata."""

    name = "detected_text"
    
    def _get_parameter(self, frame: Dict[str, Any]) -> str:
        texts = [
            item.get("text") for item in frame.get("detected_text", [])
            if item.get("text")
        ]
        return ', '.join(texts) if texts else '-'