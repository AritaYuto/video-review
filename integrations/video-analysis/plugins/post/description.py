"""LLM-friendly JSON export."""
from typing import Dict, Any
from plugins.post.base import BaseFrameExportPlugin


class DescriptionExportPlugin(BaseFrameExportPlugin):
    """Export scenes as LLM-friendly text blocks with JSON metadata."""
    
    name = "description"

    def _get_parameter(self, frame: Dict[str, Any]):
        return frame.get('description') or '-'
