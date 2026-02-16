"""Frame analysis plugin manager."""
import time
import traceback
from dataclasses import asdict
from typing import Dict, List

import numpy as np

from core.config import AnalysisConfig
from core.types import FrameAnalysis
from monitoring.metrics import PluginMetricsCollector
from services.logger import get_logger
from services.plugin_manager_base import PluginManagerBase
from plugins.main.base import AnalyzerPlugin

logger = get_logger(__name__)


class PluginManager(PluginManagerBase):
    """Manages frame analysis plugins."""

    def __init__(self, config: AnalysisConfig):
        super().__init__()
        self.config = config
        self.metrics_collector = PluginMetricsCollector()
        self.frame_counters: Dict[str, int] = {}
        self._load_frame_plugins()

    def _load_frame_plugins(self) -> None:
        config_dict = asdict(self.config)
        config_dict["device"] = self.config.device
        config_dict["caption_context"] = self.config.caption_context
        config_dict["ocr_languages"] = self.config.ocr_languages

        def predicate(cls, plugin_name: str) -> bool:
            return (
                cls is not AnalyzerPlugin
                and issubclass(cls, AnalyzerPlugin)
                and cls.__name__ == plugin_name
            )

        def factory(cls):
            return cls(config_dict)

        self._load_plugins(
            plugin_definitions=[
                ("ObjectDetectionPlugin", "object_detection"),
                ("FaceRecognitionPlugin", "face_recognition"),
                ("ShotSemanticPlugin", "shot_type"),
                ("DominantColorPlugin", "dominant_color"),
                ("DescriptorPlugin", "descriptor"),
                ("TextDetectionPlugin", "text_detection"),
            ],
            module_prefix="plugins.main",
            predicate=predicate,
            factory=factory,
        )

        logger.info(f"Loaded {len(self.plugins)} frame plugins")

    def setup_plugins(self, video_path: str, job_id: str) -> None:
        for plugin in self.plugins:
            try:
                plugin.setup(video_path, job_id)
            except Exception as exc:
                logger.error(f"Failed to setup {plugin.__class__.__name__}: {exc}")

    def process_frame(
        self,
        frame: np.ndarray,
        frame_analysis: FrameAnalysis,
        frame_idx: int,
        video_path: str,
    ) -> FrameAnalysis:
        for plugin in self.plugins:
            if not self._should_run_plugin(plugin, frame_idx):
                continue

            try:
                result = self._execute_plugin(plugin, frame, frame_analysis, video_path)
                if result:
                    frame_analysis.update(result)
            except Exception as exc:
                logger.warning(
                    f"Plugin {plugin.__class__.__name__} failed on frame {frame_idx}: {exc}"
                )
                logger.error(traceback.format_exc())
                self.metrics_collector.record_error(plugin.__class__.__name__)

        return frame_analysis

    def _should_run_plugin(self, plugin: AnalyzerPlugin, frame_idx: int) -> bool:
        plugin_name = plugin.__class__.__name__

        critical_plugins = ["FaceRecognitionPlugin", "ObjectDetectionPlugin"]
        if plugin_name in critical_plugins:
            return True

        skip_interval = self.config.plugin_skip_interval.get(plugin_name, 1)

        if plugin_name not in self.frame_counters:
            self.frame_counters[plugin_name] = 0

        self.frame_counters[plugin_name] += 1

        return self.frame_counters[plugin_name] % skip_interval == 0

    def _execute_plugin(
        self,
        plugin: AnalyzerPlugin,
        frame: np.ndarray,
        frame_analysis: FrameAnalysis,
        video_path: str,
    ) -> FrameAnalysis:
        plugin_name = plugin.__class__.__name__
        start_time = time.time()

        try:
            result = plugin.analyze_frame(frame, frame_analysis, video_path)
            duration_ms = (time.time() - start_time) * 1000
            self.metrics_collector.record_execution(plugin_name, duration_ms)
            return result
        except Exception:
            duration_ms = (time.time() - start_time) * 1000
            self.metrics_collector.record_error(plugin_name)
            raise

    def get_metrics(self) -> List[Dict]:
        metrics = self.metrics_collector.get_metrics()
        return [m.to_dict() for m in metrics]

    def reset_metrics(self) -> None:
        self.metrics_collector = PluginMetricsCollector()
        self.frame_counters = {}

    def cleanup_plugins(self) -> None:
        for plugin in self.plugins:
            try:
                plugin.cleanup()
                logger.info(f"Cleaned up plugin: {plugin.__class__.__name__}")
            except Exception as exc:
                logger.error(f"Failed to cleanup {plugin.__class__.__name__}: {exc}")
