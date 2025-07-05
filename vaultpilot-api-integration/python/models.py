"""
VaultPilot Python Data Models

Pydantic models for VaultPilot API data structures
"""

from pydantic import BaseModel
from typing import List, Optional, Dict, Any, Union
from datetime import datetime
from enum import Enum

# === Base Models ===

class APIResponse(BaseModel):
    success: bool
    data: Optional[Any] = None
    error: Optional[str] = None
    timestamp: str = datetime.now().isoformat()

# === Vault Models ===

class VaultInfo(BaseModel):
    id: str
    name: str
    path: str
    totalFiles: int
    markdownFiles: int
    folders: int
    lastModified: str
    size: int

class VaultFile(BaseModel):
    id: str
    path: str
    name: str
    type: str  # 'markdown' | 'image' | 'pdf' | 'other'
    size: int
    created: str
    modified: str
    tags: Optional[List[str]] = None
    links: Optional[List[str]] = None

class VaultAnalysisResults(BaseModel):
    fileCount: int
    wordCount: int
    linkCount: int
    tagCount: int
    themes: List[str]
    suggestions: List[str]
    healthScore: int

class VaultAnalysis(BaseModel):
    id: str
    vaultId: str
    status: str  # 'pending' | 'processing' | 'completed' | 'failed'
    progress: int
    startTime: str
    endTime: Optional[str] = None
    results: Optional[VaultAnalysisResults] = None

class VaultAnalysisRequest(BaseModel):
    vaultId: str
    options: Optional[Dict[str, Any]] = None

# === Chat Models ===

class ChatMessage(BaseModel):
    id: str
    role: str  # 'user' | 'assistant' | 'system'
    content: str
    timestamp: str
    metadata: Optional[Dict[str, Any]] = None

class ChatConversation(BaseModel):
    id: str
    vaultId: str
    title: str
    messages: List[ChatMessage]
    created: str
    updated: str
    status: str  # 'active' | 'archived'

class ChatRequest(BaseModel):
    message: str
    conversationId: Optional[str] = None
    vaultId: str
    context: Optional[Dict[str, Any]] = None

# === Workflow Models ===

class WorkflowStep(BaseModel):
    id: str
    name: str
    description: str
    status: str  # 'pending' | 'running' | 'completed' | 'failed'
    progress: int
    startTime: Optional[str] = None
    endTime: Optional[str] = None
    result: Optional[Any] = None
    error: Optional[str] = None

class Workflow(BaseModel):
    id: str
    name: str
    description: str
    type: str  # 'analysis' | 'summary' | 'custom'
    status: str  # 'pending' | 'running' | 'completed' | 'failed'
    steps: List[WorkflowStep]
    created: str
    updated: str
    vaultId: str
    config: Optional[Dict[str, Any]] = None

class WorkflowTemplate(BaseModel):
    id: str
    name: str
    description: str
    type: str
    steps: List[Dict[str, Any]]
    defaultConfig: Optional[Dict[str, Any]] = None

class WorkflowRequest(BaseModel):
    templateId: Optional[str] = None
    name: str
    type: str
    vaultId: str
    config: Optional[Dict[str, Any]] = None

# === Agent Models ===

class Agent(BaseModel):
    id: str
    name: str
    type: str
    status: str  # 'active' | 'inactive' | 'error'
    capabilities: List[str]
    lastActivity: Optional[str] = None
    config: Optional[Dict[str, Any]] = None

class AgentStatus(BaseModel):
    totalAgents: int
    activeAgents: int
    agents: List[Agent]

# === Analytics Models ===

class AnalyticsMetric(BaseModel):
    name: str
    value: Union[int, float]
    unit: Optional[str] = None
    trend: Optional[str] = None  # 'up' | 'down' | 'stable'
    change: Optional[Union[int, float]] = None

class ChartDataPoint(BaseModel):
    date: Optional[str] = None
    category: Optional[str] = None
    file: Optional[str] = None
    value: Optional[Union[int, float]] = None
    count: Optional[int] = None
    views: Optional[int] = None

class AnalyticsDashboard(BaseModel):
    vaultId: str
    updated: str
    metrics: Dict[str, List[AnalyticsMetric]]
    charts: Dict[str, List[ChartDataPoint]]

# === Request Models ===

class SummaryRequest(BaseModel):
    vaultId: str
    options: Optional[Dict[str, Any]] = None

# === WebSocket Models ===

class WebSocketMessage(BaseModel):
    type: str
    data: Any
    timestamp: str = datetime.now().isoformat()

class ConnectionStatus(BaseModel):
    backend: str  # 'connected' | 'disconnected' | 'error'
    websocket: str  # 'connected' | 'disconnected' | 'error'
    lastPing: Optional[str] = None
