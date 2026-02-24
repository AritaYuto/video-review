import asyncio
import os
import time
from pathlib import Path
from typing import Optional, Dict, Any
from uuid import uuid4
import uuid

import psycopg2
from psycopg2.extras import RealDictCursor

from core.types import AnalysisRequest, TranscriptionRequest, DataNormalizationRequest
from core.config import AnalysisConfig, TranscriptionConfig, DataNormalizationConfig
from services.analysis.service import AnalysisService
from services.data_normalization.service import DataNormalizationService

from services.transcription.service import TranscriptionService
from services.logger import get_logger
from utils.helpers import env, env_bool, env_float, env_int, build_analysis_config, build_transcription_config, build_data_normalization_config

logger = get_logger(__name__)

DATABASE_URL = env("DATABASE_URL")
VIDEO_REVIEW_LOCAL_ROOTDIR = env("VIDEO_REVIEW_LOCAL_ROOTDIR")
ANALYSIS_POLL_INTERVAL_SECONDS = env_float("VIDEO_ANALYSIS_POLL_INTERVAL_SECONDS", 10.0)
ANALYSIS_SAMPLE_INTERVAL = env_float("VIDEO_ANALYSIS_SAMPLE_INTERVAL", 2.5)
ANALYSIS_TARGET_RESOLUTION = env_int("VIDEO_ANALYSIS_TARGET_RESOLUTION", 720)
ANALYSIS_OCR_LANGUAGES = env("VIDEO_ANALYSIS_OCR_LANGUAGES", "en,ja")
ANALYSIS_VOICE_LANGUAGES = env("VIDEO_ANALYSIS_VOICE_LANGUAGES", "ja")
ANALYSIS_ERROR_KEYWORDS = env("VIDEO_ANALYSIS_ERROR_KEYWORDS", "error,exception,warning")
ANALYSIS_DUMMY_KEYWORDS = env("VIDEO_ANALYSIS_DUMMY_KEYWORDS", "temp,dummy,placeholer")
ANALYSIS_DEVICE = env("VIDEO_ANALYSIS_DEVICE", "auto")
TRANSCRIPTION_ENABLED = env_bool("VIDEO_ANALYSIS_TRANSCRIPTION_ENABLED", False)
TRANSCRIPTION_MODEL = env("VIDEO_ANALYSIS_TRANSCRIPTION_MODEL", "large-v3")

STATUS_PENDING = "pending"
STATUS_RUNNING = "running"
STATUS_SUCCEEDED = "succeeded"
STATUS_FAILED = "failed"


def build_config(conn: psycopg2.extensions.connection) -> tuple[AnalysisConfig, TranscriptionConfig, DataNormalizationConfig]:
    return (
        build_analysis_config(
            sample_interval_seconds=ANALYSIS_SAMPLE_INTERVAL,
            target_resolution_height=ANALYSIS_TARGET_RESOLUTION,
            ocr_languages=ANALYSIS_OCR_LANGUAGES,
            error_keywords=ANALYSIS_ERROR_KEYWORDS.split(","),
            dummy_keywords=ANALYSIS_DUMMY_KEYWORDS.split(","),
            device=ANALYSIS_DEVICE,
        ),
        build_transcription_config(
            model_name=TRANSCRIPTION_MODEL, 
            voice_language=ANALYSIS_VOICE_LANGUAGES),
        build_data_normalization_config(),
    )


def open_db() -> psycopg2.extensions.connection:
    db_url = DATABASE_URL
    conn = psycopg2.connect(db_url)
    conn.autocommit = True
    return conn

def ensure_video_event_kind(
    conn: psycopg2.extensions.connection,
    label: str,
) -> None:
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO "VideoEventKind" ("id", "label")
            VALUES (%s, %s)
            ON CONFLICT ("label") DO NOTHING
            """,
            (str(uuid.uuid4()), label),
        )


def claim_next_revision(conn: psycopg2.extensions.connection) -> Optional[Dict[str, Any]]:
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            SELECT vr.id, vr."filePath"
            FROM "VideoRevision" vr
            LEFT JOIN "VideoAnalysisJob" job ON job."videoRevisionId" = vr.id
            WHERE job.id IS NULL AND vr.deleted = false
            ORDER BY vr."uploadedAt" ASC
            LIMIT 1
            """
        )
        row = cur.fetchone()
        if not row:
            return None

        try:
            cur.execute(
                """
                INSERT INTO "VideoAnalysisJob" (
                    "id",
                    "videoRevisionId",
                    "status"
                )
                VALUES (%s, %s, %s)
                """,
                (str(uuid4()), row["id"], STATUS_RUNNING),
            )
        except psycopg2.Error as exc:
            logger.warning(f"Failed to claim revision {row['id']}: {exc}")
            return None

        return row


def update_job_status(
    conn: psycopg2.extensions.connection,
    video_revision_id: str,
    status: str,
) -> None:
    with conn.cursor() as cur:
        cur.execute(
            """
            UPDATE "VideoAnalysisJob"
            SET
                "status" = %s
            WHERE "videoRevisionId" = %s
            """,
            (
                status,
                video_revision_id,
            ),
        )


