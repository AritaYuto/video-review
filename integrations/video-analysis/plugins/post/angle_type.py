"""LLM-friendly JSON export."""
from typing import Dict, Any
from plugins.post.base import BaseFrameExportPlugin


class AngleTypeExportPlugin(BaseFrameExportPlugin):
    """Export scenes as LLM-friendly text blocks with JSON metadata."""
    
    name = "angle_type"

    def _get_parameter(self, frame: Dict[str, Any]) -> str:
        return frame.get('angle_type') or '-'
    
