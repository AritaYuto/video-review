"""LLM-friendly JSON export."""
from typing import Dict, Any, List
from plugins.post.base import BaseDataNormalizationPlugin


class DummyTextExportPlugin(BaseDataNormalizationPlugin):
    """
    Export detected dummy texts as a comma-separated string
    suitable for LLM input or plain-text export.
    """

    name = "dummy_text"

    def _get_parameter(self, frame: Dict[str, Any]) -> List[str]:
        dummy_items: List[Dict[str, Any]] = frame.get("dummy_text") or []

        texts: List[str] = []
        for item in dummy_items:
            if not isinstance(item, dict):
                continue

            text = item.get("text")
            if text:
                texts.append(str(text).strip())

        return texts
