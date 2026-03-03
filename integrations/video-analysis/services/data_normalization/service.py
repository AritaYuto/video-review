"""Video data normalization service."""
from typing import Optional, Callable, Any
import time
import uuid

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
            normalization_input = {"frame_analysis": request.analysis_frames}
            if request.transcription_segments is not None:
                segments = []
                for segment in request.transcription_segments:
                    if hasattr(segment, "to_dict"):
                        segments.append(segment.to_dict())
                    elif isinstance(segment, dict):
                        segments.append(segment)
                normalization_input["transcription"] = {"segments": segments}

            output = self.plugin_manager.run(normalization_input)

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

    def persist_result(self, conn: Any, video_revision_id: str, result: DataNormalizationResult) -> int:
        with conn.cursor() as cur:
            cur.execute(
                """
                DELETE FROM "VideoEvent"
                WHERE "videoRevisionId" = %s
                """,
                (video_revision_id,),
            )

        inserted = 0
        for kind, payload in result.data.items():
            if not payload or payload.is_empty():
                continue

            kind_id = self._ensure_video_event_kind(conn, kind)
            rows = []
            for seq, block in enumerate(payload.blocks):
                data = str(block.data).strip()
                if not data:
                    continue
                rows.append(
                    (
                        str(uuid.uuid4()),
                        video_revision_id,
                        kind_id,
                        int(block.start_ms),
                        int(block.end_ms),
                        data,
                        seq,
                    )
                )

            if not rows:
                continue

            with conn.cursor() as cur:
                cur.executemany(
                    """
                    INSERT INTO "VideoEvent"
                    ("id", "videoRevisionId", "kindId", "startMs", "endMs", "data", "seq")
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                    """,
                    rows,
                )
            inserted += len(rows)

        return inserted

    @staticmethod
    def _ensure_video_event_kind(conn: Any, label: str) -> str:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO "VideoEventKind" ("id", "label")
                VALUES (%s, %s)
                ON CONFLICT ("label") DO UPDATE
                SET "label" = EXCLUDED."label"
                RETURNING "id"
                """,
                (str(uuid.uuid4()), label),
            )
            row = cur.fetchone()
            if not row:
                raise RuntimeError(f"Failed to upsert VideoEventKind for label={label}")
            return str(row[0])

    @staticmethod
    def _format_time(seconds: float) -> str:
        """Format seconds as MM:SS."""
        minutes = int(seconds // 60)
        secs = int(seconds % 60)
        return f"{minutes:02d}:{secs:02d}"
