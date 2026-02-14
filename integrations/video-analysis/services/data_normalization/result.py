"""Data normalization result structures."""
from dataclasses import dataclass
from typing import Dict, Any


@dataclass
class DataNormalizationResult:
    """Complete data normalization result."""
    id: str
    result: Dict[str, Any]
    
    def to_dict(self) -> Dict:
        """Convert to JSON-serializable dictionary."""
        return self.result
    
