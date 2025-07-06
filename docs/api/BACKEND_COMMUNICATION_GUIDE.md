# VaultPilot Backend Communication Guide

## 📋 Overview

This comprehensive guide details the complete communication protocol between VaultPilot (Obsidian plugin) and the EvoAgentX backend. This document is essential for backend developers implementing VaultPilot integration.

## 🔗 Communication Architecture

```
┌─────────────────────┐    REST API     ┌──────────────────────┐
│  VaultPilot Plugin  │◄──────────────►│  EvoAgentX Backend   │
│   (Obsidian)        │                 │    (FastAPI)         │
│                     │   WebSocket     │                      │
│                     │◄──────────────►│                      │
└─────────────────────┘                 └──────────────────────┘
```

## 📡 Core Communication Protocols

### HTTP Headers (All Requests)
```http
Content-Type: application/json
Accept: application/json
User-Agent: VaultPilot/2.0.0 Obsidian-Plugin
X-Client-Version: 2.0.0
X-API-Key: [optional-api-key]
```

### Response Format (Standard)
```json
{
  "success": true,
  "data": { /* response data */ },
  "error": null,
  "message": "Operation completed successfully",
  "timestamp": "2025-07-05T10:30:00Z",
  "request_id": "uuid-string"
}
```

## 🛠️ REST API Endpoints

### Core System Endpoints

