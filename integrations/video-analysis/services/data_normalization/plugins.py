"""Data normalization plugin manager."""
from typing import Dict, Any, Tuple

from plugins.data_normalization.base import DataNormalizationPlugin, EventContents
from services.logger import get_logger
from services.plugin_manager_base import PluginManagerBase

logger = get_logger(__name__)


class PluginManager(PluginManagerBase):
    """Manages data normalization plugins."""

    def __init__(self) -> None:
        super().__init__()
        self._load_post_plugins()

    def _load_post_plugins(self) -> None:
        def predicate(cls, plugin_name: str) -> bool:
            return cls.__name__ == plugin_name

        def factory(cls):
            return cls()

        self._load_plugins(
            plugin_definitions=[
                ("DetectedTextExportPlugin", "detected_text"),
                ("AngleTypeExportPlugin", "angle_type"),
                ("ShotTypeExportPlugin", "shot_type"),
                ("ErrorTextExportPlugin", "error_text"),
                ("DummyTextExportPlugin", "dummy_text"),
                ("TranscriptionExportPlugin", "transcription"),
            ],
            module_prefix="plugins.data_normalization",
            predicate=predicate,
            factory=factory,
        )
        logger.info(f"Loaded {len(self.plugins)} data normalization plugins")


    def run(self, analysis: Dict[str, Any]) -> Dict[str, EventContents]:
        result = {}

        for plugin in self.plugins:
            name, events = self._process_data_normazation(analysis, plugin)
            result[name] = events
        return result


    def _process_data_normazation(self, analysis: Dict[str, Any], plugin: DataNormalizationPlugin) -> Tuple[str, EventContents]:
        return plugin.name, plugin.process(analysis)
