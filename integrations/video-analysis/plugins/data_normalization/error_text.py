"""LLM-friendly JSON export."""
from typing import Dict, Any, List
from plugins.data_normalization.base import BaseDataNormalizationPlugin


class ErrorTextExportPlugin(BaseDataNormalizationPlugin):
    """
    Export detected error texts as a comma-separated string
    suitable for LLM input or plain-text export.
    """

    name = "error_text"

    def _get_parameter(self, frame: Dict[str, Any]) -> List[str]:
        error_items: List[Dict[str, Any]] = frame.get("error_text") or []

        texts: List[str] = []
        for item in error_items:
            if not isinstance(item, dict):
                continue

            text = item.get("text")
            if text:
                texts.append(str(text).strip())

        return texts
