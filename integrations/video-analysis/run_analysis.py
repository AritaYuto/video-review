import argparse
import asyncio
from pathlib import Path
from datetime import datetime, timezone
import hashlib

from core.types import AnalysisRequest, DataNormalizationRequest, TranscriptionRequest
from core.config import AnalysisConfig, TranscriptionConfig
from services.analysis.service import AnalysisService
from services.data_normalization.service import DataNormalizationService
from services.transcription.service import TranscriptionService

from services.logger import get_logger
from utils.helpers import build_analysis_config, build_transcription_config, build_data_normalization_config

logger = get_logger(__name__)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Run video analysis and write JSON results"
    )
    parser.add_argument(
        "--video",
        required=True,
        help="Path to input video file"
    )
    parser.add_argument(
        "--output",
        help="Path to output JSON file (default: <video>.analysis.json)"
    )
    parser.add_argument(
        "--sample-interval",
        type=float,
        default=2.5,
        help="Frame sampling interval in seconds (default: 2.5)"
    )
    parser.add_argument(
        "--target-resolution",
        type=int,
        default=720,
        help="Target frame resolution height (default: 720)"
    )
    parser.add_argument(
        "--ocr-languages",
        default="en,ja",
        help="Comma-separated EasyOCR language codes (default: en,ja)"
    )
    parser.add_argument(
        "--device",
        choices=["auto", "cpu", "cuda", "mps"],
        default="auto",
        help="Device selection (default: auto)"
    )
    parser.add_argument(
        "--no-progress",
        action="store_true",
        help="Disable progress logging"
    )
    parser.add_argument(
        "--whisper-model",
        type=str,
        default="medium",
        choices=["tiny", "base", "small", "medium", "large-v2", "large-v3"],
        help="Whisper model to use (default: medium)"
    )
    parser.add_argument(
        "--caption_context",
        help="Prompt information required for video frame analysis"
    )
    return parser.parse_args()


def resolve_output_path(video_path: Path, output_arg: str = None) -> Path:
    if output_arg:
        return Path(output_arg)
    return video_path.with_suffix(video_path.suffix + ".analysis.json")


def build_config(args: argparse.Namespace) -> tuple[AnalysisConfig, TranscriptionConfig]:
    return (
        build_analysis_config(
            sample_interval_seconds=args.sample_interval,
            target_resolution_height=args.target_resolution,
            ocr_languages=args.ocr_languages,
            caption_context=args.caption_context,
            device=args.device,
        ),
        build_transcription_config(model_name=args.whisper_model),
        build_data_normalization_config()
    )   

def build_job_id(video_path: Path) -> str:
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    hash_seed = f"{video_path.resolve()}|{timestamp}"
    digest = hashlib.sha1(hash_seed.encode("utf-8")).hexdigest()[:8]
    return f"{video_path.stem}-{timestamp}-{digest}"


async def run() -> int:
    args = parse_args()
    video_path = Path(args.video)
    if not video_path.exists():
        logger.error(f"Video not found: {video_path}")
        return 1

    analysis_output_path = resolve_output_path(video_path, args.output)
    data_normalization_output_path = video_path
    transcription_output = video_path.with_suffix(video_path.suffix + ".transcription.json")
    job_id = build_job_id(video_path)

    analysis_config, transcription_config, data_normalization_config = build_config(args)
    analysis_service = AnalysisService(analysis_config)
    data_normalization_service = DataNormalizationService(data_normalization_config)
    transcription_service = TranscriptionService(transcription_config)
    logger.info(f"[{job_id}] Device: {analysis_config.device} whisper: {transcription_config.model_name}")
    logger.info(f"[{job_id}] Starting analysis: {video_path}")

    def analysis_progress_callback(progress: float, elapsed: float, processed: float, total: float) -> None:
        if args.no_progress:
            return
        logger.info(
            f"[{job_id}] Progress: {progress:.1f}% ({int(processed)}/{int(total)} frames, {elapsed:.1f}s elapsed)"
        )
    
    def data_normalization_progress_callback(progress: float, elapsed: str) -> None:
        logger.info(
            f"[{job_id}] DataNormalization progress: {progress:.1f}% ({elapsed} elapsed)"
        )

    def transcription_progress_callback(progress: float, elapsed: str) -> None:
        if args.no_progress:
            return
        logger.info(
            f"[{job_id}] Transcription progress: {progress:.1f}% ({elapsed} elapsed)"
        )

    try:
        analysis_request = AnalysisRequest(
            video_path=str(video_path),
            job_id=job_id,
            json_file_path=str(analysis_output_path),
            settings={}
        )
        result = await analysis_service.process_async(analysis_request, analysis_progress_callback)
        if result.error:
            logger.error(f"Analysis failed: {result.error}")
            return 2

        analysis_service.save_result(result, str(analysis_output_path))
        logger.info(f"[{job_id}] Analysis complete. JSON saved to: {analysis_output_path}")

        transcription_request = TranscriptionRequest(
            video_path=str(video_path),
            job_id=job_id,
            json_file_path=str(transcription_output),
        )
        transcription_result = await transcription_service.process_async(
            transcription_request,
            transcription_progress_callback
        )
        transcription_service.save_result(transcription_result, str(transcription_output))
        logger.info(f"[{job_id}] Transcription complete. JSON saved to: {transcription_output}")

    
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
        data_normalization_service.save_result(data_normalization_result, str(data_normalization_output_path))
        logger.info(f"[{job_id}] DataNormalization complete")

        return 0

    except Exception as exc:
        logger.exception(f"Analysis crashed: {exc}")
        return 3

    finally:
        analysis_service.cleanup()
        transcription_service.cleanup()
        data_normalization_service.cleanup()


if __name__ == "__main__":
    raise SystemExit(asyncio.run(run()))
