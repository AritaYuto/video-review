"""Custom exception classes."""

class ServiceError(Exception):
    """Base exception for service errors."""
    pass


class VideoNotFoundError(ServiceError):
    """Video file not found."""
    pass


class AnalysisError(ServiceError):
    """Error during video analysis."""
    pass


class TranscriptionError(ServiceError):
    """Error during transcription."""
    pass


class ModelLoadError(ServiceError):
    """Error loading ML model."""
    pass

class DataNormalizationError(ServiceError):
    """Error during data normalization of analysis results."""
    pass
