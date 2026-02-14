"""Memory monitoring and management."""
import gc
import time
from typing import Dict

from services.logger import get_logger

logger = get_logger(__name__)

try:
    import psutil
    HAS_PSUTIL = True
except ImportError:
    HAS_PSUTIL = False
    logger.warning("psutil not installed. Memory tracking disabled.")


class MemoryMonitor:
    """Monitors and manages memory usage."""

    def __init__(self, enable_aggressive_gc: bool = False):
        self.enable_aggressive_gc = enable_aggressive_gc
        self.process = psutil.Process() if HAS_PSUTIL else None
        self.peak_memory_mb: float = 0.0
        self.cleanup_count: int = 0
        self.last_cleanup_time: float = time.time()

    def get_memory_mb(self) -> float:
        """Get current memory usage in MB."""
        if not self.process:
            return 0.0

        mem_mb = self.process.memory_info().rss / 1024 / 1024
        self.peak_memory_mb = max(self.peak_memory_mb, mem_mb)
        return mem_mb

    def force_cleanup(self, aggressive: bool = False) -> None:
        """Force garbage collection (optional aggressive mode)."""
        if not self.enable_aggressive_gc and not aggressive:
            return

        now = time.time()
        if not aggressive and (now - self.last_cleanup_time) < 5.0:
            return

        self.last_cleanup_time = now
        gc.collect()
        self.cleanup_count += 1

    def check_memory_pressure(self, threshold_gb: float = 2.0) -> bool:
        """Check if system is under memory pressure."""
        if not HAS_PSUTIL:
            return False

        available_gb = psutil.virtual_memory().available / (1024**3)
        return available_gb < threshold_gb

    def get_stats(self) -> Dict[str, float]:
        """Get basic memory statistics."""
        if not self.process:
            return {}

        mem_info = self.process.memory_info()
        return {
            "current_mb": mem_info.rss / 1024 / 1024,
            "peak_mb": self.peak_memory_mb,
            "cleanup_count": self.cleanup_count,
        }