async def process_revision(
    conn: psycopg2.extensions.connection,
    storage_root: Path,
    output_root: Path,
    row: Dict[str, Any],
) -> None:
    storage_key = row["filePath"].lstrip("/")
    video_path = storage_root / storage_key
    if not video_path.exists():
        update_job_status(conn, row["id"], STATUS_FAILED)
        logger.error(f"Video missing: {video_path}")
        return

    output_root.mkdir(parents=True, exist_ok=True)
    analysis_output_path = output_root / f"{row['id']}.json"
    data_normalization_output_path = output_root
    transcription_output = output_root / f"{row['id']}.transcription.json"

    analysis_config, transcription_config, data_normalization_config = build_config(conn)
    analysis_service = AnalysisService(analysis_config)
    data_normalization_service = DataNormalizationService(data_normalization_config)
    if TRANSCRIPTION_ENABLED:
        transcription_service = TranscriptionService(transcription_config)
    job_id = row["id"]
    update_job_status(conn, row["id"], STATUS_RUNNING)

    logger.info(
        f"[{job_id}] Start analysis: {video_path} "
        f"(device: {analysis_config.device}, whisper: {transcription_config.model_name})"
    )

    def analysis_progress_callback(progress: float, elapsed: float, processed: float, total: float) -> None:
        logger.info(
            f"[{job_id}] Progress: {progress:.1f}% ({int(processed)}/{int(total)} frames, {elapsed:.1f}s)"
        )

    def data_normalization_progress_callback(progress: float, elapsed: str) -> None:
        logger.info(
            f"[{job_id}] DataNormalization progress: {progress:.1f}% ({elapsed} elapsed)"
        )

    def transcription_progress_callback(progress: float, elapsed: str) -> None:
        logger.info(
            f"[{job_id}] Transcription progress: {progress:.1f}% ({elapsed} elapsed)"
        )

    try:
        analysis_request = AnalysisRequest(
            video_path=str(video_path),
            job_id=job_id,
            json_file_path=str(analysis_output_path),
            settings={},
        )
        result = await analysis_service.process_async(analysis_request, analysis_progress_callback)
        if result.error:
            update_job_status(conn, row["id"], STATUS_FAILED)
            logger.error(f"[{job_id}] Analysis failed: {result.error}")
            return
        analysis_service.save_result(result, str(analysis_output_path))
        logger.info(f"[{job_id}] Analysis complete: {analysis_output_path}")

        if TRANSCRIPTION_ENABLED:
            transcription_request = TranscriptionRequest(
                video_path=str(video_path),
                job_id=job_id,
                json_file_path=str(transcription_output))
            transcription_result = await transcription_service.process_async(
                transcription_request,
                transcription_progress_callback
            )
            transcription_service.save_result(transcription_result, str(transcription_output))
            logger.info(f"[{job_id}] Transcription complete: {transcription_output}")

        data_normalization_request = DataNormalizationRequest(
            video_analysis_result=result,
            video_path=str(video_path),
            job_id=job_id,
            json_file_path=str(data_normalization_output_path),
        )
        data_normalization_result = await data_normalization_service.process_async(
            data_normalization_request,
            data_normalization_progress_callback
        )
        output_names = data_normalization_service.save_result(
            data_normalization_result,
            str(data_normalization_output_path),
        )
        for name in output_names:
            ensure_video_event_kind(conn, name)
        logger.info(f"[{job_id}] DataNormalization complete")

        update_job_status(
            conn,
            row["id"],
            STATUS_SUCCEEDED,
        )
        logger.info(f"[{job_id}] Job succeeded: {video_path}")
    except Exception as exc:
        update_job_status(conn, row["id"], STATUS_FAILED)
        logger.exception(f"[{job_id}] Analysis crashed: {exc}")
    finally:
        analysis_service.cleanup()
        if TRANSCRIPTION_ENABLED:
            transcription_service.cleanup()
        data_normalization_service.cleanup()


async def run() -> None:
    if not DATABASE_URL:
        raise RuntimeError("DATABASE_URL env var is required")
    if not VIDEO_REVIEW_LOCAL_ROOTDIR:
        raise RuntimeError("VIDEO_REVIEW_LOCAL_ROOTDIR env var is required")

    poll_interval = ANALYSIS_POLL_INTERVAL_SECONDS
    storage_root = Path(VIDEO_REVIEW_LOCAL_ROOTDIR)
    output_root = storage_root / "video-analysis"

    logger.info("Video analysis worker started")
    logger.info(f"Storage root: {storage_root}")
    logger.info(f"Output root: {output_root}")
    logger.info(f"Poll interval: {poll_interval}s")

    conn = open_db()
    try:
        while True:
            row = claim_next_revision(conn)
            if row:
                await process_revision(conn, storage_root, output_root, row)
            else:
                time.sleep(poll_interval)
    finally:
        conn.close()


if __name__ == "__main__":
    asyncio.run(run())
