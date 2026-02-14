"""LLM-friendly JSON export."""
from typing import Dict, Any
from plugins.post.base import BaseFrameExportPlugin


class DominantColorExportPlugin(BaseFrameExportPlugin):
    """Export scenes as LLM-friendly text blocks with JSON metadata."""
    
    name = "dominant_color"

    def _get_parameter(self, frame: Dict[str, Any]) -> str:
        color = frame.get("dominant_color") or {}
        color_text = (
            f"{color.get('name')} ({color.get('hex')})"
            if color else "-"
        )
        return color_text
