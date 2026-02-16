from typing import Dict, Any, List
from plugins.main.base import BaseFrameExportPlugin


class ErrorTextsExportPlugin(BaseFrameExportPlugin):
    """
    Export detected error texts as a comma-separated string
    suitable for LLM input or plain-text export.
    """

    name = "error_texts"

    def _get_parameter(self, frame: Dict[str, Any]) -> str:
        error_items: List[Dict[str, Any]] = frame.get("error_texts") or []

        if not isinstance(error_items, list):
            return "-"

        texts: List[str] = []

        for item in error_items:
            if not isinstance(item, dict):
                continue

            text = item.get("text")
            if text:
                texts.append(str(text).strip())

        return ", ".join(texts) if texts else "-"
