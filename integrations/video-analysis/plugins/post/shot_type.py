
"""LLM-friendly JSON export."""
from typing import Dict, Any
from plugins.post.base import BaseFrameExportPlugin


class ShotTypeExportPlugin(BaseFrameExportPlugin):
    """Export scenes as LLM-friendly text blocks with JSON metadata."""
    
    name = "shot_type"

    def _get_parameter(self, frame: Dict[str, Any]) -> str:
        return frame.get('shot_type') or ''