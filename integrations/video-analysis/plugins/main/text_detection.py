from .base import AnalyzerPlugin, FrameAnalysis, PluginResult
from typing import Dict, Optional, Union, List
import numpy as np
import cv2
from core.config import AnalysisConfig
import easyocr

from services.logger import get_logger

logger = get_logger(__name__)


class TextDetectionPlugin(AnalyzerPlugin):
    """Analyzes frames to detect and recognize text using EasyOCR."""

    def __init__(self, config: AnalysisConfig):
        super().__init__(config)
        self.reader: Optional[easyocr.Reader] = None
        self.text_scale = 1.0
        self.text_threshold: float = 0.6
        self.low_text: float = 0.4

        self.use_gpu = self.config.get("device") != 'cpu'

    def setup(self, video_path, job_id) -> None:
        """Initialize the EasyOCR reader."""
        try:
            languages = self.config.get("ocr_languages", ["jp", "en"])
            self.error_keywords = self.config.get("error_keywords", [])
            self.reader = easyocr.Reader(
                languages,
                gpu=self.use_gpu,
                verbose=False,
                download_enabled=True
            )
        except Exception as e:
            logger.error(f"Failed to initialize EasyOCR reader: {e}")
            self.reader = None

    def analyze_frame(self, frame: np.ndarray, frame_analysis: FrameAnalysis, video_path: str) -> FrameAnalysis:
        """Detect text in a single frame with optimizations."""
        if self.reader is None:
            return frame_analysis

        try:
            scale_factor = float(frame_analysis.get('scale_factor', 1.0))
            results = self._read_text(frame)

            if not results:
                frame_analysis['detected_text'] = []
                return frame_analysis
            detected_texts = self._normalize_detections(results, scale_factor)

            frame_analysis['detected_text'] = detected_texts
            frame_analysis['error_texts'] = self._detect_error_texts(detected_texts)

        except Exception as e:
            logger.error(f"Error during text detection: {e}")
            frame_analysis['detected_text'] = []

        return frame_analysis

    def get_results(self) -> PluginResult:
        return None

    def get_summary(self) -> PluginResult:
        return None
    
    def cleanup(self) -> None:
        """Clean up any data from previous processing job."""
        return None

    def _read_text(self, frame: np.ndarray) -> List:
        if self.text_scale != 1.0:
            small_frame = cv2.resize(
                frame,
                (0, 0),
                fx=self.text_scale,
                fy=self.text_scale,
                interpolation=cv2.INTER_LINEAR
            )
        else:
            small_frame = frame

        frame_rgb = cv2.cvtColor(small_frame, cv2.COLOR_BGR2RGB)

        return self.reader.readtext(
            frame_rgb,
            detail=1,
            paragraph=False,
            min_size=10,
            text_threshold=self.text_threshold,
            low_text=self.low_text,
            link_threshold=0.4,
            canvas_size=2560,
            mag_ratio=1.0
        )

    def _normalize_detections(
        self,
        results: List,
        scale_factor: float
    ) -> List[Dict[str, Union[str, float, List[List[int]], Dict[str, int]]]]:
        detected_texts: List[Dict[str, Union[str, float, List[List[int]], Dict[str, int]]]] = []
        scale_inverse = 1.0 / self.text_scale

        for (bbox, text, prob) in results:
            if prob < self.text_threshold:
                continue

            scaled_bbox = [
                [int(p[0] * scale_inverse * scale_factor),
                 int(p[1] * scale_inverse * scale_factor)]
                for p in bbox
            ]

            x_coords = [p[0] for p in scaled_bbox]
            y_coords = [p[1] for p in scaled_bbox]

            x_min = min(x_coords)
            y_min = min(y_coords)
            x_max = max(x_coords)
            y_max = max(y_coords)

            detected_texts.append({
                'text': text,
                'confidence': float(prob) * 100,
                'bounding_box': scaled_bbox,
                'bbox': {
                    'x': x_min,
                    'y': y_min,
                    'width': x_max - x_min,
                    'height': y_max - y_min
                }
            })

        return detected_texts

    def _detect_error_texts(
        self,
        detected_texts: List[Dict[str, Union[str, float, Dict[str, int]]]]
    ) -> List[Dict[str, Union[str, float, Dict[str, int]]]]:
        if not self.error_keywords:
            return []

        keywords = [k.lower() for k in self.error_keywords]
        matches: List[Dict[str, Union[str, float, Dict[str, int]]]] = []

        for item in detected_texts:
            text = str(item.get("text", ""))
            text_lower = text.lower()
            hit = None
            for kw in keywords:
                if kw and kw in text_lower:
                    hit = kw
                    break
            if hit:
                matches.append({
                    "text": text,
                    "keyword": hit,
                    "confidence": item.get("confidence", 0.0),
                    "bbox": item.get("bbox", {})
                })

        return matches
