"""Data normalization plugin manager."""
from typing import Dict, Any

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
                ("DescriptionExportPlugin", "description"),
                ("ObjectsExportPlugin", "objects"),
                ("FacesExportPlugin", "faces"),
                ("DetectedTextExportPlugin", "detected_text"),
                ("DominantColorExportPlugin", "dominant_color"),
            ],
            module_prefix="plugins.post",
            predicate=predicate,
            factory=factory,
        )

        logger.info(f"Loaded {len(self.plugins)} data normalization plugins")

    def run(self, analysis: Dict[str, Any]) -> Dict[str, Any]:
        outputs: Dict[str, Any] = {}
        for plugin in self.plugins:
            try:
                outputs[plugin.name] = plugin.process(analysis)
            except Exception as exc:
                logger.error(f"Data normalization plugin {plugin.name} failed: {exc}")
        return outputs
