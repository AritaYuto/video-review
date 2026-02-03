"""Post-processing plugin manager."""
import json
from pathlib import Path
from typing import Dict, Any, List

from services.logger import get_logger
from services.analysis.plugin_manager_base import PluginManagerBase
from services.analysis.plugins import post_plugin_definitions

logger = get_logger(__name__)


class PostPluginManager(PluginManagerBase):
    """Manages post-processing plugins."""

    def __init__(self) -> None:
        super().__init__()
        self._load_post_plugins()

    def _load_post_plugins(self) -> None:
        def predicate(cls, plugin_name: str) -> bool:
            return cls.__name__ == plugin_name

        def factory(cls):
            return cls()

        self._load_plugins(
            plugin_definitions=post_plugin_definitions,
            module_prefix="plugins.post",
            predicate=predicate,
            factory=factory,
        )

        logger.info(f"Loaded {len(self.plugins)} post plugins")

    def run(self, analysis: Dict[str, Any]) -> Dict[str, Any]:
        outputs: Dict[str, Any] = {}
        for plugin in self.plugins:
            try:
                outputs[plugin.name] = plugin.process(analysis)
            except Exception as exc:
                logger.error(f"Post plugin {plugin.name} failed: {exc}")
        return outputs

    def run_and_save(self, analysis: Dict[str, Any], output_base_path: Path) -> List[Path]:
        outputs = self.run(analysis)
        written: List[Path] = []

        for name, payload in outputs.items():
            target = output_base_path.with_suffix(output_base_path.suffix + f".{name}.json")
            with target.open("w", encoding="utf-8") as handle:
                json.dump(payload, handle, ensure_ascii=False, indent=2)
            written.append(target)

        return written
