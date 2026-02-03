"""LLM-friendly JSON export."""
from typing import Dict, Any, List

from plugins.post.base import PostPlugin


class ScenesExportPlugin(PostPlugin):
    """Build a compact JSON payload for scenes."""

    name = "scenes"

    def process(self, analysis: Dict[str, Any]) -> Dict[str, Any]:
        scenes: List[Dict[str, Any]] = []
        frames = analysis.get("frame_analysis") or []

        for frame in frames:
            scenes.append({
                "start_time_ms": frame.get("start_time_ms"),
                "end_time_ms": frame.get("end_time_ms"),
                "objects": [obj.get("label") for obj in frame.get("objects", []) if obj.get("label")],
                "faces": [face.get("name") for face in frame.get("faces", []) if face.get("name")],
                "detected_text": [item.get("text") for item in frame.get("detected_text", []) if item.get("text")],
                "shot_type": frame.get("shot_type"),
                "description": frame.get("description"),
                "dominant_color": frame.get("dominant_color"),
            })

        return {
            "video_file": analysis.get("video_file"),
            "summary": analysis.get("summary"),
            "scenes": scenes,
        }
