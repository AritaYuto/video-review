"""Normalize transcription segments into event blocks."""
from typing import Any, Dict

from plugins.data_normalization.base import DataNormalizationPlugin, EventContents


class TranscriptionExportPlugin(DataNormalizationPlugin):
    """Export transcription text segments as normalized blocks."""

    name = "transcription"

    def process(self, analysis: Dict[str, Any]) -> EventContents:
        event_contents = EventContents()
        transcription = analysis.get("transcription") or {}
        segments = transcription.get("segments") or []

        for segment in segments:
            if not isinstance(segment, dict):
                continue

            text = str(segment.get("text", "")).strip()
            if not text:
                continue

            start_ms = int(float(segment.get("start", 0.0)) * 1000)
            end_ms = int(float(segment.get("end", 0.0)) * 1000)
            event_contents.append(start_ms, end_ms, text)

        return event_contents
