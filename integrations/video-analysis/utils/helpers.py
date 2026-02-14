"""Utility helper functions."""
import os
from pathlib import Path
from typing import Union, Optional, List
from collections.abc import Iterable
from core.config import AnalysisConfig, DataNormalizationConfig, TranscriptionConfig


def format_duration(seconds: float) -> str:
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)

    if hours > 0:
        return f"{hours:02d}:{minutes:02d}:{secs:02d}"
    return f"{minutes:02d}:{secs:02d}"


def ensure_directory(path: Union[str, Path]) -> Path:
    dir_path = Path(path)
    dir_path.mkdir(parents=True, exist_ok=True)
    return dir_path


def env(name: str, default: str = None) -> str:
    r = os.getenv(name,  default=default)
    print(f"Env: {name}={r}")
    return os.getenv(name,  default=default)


def env_float(name: str | None, default: float) -> float:
    value = env(name)
    return float(value) if value else default


def env_int(name: str | None, default: int) -> int:
    value = env(name)
    return int(value) if value else default


def env_bool(name: str | None, default: bool) -> bool:
    value = env(name)
    if value is None:
        return default
    return value.strip().lower() == "true"


def build_analysis_config(
    sample_interval_seconds: float,
    target_resolution_height: int,
    ocr_languages: Union[str, Iterable[str], None],
    caption_context: str,
    device: Optional[str],
) -> AnalysisConfig:
    def __normalize_ocr_languages__(value: Union[str, Iterable[str], None]) -> List[str]:
        if isinstance(value, str):
            return [lang.strip() for lang in value.split(",") if lang.strip()]
        return [str(lang).strip() for lang in value if str(lang).strip()]

    config = AnalysisConfig(
        sample_interval_seconds=sample_interval_seconds,
        target_resolution_height=target_resolution_height,
        caption_context=caption_context
    )
    config.ocr_languages = __normalize_ocr_languages__(ocr_languages)
    if device and device != "auto":
        config.force_device = device
    return config


def build_transcription_config(
    model_name: str,
) -> TranscriptionConfig:
    return TranscriptionConfig(
        model_name=model_name,
    )


def build_data_normalization_config() -> DataNormalizationConfig:
    return DataNormalizationConfig()

