"""Data normalization result structures."""
from dataclasses import dataclass
from typing import Dict, Any

from plugins.data_normalization.base import EventContents


@dataclass
class DataNormalizationResult:
    """Complete data normalization result."""
    id: str
    data: Dict[str, EventContents]
    
