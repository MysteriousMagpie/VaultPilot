"""
VaultPilot API Integration - Python Package

Complete Python implementation of VaultPilot API endpoints
"""

from .models import *
from .fastapi_adapter import VaultPilotFastAPIAdapter, setup_vaultpilot_api

__version__ = "1.0.0"
__all__ = [
    "VaultPilotFastAPIAdapter",
    "setup_vaultpilot_api",
    "APIResponse",
    "VaultAnalysisRequest",
    "ChatRequest",
    "WorkflowRequest",
    "SummaryRequest"
]
