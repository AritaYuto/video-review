"""Metrics tracking and reporting (simplified)."""
from dataclasses import dataclass, asdict
from typing import Dict, List, Union
import time


@dataclass
class ServiceMetrics:
    """Service-level metrics."""
    total_analyses: int = 0
    total_transcriptions: int = 0
    failed_analyses: int = 0
    failed_transcriptions: int = 0
    
    def record_analysis(self, success: bool) -> None:
        """Record analysis completion."""
        self.total_analyses += 1
        if not success:
            self.failed_analyses += 1
    
    def record_transcription(self, success: bool) -> None:
        """Record transcription completion."""
        self.total_transcriptions += 1
        if not success:
            self.failed_transcriptions += 1
    
    def to_dict(self) -> Dict[str, Union[int, float]]:
        """Convert to dictionary with calculated rates."""
        return {
            "total_analyses": self.total_analyses,
            "total_transcriptions": self.total_transcriptions,
            "failed_analyses": self.failed_analyses,
            "failed_transcriptions": self.failed_transcriptions,
            "success_rate_analyses": self._success_rate(
                self.total_analyses, self.failed_analyses
            ),
            "success_rate_transcriptions": self._success_rate(
                self.total_transcriptions, self.failed_transcriptions
            )
        }
    
    @staticmethod
    def _success_rate(total: int, failed: int) -> float:
        """Calculate success rate percentage."""
        if total == 0:
            return 100.0
        return ((total - failed) / total) * 100.0


@dataclass
class PerformanceMetrics:
    """Performance metrics for specific stages."""
    stage: str
    duration_seconds: float
    frames_processed: int = 0
    fps: float = 0.0
    memory_mb: float = 0.0
    peak_memory_mb: float = 0.0


@dataclass
class PluginMetrics:
    """Plugin-specific performance metrics (minimal)."""
    plugin_name: str
    total_duration_seconds: float = 0.0
    frames_processed: int = 0
    error_count: int = 0

    def to_dict(self) -> Dict[str, Union[str, int, float]]:
        """Convert to dictionary."""
        return asdict(self)


class PluginMetricsCollector:
    """Collects and aggregates plugin metrics (minimal)."""

    def __init__(self):
        self._totals: Dict[str, float] = {}
        self._counts: Dict[str, int] = {}
        self._errors: Dict[str, int] = {}

    def record_execution(self, plugin_name: str, duration_ms: float) -> None:
        """Record a plugin execution time."""
        self._totals[plugin_name] = self._totals.get(plugin_name, 0.0) + duration_ms
        self._counts[plugin_name] = self._counts.get(plugin_name, 0) + 1

    def record_error(self, plugin_name: str) -> None:
        """Record a plugin error."""
        self._errors[plugin_name] = self._errors.get(plugin_name, 0) + 1

    def record_timeout(self, plugin_name: str) -> None:
        """Record a plugin timeout."""
        return None

    def get_metrics(self) -> List[PluginMetrics]:
        """Get aggregated metrics for all plugins."""
        metrics: List[PluginMetrics] = []

        for plugin_name, total_ms in self._totals.items():
            count = self._counts.get(plugin_name, 0)
            if count <= 0:
                continue
            metrics.append(PluginMetrics(
                plugin_name=plugin_name,
                total_duration_seconds=total_ms / 1000.0,
                frames_processed=count,
                error_count=self._errors.get(plugin_name, 0)
            ))

        metrics.sort(key=lambda x: x.total_duration_seconds, reverse=True)
        return metrics


class StageTimer:
    """Context manager for timing operations."""
    
    def __init__(self, stage_name: str):
        self.stage_name = stage_name
        self.start_time: float = 0.0
        self.end_time: float = 0.0
        self.duration: float = 0.0
    
    def __enter__(self) -> "StageTimer":
        self.start_time = time.time()
        return self
    
    def __exit__(self, *args) -> None:
        self.end_time = time.time()
        self.duration = self.end_time - self.start_time
