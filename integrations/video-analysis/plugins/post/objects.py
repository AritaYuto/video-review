"""LLM-friendly JSON export."""
from typing import Dict, Any
from plugins.post.base import BaseFrameExportPlugin


class ObjectsExportPlugin(BaseFrameExportPlugin):
    """Export scenes as LLM-friendly text blocks with JSON metadata."""
    
    name = "objects"


    def _get_parameter(self, frame: Dict[str, Any]) -> str:
        objects = [
            obj.get("label") for obj in frame.get("objects", [])
            if obj.get("label")
        ]
        return ', '.join(objects) if objects else '-'