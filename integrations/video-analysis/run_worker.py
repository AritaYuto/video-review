import asyncio
import os
import time
from pathlib import Path
from typing import Optional, Dict, Any
from uuid import uuid4

import psycopg2
from psycopg2.extras import RealDictCursor

from core.types import AnalysisRequest, TranscriptionRequest
from core.config import AnalysisConfig, TranscriptionConfig
from services.analysis.service import AnalysisService
from services.transcription.service import TranscriptionService
from services.logger import get_logger
from utils.helpers import env, env_float, env_int, build_analysis_config, build_transcription_config

logger = get_logger(__name__)

DATABASE_URL = env("DATABASE_URL")
VIDEO_REVIEW_LOCAL_ROOTDIR = env("VIDEO_REVIEW_LOCAL_ROOTDIR")
ANALYSIS_POLL_INTERVAL_SECONDS = env_float("ANALYSIS_POLL_INTERVAL_SECONDS", 10.0)
ANALYSIS_SAMPLE_INTERVAL = env_float("ANALYSIS_SAMPLE_INTERVAL", 2.5)
ANALYSIS_TARGET_RESOLUTION = env_int("ANALYSIS_TARGET_RESOLUTION", 720)
ANALYSIS_OCR_LANGUAGES = env("ANALYSIS_OCR_LANGUAGES", "en,ja")
ANALYSIS_DEVICE = env("ANALYSIS_DEVICE", "auto")
TRANSCRIPTION_MODEL = env("TRANSCRIPTION_MODEL", "medium")
TRANSCRIPTION_MODEL_CACHE = env("TRANSCRIPTION_MODEL_CACHE", "ml-models/.whisper")


STATUS_PENDING = "pending"
STATUS_RUNNING = "running"
STATUS_SUCCEEDED = "succeeded"
STATUS_FAILED = "failed"


def build_config() -> tuple[AnalysisConfig, TranscriptionConfig]:
    return (
        build_analysis_config(
            sample_interval_seconds=ANALYSIS_SAMPLE_INTERVAL,
            target_resolution_height=ANALYSIS_TARGET_RESOLUTION,
            ocr_languages=ANALYSIS_OCR_LANGUAGES,
            device=ANALYSIS_DEVICE,
        ),
        build_transcription_config(
            model_name=TRANSCRIPTION_MODEL,
            cache_dir=TRANSCRIPTION_MODEL_CACHE,
        ),
    )


def open_db() -> psycopg2.extensions.connection:
    db_url = DATABASE_URL
    conn = psycopg2.connect(db_url)
    conn.autocommit = True
    return conn


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
    transcription_output = output_root / f"{row['id']}.transcription.json"

    analysis_config, transcription_config = build_config()
    analysis_service = AnalysisService(analysis_config)
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

    def transcription_progress_callback(progress: float, elapsed: str) -> None:
        logger.info(
            f"[{job_id}] Transcription progress: {progress:.1f}% ({elapsed} elapsed)"
        )

    analysis_request = AnalysisRequest(
        video_path=str(video_path),
        job_id=job_id,
        json_file_path=str(analysis_output_path),
        settings={},
    )
    
    transcription_request = TranscriptionRequest(
        video_path=str(video_path),
        job_id=job_id,
        json_file_path=str(transcription_output),
    )

    try:
        result = await analysis_service.process_async(analysis_request, analysis_progress_callback)
        if result.error:
            update_job_status(conn, row["id"], STATUS_FAILED)
            logger.error(f"[{job_id}] Analysis failed: {result.error}")
            return

        analysis_service.save_result(result, str(analysis_output_path))
        logger.info(f"[{job_id}] Analysis complete: {analysis_output_path}")

        transcription_result = await transcription_service.process_async(
            transcription_request,
            transcription_progress_callback
        )
        transcription_service.save_result(transcription_result, str(transcription_output))
        logger.info(f"[{job_id}] Transcription complete: {transcription_output}")

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
        transcription_service.cleanup()


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
