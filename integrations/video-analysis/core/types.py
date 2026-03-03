"""Core type definitions and protocols."""
from typing import Protocol, TypedDict, Callable, Awaitable, Union, Dict, List, Optional, Any
from dataclasses import dataclass
from enum import Enum
import numpy as np

# JSON Types
JsonPrimitive = Union[str, int, float, bool, None]
JsonValue = Union[JsonPrimitive, Dict[str, 'JsonValue'], List['JsonValue']]
JsonDict = Dict[str, JsonValue]

class FrameAnalysis(TypedDict, total=False):
    """Frame analysis result structure."""
    start_time_ms: int
    end_time_ms: int
    duration_ms: int
    frame_idx: int
    scale_factor: float
    job_id: str
    
    objects: List[Dict[str, Any]]
    faces: List[Dict[str, Any]]
    detected_text: List[Dict[str, Any]]
    error_text: List[Dict[str, Any]]
    dummy_text: List[Dict[str, Any]]
    shot_type: str
    angle_type: str


# Service States
class ServiceStatus(Enum):
    """Service operational states."""
    LOADING = "loading"
    READY = "ready"
    PROCESSING = "processing"
    ERROR = "error"


@dataclass(frozen=True)
class JobRequest:
    """Base job request structure."""
    video_path: str
    job_id: str


@dataclass(frozen=True)
class AnalysisRequest(JobRequest):
    """Analysis job request."""
    settings: Dict[str, JsonValue]


@dataclass(frozen=True)
class TranscriptionRequest(JobRequest):
    """Transcription job request."""
    pass

@dataclass(frozen=True)
class DataNormalizationRequest(JobRequest):
    """Data normalization job request."""
    analysis_frames: List[FrameAnalysis]
    transcription_segments: Optional[List[Any]] = None
