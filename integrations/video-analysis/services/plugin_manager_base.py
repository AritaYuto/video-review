"""Shared plugin manager base."""
import importlib
import inspect
from typing import Callable, Iterable, List, Tuple, Type, Any

from services.logger import get_logger

logger = get_logger(__name__)

PluginDefinition = Tuple[str, str]


class PluginManagerBase:
    """Base loader for plugin managers."""

    def __init__(self) -> None:
        self.plugins: List[Any] = []

    def _load_plugins(
        self,
        plugin_definitions: Iterable[PluginDefinition],
        module_prefix: str,
        predicate: Callable[[Type[Any], str], bool],
        factory: Callable[[Type[Any]], Any],
    ) -> None:
        for plugin_name, module_stem in plugin_definitions:
            try:
                module = importlib.import_module(f"{module_prefix}.{module_stem}")
                for name, cls in inspect.getmembers(module, inspect.isclass):
                    if predicate(cls, plugin_name):
                        self.plugins.append(factory(cls))
                        logger.info(f"Loaded plugin: {plugin_name}")
                        break
            except Exception as exc:
                logger.error(f"Failed to load plugin {plugin_name}: {exc}")
