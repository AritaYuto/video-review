"""Video data normalization service."""
from dataclasses import asdict
from typing import Optional, Callable
from pathlib import Path
import time
import json

from core.types import DataNormalizationRequest
from core.config import DataNormalizationConfig
from core.errors import DataNormalizationError
from services.data_normalization.plugins import PluginManager
from services.base_service import BaseProcessingService
from services.data_normalization.result import DataNormalizationResult
from services.logger import get_logger

logger = get_logger(__name__)


class DataNormalizationService(BaseProcessingService[DataNormalizationRequest, DataNormalizationResult]):
    """Video data normalization service with plugin support."""

    def __init__(self, config: Optional[DataNormalizationConfig] = None):
        self.config = config or DataNormalizationConfig()

        super().__init__(
            max_workers=1,
            enable_memory_monitoring=True
        )

        self.plugin_manager = PluginManager()

    def _process_sync(
        self,
        request: DataNormalizationRequest,
        progress_callback: Optional[Callable] = None
    ) -> DataNormalizationResult:
        """Synchronous data normalization implementation."""
        start_time = time.time()

        try:
            output = self.plugin_manager.run(request.video_analysis_result.to_dict())

            result = DataNormalizationResult(
                id=request.job_id,
                data=output
            )

            # Final progress update
            if progress_callback:
                elapsed = time.time() - start_time
                progress_callback(100, self._format_time(elapsed))
                
            logger.info(
                f"Data normalization completed in {time.time() - start_time:.1f}s")
            return result

        except Exception as e:
            logger.error(f"Analysis failed: {e}")
            raise DataNormalizationError(f"Data normalization failed: {e}")


    def save_result(self, result: DataNormalizationResult, output_path: str) -> list[str]:
        """Save data normalization result to JSON files and return saved output names."""
        try:
            output_file = Path(output_path)
            output_file.parent.mkdir(parents=True, exist_ok=True)
        
            id = result.id
            outputs = result.data
            saved_names: list[str] = []

            for name, payload in outputs.items():
                if not payload or payload.is_empty():
                    continue

                target = output_file / Path(id + f".{name}.json")
                with target.open("w", encoding="utf-8") as handle:
                    json.dump(
                        {"events": [asdict(b) for b in payload.blocks]},
                        handle,
                        ensure_ascii=False,
                        indent=2
                    )
                saved_names.append(name)
                logger.info(f"Results saved to: {target}")

            return saved_names
                
        except Exception as e:
            logger.error(f"Failed to save results: {e}")
            raise DataNormalizationError(f"Failed to save results: {e}")


    @staticmethod
    def _format_time(seconds: float) -> str:
        """Format seconds as MM:SS."""
        minutes = int(seconds // 60)
        secs = int(seconds % 60)
        return f"{minutes:02d}:{secs:02d}"
