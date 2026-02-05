"""LLM-friendly JSON export."""
from typing import Dict, Any, List

from plugins.post.base import PostPlugin


class ScenesExportPlugin(PostPlugin):
    """Export scenes as LLM-friendly text blocks with JSON metadata."""

    name = "scenes"

    def process(self, analysis: Dict[str, Any]) -> Dict[str, Any]:
        contents: List[str] = []
        frames = analysis.get("frame_analysis") or []

        for frame in frames:
            start_ms = frame.get("start_time_ms", 0)
            end_ms = frame.get("end_time_ms", 0)

            def ms_to_sec(ms):
                return f"{ms / 1000:.1f}s"

            objects = [
                obj.get("label") for obj in frame.get("objects", [])
                if obj.get("label")
            ]
            faces = [
                face.get("name") for face in frame.get("faces", [])
                if face.get("name")
            ]
            texts = [
                item.get("text") for item in frame.get("detected_text", [])
                if item.get("text")
            ]

            color = frame.get("dominant_color") or {}
            color_text = (
                f"{color.get('name')} ({color.get('hex')})"
                if color else "-"
            )

            block = "\n".join([
                f"[{ms_to_sec(start_ms)}–{ms_to_sec(end_ms)}]",
                f"shot: {frame.get('shot_type') or '-'}",
                f"description: {frame.get('description') or '-'}",
                f"objects: {', '.join(objects) if objects else '-'}",
                f"faces: {', '.join(faces) if faces else '-'}",
                f"text: {', '.join(texts) if texts else '-'}",
                f"color: {color_text}",
            ])

            contents.append(block)

        return {
            "video_file": analysis.get("video_file"),
            "summary": analysis.get("summary"),
            "format": "scenes.v1.txt",
            "content": contents,
        }