#### GET `/api/obsidian/health`
**Purpose**: System health check and capability discovery
**Request**: No body required
**Response**:
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "version": "2.0.0",
    "timestamp": "2025-07-05T10:30:00Z",
    "capabilities": {
      "chat": true,
      "copilot": true,
      "workflows": true,
      "agents": true,
      "evolution": true,
      "marketplace": true,
      "multimodal": true,
      "websocket": true
    },
    "limits": {
      "max_chat_history": 1000,
      "max_file_size": "10MB",
      "rate_limit": "100/minute"
    }
  }
}
```

#### GET `/api/obsidian/status`
**Purpose**: Detailed system status
**Response**:
```json
{
  "success": true,
  "data": {
    "server_status": "online",
    "active_connections": 42,
    "agent_count": 15,
    "evolution_engine": "active",
    "marketplace": "connected",
    "multimodal_engine": "ready",
    "performance": {
      "avg_response_time": "120ms",
      "requests_per_second": 85,
      "memory_usage": "2.4GB"
    }
  }
}
```

### Chat & Conversation Endpoints

#### POST `/api/obsidian/chat`
**Purpose**: Main chat conversation endpoint
**Request**:
```json
{
  "message": "Analyze my project notes and create a timeline",
  "conversation_id": "optional-uuid",
  "vault_context": {
    "current_file": {
      "path": "Projects/AI Research.md",
      "content": "# AI Research Project...",
      "metadata": {
        "created": "2025-01-01T00:00:00Z",
        "modified": "2025-07-05T10:00:00Z",
        "tags": ["research", "ai", "project"]
      }
    },
    "selected_text": "Important section of text",
    "vault_summary": {
      "total_files": 1247,
      "recent_files": ["file1.md", "file2.md"],
      "related_tags": ["ai", "research", "machine-learning"]
    }
  },
  "agent_id": "project_manager",
  "mode": "agent",
  "preferences": {
    "response_length": "detailed",
    "include_citations": true,
    "formatting": "markdown"
  },
  "evolution_feedback": {
    "session_satisfaction": 0.9,
    "response_quality": 0.85,
    "task_relevance": 0.95
  }
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "response": "Based on your project notes, here's a comprehensive timeline:\n\n## Phase 1: Research Foundation...",
    "conversation_id": "uuid-string",
    "agent_info": {
      "id": "project_manager",
      "name": "Project Manager Assistant",
      "confidence": 0.92,
      "evolution_level": 3
    },
    "context_used": {
      "files_analyzed": 5,
      "total_tokens": 2847,
      "relevance_score": 0.89
    },
    "suggestions": [
      "Create detailed milestone tracking",
      "Set up team collaboration framework",
      "Establish risk mitigation strategies"
    ],
    "artifacts": [
      {
        "type": "timeline",
        "title": "Project Timeline",
        "content": "...",
        "save_to": "Projects/AI Research Timeline.md"
      }
    ]
  }
}
```

#### POST `/api/obsidian/conversation/history`
**Purpose**: Retrieve conversation history
**Request**:
```json
{
  "conversation_id": "uuid-string",
  "limit": 50,
  "offset": 0,
  "include_context": true
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "messages": [
      {
        "id": "msg-uuid",
        "role": "user",
        "content": "Previous message",
        "timestamp": "2025-07-05T10:00:00Z",
        "context": { /* vault context at time of message */ }
      },
      {
        "id": "msg-uuid-2",
        "role": "assistant",
        "content": "Previous response",
        "timestamp": "2025-07-05T10:01:00Z",
        "agent_id": "project_manager",
        "artifacts": [ /* generated artifacts */ ]
      }
    ],
    "total_count": 47,
    "conversation_metadata": {
      "created": "2025-07-01T00:00:00Z",
      "last_activity": "2025-07-05T10:01:00Z",
      "primary_agent": "project_manager",
      "topics": ["project-management", "ai-research"]
    }
  }
}
```

### AI Copilot Endpoints

#### POST `/api/obsidian/copilot/complete`
**Purpose**: Intelligent text completion
**Request**:
```json
{
  "context": {
    "content_before_cursor": "# Project Overview\n\nThis project aims to",
    "content_after_cursor": "\n\n## Timeline\n...",
    "file_path": "Projects/AI Research.md",
    "cursor_position": {
      "line": 3,
      "character": 26
    },
    "file_type": "markdown"
  },
  "preferences": {
    "completion_length": "medium",
    "tone": "professional",
    "style": "academic",
    "include_citations": false
  },
  "vault_context": {
    "related_files": ["Research Methods.md", "Literature Review.md"],
    "common_patterns": ["project structure", "research methodology"],
    "user_writing_style": {
      "formality": 0.8,
      "technical_level": 0.9,
      "verbosity": 0.7
    }
  }
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "completions": [
      {
        "text": " develop advanced machine learning algorithms for natural language processing, with a focus on improving contextual understanding and response generation.",
        "confidence": 0.94,
        "type": "continuation",
        "reasoning": "Contextually appropriate completion based on document structure and research theme"
      },
      {
        "text": " create an innovative AI system that enhances knowledge management workflows through intelligent automation and user-centric design.",
        "confidence": 0.87,
        "type": "alternative",
        "reasoning": "Alternative completion emphasizing practical applications"
      }
    ],
    "suggestions": [
      "Consider adding methodology section",
      "Include timeline and milestones",
      "Define success metrics"
    ],
    "metadata": {
      "processing_time": "45ms",
      "tokens_analyzed": 156,
      "style_match": 0.91
    }
  }
}
```

### Agent Management Endpoints

#### GET `/api/obsidian/agents`
**Purpose**: List available agents and their capabilities
**Response**:
```json
{
  "success": true,
  "data": {
    "agents": [
      {
        "id": "research_analyst",
        "name": "Research Analyst",
        "description": "Specialized in academic research and analysis",
        "category": "research",
        "capabilities": [
          "literature_review",
          "data_analysis",
          "citation_management",
          "research_synthesis"
        ],
        "evolution_level": 5,
        "performance_metrics": {
          "user_satisfaction": 0.92,
          "task_completion": 0.89,
          "response_quality": 0.94
        },
        "specializations": ["academic", "scientific", "technical"],
        "status": "active"
      }
    ],
    "categories": ["research", "writing", "project_management", "creative"],
    "total_count": 15,
    "marketplace_available": 847
  }
}
```

#### POST `/api/obsidian/agents/create`
**Purpose**: Create custom agent
**Request**:
```json
{
  "name": "Custom Research Assistant",
  "description": "Specialized assistant for my research domain",
  "category": "research",
  "base_agent": "research_analyst",
  "customizations": {
    "system_prompt": "You are a specialized research assistant focused on...",
    "personality": {
      "formality": 0.8,
      "creativity": 0.6,
      "detail_level": 0.9
    },
    "capabilities": ["domain_analysis", "methodology_review"],
    "knowledge_domains": ["machine_learning", "nlp", "cognitive_science"]
  },
  "evolution_config": {
    "learning_rate": 0.1,
    "adaptation_speed": "medium",
    "feedback_sensitivity": 0.8
  }
}
```

### Workflow Execution Endpoints

#### POST `/api/obsidian/workflow`
**Purpose**: Execute complex multi-step workflows
**Request**:
```json
{
  "goal": "Create a comprehensive study plan for machine learning with timeline and resources",
  "template_id": "study_plan_template",
  "context": {
    "vault_content": true,
    "current_file": {
      "path": "Learning/ML Goals.md",
      "content": "I want to learn ML in 3 months..."
    },
    "user_preferences": {
      "learning_style": "hands-on",
      "time_availability": "2 hours/day",
      "experience_level": "intermediate",
      "preferred_resources": ["books", "online_courses", "projects"]
    }
  },
  "execution_options": {
    "include_multimodal": true,
    "generate_artifacts": true,
    "calendar_integration": true,
    "progress_tracking": true
  },
  "constraints": {
    "timeline_weeks": 12,
    "budget_limit": 500,
    "prerequisites": ["basic_python", "statistics"]
  }
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "workflow_id": "workflow-uuid",
    "status": "completed",
    "execution_time": "2.3s",
    "steps_completed": 8,
    "artifacts": [
      {
        "type": "study_plan",
        "title": "12-Week Machine Learning Study Plan",
        "content": "# Week 1: Foundations...",
        "file_path": "Learning/ML Study Plan.md",
        "metadata": {
          "total_hours": 144,
          "milestones": 12,
          "resources": 23
        }
      },
      {
        "type": "calendar_events",
        "title": "Study Schedule",
        "events": [
          {
            "title": "ML Foundation Study",
            "start": "2025-07-07T19:00:00Z",
            "duration": "2h",
            "type": "study_session"
          }
        ]
      }
    ],
    "recommendations": [
      "Start with linear algebra refresher",
      "Consider joining online ML community",
      "Set up development environment early"
    ],
    "next_steps": [
      "Review and approve calendar events",
      "Purchase recommended resources",
      "Set up progress tracking system"
    ]
  }
}
```

### Vault Analysis Endpoints

#### POST `/api/obsidian/vault/context`
**Purpose**: Comprehensive vault analysis
**Request**:
```json
{
  "analysis_type": "comprehensive",
  "scope": {
    "include_files": "all",
    "file_types": ["md", "pdf", "txt"],
    "date_range": {
      "start": "2025-01-01",
      "end": "2025-07-05"
    },
    "tags_filter": ["research", "project"]
  },
  "analysis_options": {
    "relationship_analysis": true,
    "content_clustering": true,
    "knowledge_gaps": true,
    "optimization_suggestions": true,
    "multimodal_analysis": true
  }
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "vault_statistics": {
      "total_files": 1247,
      "total_words": 892456,
      "avg_file_size": "2.1KB",
      "most_active_period": "2025-06",
      "growth_trend": "increasing"
    },
    "content_analysis": {
      "primary_topics": [
        {"topic": "machine_learning", "weight": 0.34, "files": 156},
        {"topic": "research_methods", "weight": 0.28, "files": 98},
        {"topic": "project_management", "weight": 0.22, "files": 87}
      ],
      "writing_patterns": {
        "avg_sentences_per_paragraph": 3.2,
        "readability_score": 12.8,
        "technical_density": 0.76
      }
    },
    "relationships": {
      "strong_connections": [
        {
          "file1": "ML Concepts.md",
          "file2": "Deep Learning.md",
          "strength": 0.92,
          "type": "conceptual"
        }
      ],
      "orphaned_files": ["Old Notes.md", "Temporary.md"],
      "hub_files": ["Index.md", "Main Research.md"]
    },
    "knowledge_gaps": [
      {
        "area": "evaluation_metrics",
        "confidence": 0.85,
        "suggested_content": "Model evaluation and performance metrics",
        "related_files": ["ML Models.md", "Testing.md"]
      }
    ],
    "optimization_suggestions": [
      {
        "type": "structure",
        "suggestion": "Consider creating topic-based folder structure",
        "impact": "high",
        "effort": "medium"
      }
    ]
  }
}
```

## 🔄 WebSocket Communication

### Connection Endpoint
```
WS /ws/obsidian?client_id=uuid&version=2.0.0
```

### Message Format
```json
{
  "type": "message_type",
  "id": "message-uuid",
  "timestamp": "2025-07-05T10:30:00Z",
  "data": { /* message-specific data */ }
}
```

### Message Types

#### Chat Streaming
```json
{
  "type": "chat_stream",
  "id": "msg-uuid",
  "data": {
    "conversation_id": "conv-uuid",
    "chunk": "partial response text",
    "is_complete": false,
    "agent_id": "research_analyst",
    "metadata": {
      "tokens_streamed": 45,
      "confidence": 0.92
    }
  }
}
```

#### Workflow Progress
```json
{
  "type": "workflow_progress",
  "id": "workflow-uuid",
  "data": {
    "step": 3,
    "total_steps": 8,
    "current_operation": "Analyzing vault content",
    "progress_percentage": 37.5,
    "estimated_remaining": "45s",
    "artifacts_generated": 1
  }
}
```

#### Agent Evolution Notifications
```json
{
  "type": "agent_evolution",
  "data": {
    "agent_id": "research_analyst",
    "evolution_type": "performance_improvement",
    "metrics": {
      "previous_score": 0.87,
      "new_score": 0.92,
      "improvement": 0.05
    },
    "changes": ["enhanced reasoning", "better context understanding"]
  }
}
```

## 🧬 Advanced Features (v2.0+)

### Agent Evolution Endpoints

#### POST `/api/obsidian/agents/evolve`
**Purpose**: Evolve agent based on feedback
**Request**:
```json
{
  "agent_id": "research_analyst",
  "feedback": {
    "user_satisfaction": 0.95,
    "response_quality": 0.88,
    "task_completion": 0.92,
    "context_relevance": 0.90,
    "creativity": 0.75,
    "accuracy": 0.94
  },
  "interaction_data": {
    "session_length": 1800,
    "commands_used": ["complete", "analyze", "suggest"],
    "user_corrections": 2,
    "successful_tasks": 8,
    "context_switches": 3
  },
  "evolution_parameters": {
    "learning_rate": 0.1,
    "mutation_strength": 0.05,
    "selection_pressure": 0.8
  }
}
```

#### POST `/api/obsidian/agents/breed`
**Purpose**: Create specialized agent by breeding
**Request**:
```json
{
  "parent_agents": ["research_analyst", "writing_assistant"],
  "specialization_goal": "Academic research writing assistant",
  "target_capabilities": [
    "academic_writing",
    "citation_management", 
    "research_synthesis",
    "peer_review"
  ],
  "breeding_parameters": {
    "crossover_rate": 0.7,
    "mutation_rate": 0.1,
    "generations": 5
  }
}
```

### Marketplace Endpoints

#### GET `/api/obsidian/marketplace/discover`
**Purpose**: Discover agents in marketplace
**Query Parameters**:
- `category`: Agent category filter
- `search`: Search query
- `min_rating`: Minimum rating filter
- `free_only`: Show only free agents
- `sort_by`: Sort criteria (rating, downloads, recent)
- `limit`: Results limit
- `offset`: Pagination offset

**Response**:
```json
{
  "success": true,
  "data": {
    "agents": [
      {
        "id": "premium_research_agent",
        "name": "Premium Research Assistant",
        "description": "Advanced research capabilities with citation management",
        "category": "research",
        "rating": 4.8,
        "downloads": 15420,
        "price": "free",
        "author": "ResearchLab",
        "capabilities": ["advanced_analysis", "auto_citations"],
        "compatibility": "2.0.0+",
        "preview_available": true
      }
    ],
    "total_count": 847,
    "categories": ["research", "writing", "project_management"],
    "featured": ["premium_research_agent", "creative_writer"]
  }
}
```

#### POST `/api/obsidian/marketplace/install`
**Purpose**: Install agent from marketplace
**Request**:
```json
{
  "agent_id": "premium_research_agent",
  "customizations": {
    "name": "My Research Assistant",
    "personality": {
      "formality": 0.9,
      "detail_level": 0.8,
      "creativity": 0.4
    },
    "specializations": ["computer_science", "ai_research"],
    "integration_preferences": {
      "auto_citations": true,
      "format_references": "APA",
      "suggest_related_papers": true
    }
  },
  "user_profile": {
    "research_areas": ["machine_learning", "nlp"],
    "experience_level": "advanced",
    "institution": "university"
  }
}
```

### Multi-Modal Intelligence Endpoints

#### POST `/api/obsidian/multimodal/analyze`
**Purpose**: Analyze multi-modal content
**Request**:
```json
{
  "assets": [
    {
      "type": "text",
      "content": "Research paper content...",
      "metadata": {"format": "markdown", "source": "Research.md"}
    },
    {
      "type": "image", 
      "path": "diagrams/architecture.png",
      "metadata": {"format": "png", "size": "1.2MB"}
    },
    {
      "type": "audio",
      "path": "interviews/expert_interview.mp3",
      "metadata": {"duration": "45min", "format": "mp3"}
    }
  ],
  "analysis_options": {
    "extract_text": true,
    "identify_objects": true,
    "transcribe_audio": true,
    "find_relationships": true,
    "generate_summaries": true
  },
  "output_preferences": {
    "include_thumbnails": true,
    "confidence_threshold": 0.8,
    "max_summary_length": 500
  }
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "analysis_id": "analysis-uuid",
    "results": [
      {
        "asset_id": "text-1",
        "type": "text",
        "extracted_content": {
          "entities": ["neural networks", "deep learning"],
          "topics": ["machine learning", "AI research"],
          "sentiment": "neutral",
          "key_points": ["CNN architecture", "training methods"]
        }
      },
      {
        "asset_id": "image-1", 
        "type": "image",
        "extracted_content": {
          "objects": ["diagram", "flowchart", "text_boxes"],
          "text": "Input Layer → Hidden Layers → Output Layer",
          "concepts": ["neural network architecture"],
          "confidence": 0.94
        }
      }
    ],
    "cross_modal_insights": [
      {
        "relationship": "The diagram in architecture.png illustrates the neural network concepts discussed in the research paper",
        "confidence": 0.89,
        "type": "illustration"
      }
    ],
    "summary": "Multi-modal analysis reveals a comprehensive research document about neural networks, supported by architectural diagrams and expert interview insights."
  }
}
```

## 🔐 Authentication & Security

### API Key Authentication
```http
X-API-Key: your-api-key-here
```

### Rate Limiting
- Standard: 100 requests/minute
- Burst: 200 requests/minute
- Premium: 500 requests/minute

### Security Headers
```http
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000
```

## 📊 Performance Metrics

### Response Time Targets
- Health checks: < 50ms
- Chat responses: < 500ms
- Copilot completions: < 200ms
- Workflow execution: < 5s (simple), < 30s (complex)
- Vault analysis: < 10s (quick), < 60s (comprehensive)

### WebSocket Performance
- Connection establishment: < 100ms
- Message latency: < 50ms
- Heartbeat interval: 30s
- Reconnection delay: exponential backoff (1s, 2s, 4s, 8s, max 30s)

## 🚨 Error Handling

### Error Response Format
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request parameters",
    "details": {
      "field": "agent_id",
      "issue": "Agent not found"
    },
    "retry_after": 0,
    "documentation_url": "https://docs.vaultpilot.ai/errors/validation"
  },
  "request_id": "uuid-string"
}
```

