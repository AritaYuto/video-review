from typing import List, Dict
import numpy as np
from collections import deque
from plugins.main.base import AnalyzerPlugin, FrameAnalysis, PluginResult
from core.config import AnalysisConfig
import cv2

class ShotSemanticPlugin(AnalyzerPlugin):
    """Video shot type classification based on face coverage."""

    def __init__(self, config: AnalysisConfig):
        super().__init__(config)
        self.close_up_threshold = 0.3
        self.medium_shot_threshold = 0.1
        self.tilt_threshold = 5.0
        self.ratio_window: deque = deque(maxlen=5)

    def setup(self, video_path: str, job_id: str) -> None:
        self.ratio_window.clear()

    def analyze_frame(
        self,
        frame: np.ndarray,
        frame_analysis: FrameAnalysis,
        video_path: str
    ) -> FrameAnalysis:
        height, width = frame.shape[:2]
        faces = frame_analysis.get("faces", [])

        angle_type = self._classify_tilt(frame) 
        shot_type = self._classify_shot(width, height, faces)
        frame_analysis["shot_type"] = shot_type
        frame_analysis["angle_type"] = angle_type

        return frame_analysis


    def _classify_tilt(self, frame: np.ndarray) -> float:
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        edges = cv2.Canny(gray, 50, 150)

        lines = cv2.HoughLines(edges, 1, np.pi / 180, 150)

        if lines is None:
            return 0.0

        angles = []

        # Hough theta is normal vector angle.
        # 90 degrees corresponds to horizontal lines in image space.
        for rho, theta in lines[:50]:
            degree = theta * 180 / np.pi
            angles.append(degree)

        # Compute deviation from horizontal baseline (90°).
        # Larger deviation indicates stronger camera roll (Dutch angle).
        horizontal_deviation = [
            abs(angle - 90) for angle in angles
        ]

        tilt_degree = np.median(horizontal_deviation)
        return "dutch" if tilt_degree > getattr(self.config, "tilt_threshold", 0.5) else "neutral"


    def _classify_shot(
        self,
        frame_width: int,
        frame_height: int,
        faces: List[Dict],
    ) -> str:

        if frame_width == 0 or frame_height == 0:
            return "unknown"

        # --- Active Area (Excluding Subtitles) ---
        effective_height = frame_height
        if getattr(self.config, "ignore_subtitle_area", True):
            subtitle_ratio = getattr(self.config, "subtitle_ratio", 0.33)
            effective_height = int(frame_height * (1.0 - subtitle_ratio))

        effective_area = frame_width * effective_height
        if effective_area == 0:
            return "unknown"

        # --- Faceless (characters) are handled separately ---
        if not faces:
            return "no-face"

        total_area = 0.0
        max_area = 0.0

        for face in faces:
            location = face.get("location")
            if not location or len(location) != 4:
                continue

            top, right, bottom, left = location

            # Clip face bounding boxes to effective ROI
            # (subtitle / UI area excluded from analysis)
            top = max(0, top)
            bottom = min(effective_height, bottom)

            width = max(0, right - left)
            height = max(0, bottom - top)

            area = width * height

            total_area += area
            max_area = max(max_area, area)

        if total_area == 0:
            return "no-face"

        use_largest = getattr(self.config, "use_largest_face_only", True)

        # Optionally classify shot size based on the dominant (largest) face
        # instead of total face coverage to better represent main subject framing.
        if use_largest:
            ratio = max_area / effective_area
        else:
            ratio = total_area / effective_area

        ratio = float(min(1.0, max(0.0, ratio)))

        self.ratio_window.append(ratio)
        smoothed_ratio = np.mean(self.ratio_window)

        close_th = getattr(self.config, "close_up_threshold", 0.35)
        medium_th = getattr(self.config, "medium_shot_threshold", 0.15)

        if smoothed_ratio >= close_th:
            return "close-up"
        elif smoothed_ratio >= medium_th:
            return "medium-shot"
        else:
            return "wide-shot"


    def get_results(self) -> PluginResult:
        return None

    def get_summary(self) -> PluginResult:
        return None

    def cleanup(self) -> None:
        """Clean up any data from previous processing job."""
        return None
