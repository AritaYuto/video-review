"""LLM-friendly JSON export."""
from typing import Dict, List, Any
from plugins.data_normalization.base import BaseDataNormalizationPlugin


class DetectedTextExportPlugin(BaseDataNormalizationPlugin):
    """Export scenes as LLM-friendly text blocks with JSON metadata."""

    name = "detected_text"
    
    def _get_parameter(self, frame: Dict[str, Any]) -> List[str]:
        return [
            item.get("text") for item in frame.get("detected_text", [])
            if item.get("text")
        ]