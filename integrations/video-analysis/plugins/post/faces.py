"""LLM-friendly JSON export."""
from typing import Dict, Any
from plugins.post.base import BaseFrameExportPlugin


class FacesExportPlugin(BaseFrameExportPlugin):
    """Export scenes as LLM-friendly text blocks with JSON metadata."""

    name = "faces"
    
    def _get_parameter(self, frame: Dict[str, Any]):
        faces = [
            face.get("name") for face in frame.get("faces", [])
            if face.get("name")
        ]
        return ', '.join(faces) if faces else '-'