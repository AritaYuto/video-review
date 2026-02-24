from typing import List, Dict, Tuple
from services.logger import get_logger
import numpy as np
from collections import deque
from plugins.main.base import AnalyzerPlugin, FrameAnalysis, PluginResult
from core.config import AnalysisConfig
import cv2
from collections import Counter

logger = get_logger(__name__)

class ShotSemanticPlugin(AnalyzerPlugin):
    """Video shot type classification based on face coverage."""

    def __init__(self, config: AnalysisConfig):
        super().__init__(config)
        self.ratio_window: deque = deque(maxlen=5)
        self.tilt_history = deque(maxlen=10)


    def setup(self, video_path: str, job_id: str) -> None:
        self.ratio_window.clear()
        self.tilt_history.clear()


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


    def _classify_tilt(self, frame: np.ndarray) -> str:
        lines = self._detect_lines(frame)

        if lines is None or len(lines) < 3:
            current_result = "neutral"
        else:
            angles = []
            for line in lines:
                x1, y1, x2, y2 = line[0]
                angle = np.degrees(np.arctan2(y2 - y1, x2 - x1))
                dev = abs(abs(angle) - 90)
                if dev < 20: 
                    angles.append(dev)

            if not angles:
                current_result = "neutral"
            else:
                if np.std(angles) > 3.0:
                    current_result = "neutral" 
                else:
                    tilt_val = np.median(angles)
                    threshold = self.config.get("tilt_threshold")
                    current_result = "dutch" if tilt_val > threshold else "neutral"

        self.tilt_history.append(current_result)
        return Counter(self.tilt_history).most_common(1)[0][0]


    def _classify_shot(
        self,
        frame_width: int,
        frame_height: int,
        faces: List[Dict],
    ) -> str:
        if frame_width == 0 or frame_height == 0:
            logger.info("Shot classify: invalid frame size")
            return "unknown"

        # --- Active Area (Excluding Subtitles) ---
        subtitle_ratio = self.config.get("subtitle_ratio")
        effective_height = int(frame_height * (1.0 - subtitle_ratio))

        effective_area = frame_width * effective_height
        if effective_area == 0:
            logger.info("Shot classify: effective area is zero")
            return "unknown"

        if not faces:
            logger.info("Shot classify: no faces detected")
            return "no-face"

        max_area = self._face_area_rate(faces, effective_height)
        ratio = float(min(1.0, max(0.0, max_area / effective_area)))

        self.ratio_window.append(ratio)
        smoothed_ratio = float(np.mean(self.ratio_window))

        close_th = self.config.get("close_up_threshold")
        medium_th = self.config.get("medium_shot_threshold")

        logger.info(
            f"Shot classify: faces={len(faces)}, "
            f"ratio={ratio:.4f}, "
            f"used_ratio={ratio:.4f}, "
            f"smoothed_ratio={smoothed_ratio:.4f}, "
            f"close_th={close_th}, medium_th={medium_th}"
        )

        if smoothed_ratio >= close_th:
            return "close-up"
        elif smoothed_ratio >= medium_th:
            return "medium-shot"
        else:
            return "wide-shot"

    def _detect_lines(self, frame: np.ndarray):
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        edges = cv2.Canny(gray, 100, 200)

        h, _ = frame.shape[:2]
        lines = cv2.HoughLinesP(
            edges,
            1,
            np.pi / 180,
            threshold=100,
            minLineLength=int(h * 0.25),
            maxLineGap=10,
        )

        if lines is None or len(lines) < 4:
            return None
        return lines

    def _face_area_rate(self, faces: List[Dict], effective_height: float) -> float:
        max_area = 0.0

        for face in faces:
            location = face.get("location")
            if not location or len(location) != 4:
                continue

            top, right, bottom, left = location

            top = max(0, top)
            bottom = min(effective_height, bottom)

            width = max(0, right - left)
            height = max(0, bottom - top)

            area = width * height
            max_area = max(max_area, area)

        return max_area


    def get_results(self) -> PluginResult:
        return None


    def get_summary(self) -> PluginResult:
        return None


    def cleanup(self) -> None:
        """Clean up any data from previous processing job."""
        return None
