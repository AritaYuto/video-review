"""LLM-friendly JSON export."""
from typing import Dict, Any
from plugins.post.base import BaseFrameExportPlugin


class AngleTypeExportPlugin(BaseFrameExportPlugin):
    """Export scenes as LLM-friendly text blocks with JSON metadata."""
    
    name = "angle_type"

    def _get_parameter(self, frame: Dict[str, Any]) -> str:
        shot = frame.get("shot_type")
        tilt = frame.get("angle_type")

        if tilt == "dutch" and shot in ["close-up", "medium-shot"]:
            return "dutch"
        
        return "neutral"
