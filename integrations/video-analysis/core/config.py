"""Configuration management."""
from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, Optional, List
import os
from dotenv import load_dotenv

load_dotenv()

def face_dir():
    dir = Path.home() / ".videoreview" / "face"
    if not dir.exists():
        dir.mkdir(parents=True, exist_ok=True)
    return dir


def model_dir():
    dir = Path.home() / ".videoreview" / "ml-models"
    if not dir.exists():
        dir.mkdir(parents=True, exist_ok=True)
    return dir


def whisper_dir():
    dir = model_dir() / "whisper"
    if not dir.exists():
        dir.mkdir(parents=True, exist_ok=True)
    return dir


def huggingface_dir():
    dir = model_dir() / "huggingface"
    if not dir.exists():
        dir.mkdir(parents=True, exist_ok=True)
    return dir

@dataclass
class AnalysisConfig:
    """Video analysis configuration."""
    caption_context: str = ""
    sample_interval_seconds: float = 2.5
    max_workers: int = 2
    enable_streaming: bool = True
    enable_aggressive_gc: bool = False
    frame_buffer_limit: int = 2
    memory_cleanup_interval: int = 50
    target_resolution_height: int = 720
    ocr_languages: List[str] = field(default_factory=lambda: [])
    subtitle_ratio: float = 0.33
    tilt_threshold: float = 5.0
    close_up_threshold: float = 0.3
    medium_shot_threshold: float = 0.1
    error_keywords: List[str] = field(default_factory=lambda: [])
    dummy_keywords: List[str] = field(default_factory=lambda: [])
    plugin_skip_interval: Dict[str, int] = field(default_factory=lambda: {
        'TextDetectionPlugin': 1,
        'ShotSemanticPlugin': 1,
    })
    force_device: Optional[str] = None

    def __post_init__(self) -> None:
        """Post-initialization adjustments."""
        self._adjust_for_memory()

    def _adjust_for_memory(self) -> None:
        """Auto-adjust settings based on available memory."""
        try:
            import psutil
            available_gb = psutil.virtual_memory().available / (1024**3)

            if available_gb < 8:
                self.frame_buffer_limit = 4
                self.target_resolution_height = 480
            elif available_gb < 16:
                self.target_resolution_height = 720
        except ImportError:
            pass

    @property
    def device(self) -> str:
        """Determine optimal processing device."""
        if self.force_device:
            return self.force_device
        try:
            import torch
            if torch.backends.mps.is_available():
                return 'mps'
            elif torch.cuda.is_available():
                return 'cuda'
        except ImportError:
            pass
        return 'cpu'


@dataclass
class TranscriptionConfig:
    """Transcription service configuration."""
    model_name: str = "large-v3"
    cache_dir: str = str(whisper_dir())
    beam_size: int = 5
    no_speech_threshold: float = 0.1
    vad_filter: bool = True
    vad_threshold: float = 0.5
    min_speech_duration_ms: int = 500
    min_silence_duration_ms: int = 2000
    voice_language: str = ""

    def __post_init__(self) -> None:
        """Post-initialization adjustments."""
        pass

    @property
    def device(self) -> str:
        """Determine optimal device for transcription."""
        try:
            import torch
            return "cuda" if torch.cuda.is_available() else "cpu"
        except ImportError:
            return "cpu"

    @property
    def compute_type(self) -> str:
        """Determine compute type based on device."""
        return "int8" if self.device == "cpu" else "int8_float16"

@dataclass
class DataNormalizationConfig:
    """DataNormalization service configuration."""

    def __post_init__(self) -> None:
        """Post-initialization adjustments."""
        pass

@dataclass
class ServerConfig:
    """WebSocket server configuration."""
    host: Optional[str] = None
    port: Optional[int] = None
    socket_path: Optional[str] = None
    max_concurrent_jobs: int = 2
    max_concurrent_analyses: int = 1
    max_concurrent_transcriptions: int = 1
    ping_interval: int = 30    
    ping_timeout: int = 60      
    close_timeout: int = 10   

    def __post_init__(self) -> None:
        """Validate and auto-calculate configuration."""
        if not self.socket_path and not (self.host and self.port):
            raise ValueError(
                "Either socket_path or (host and port) must be provided")
        self.max_concurrent_analyses = os.getenv(
            'MAX_CONCURRENT_ANALYSES', 1)
        self.max_concurrent_transcriptions = os.getenv(
                'MAX_CONCURRENT_TRANSCRIPTIONS', 1)
                
