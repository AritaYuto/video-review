
"""LLM-friendly JSON export."""
from typing import Dict, List, Any
from plugins.data_normalization.base import BaseDataNormalizationPlugin


class ShotTypeExportPlugin(BaseDataNormalizationPlugin):
    """Export scenes as LLM-friendly text blocks with JSON metadata."""
    
    name = "shot_type"

    def _get_parameter(self, frame: Dict[str, Any]) -> List[str]:
        shot = frame.get('shot_type')
        if shot == None or shot == "no-face" or shot == "unknown":
            return []
        return [ shot ]