### Common Error Codes
- `VALIDATION_ERROR`: Request validation failed
- `AUTHENTICATION_ERROR`: Authentication required or failed
- `RATE_LIMITED`: Too many requests
- `AGENT_NOT_FOUND`: Requested agent doesn't exist
- `INTERNAL_ERROR`: Server-side error
- `SERVICE_UNAVAILABLE`: Temporary service unavailability

## 📝 Implementation Checklist

### Required Endpoints
- [ ] `GET /api/obsidian/health`
- [ ] `POST /api/obsidian/chat`
- [ ] `POST /api/obsidian/copilot/complete`
- [ ] `POST /api/obsidian/workflow`
- [ ] `GET /api/obsidian/agents`
- [ ] `POST /api/obsidian/vault/context`

### Optional Advanced Endpoints
- [ ] Agent evolution endpoints
- [ ] Marketplace integration
- [ ] Multi-modal analysis
- [ ] Calendar integration
- [ ] Performance monitoring

### WebSocket Support
- [ ] Connection handling at `/ws/obsidian`
- [ ] Message type routing
- [ ] Real-time streaming support
- [ ] Connection state management

### Quality Requirements
- [ ] Response time within targets
- [ ] Proper error handling
- [ ] Rate limiting implementation
- [ ] Security headers and authentication
- [ ] Comprehensive logging

---

This communication guide provides the complete specification for implementing VaultPilot backend integration. For implementation examples and code templates, refer to the `/evoagentx_integration/` package included in the repository.
