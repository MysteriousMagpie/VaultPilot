# VaultPilot API Integration Package

A complete, backend-agnostic integration package for implementing VaultPilot API endpoints.

## Overview

This package provides a standardized way to implement VaultPilot functionality in any backend system (EvoAgentX, custom FastAPI, Express.js, etc.).

## Features

- ✅ **Standardized API Definitions** - OpenAPI/Swagger compatible
- ✅ **Type-Safe Models** - TypeScript and Python data models
- ✅ **Backend Adapters** - Easy integration with different backend systems
- ✅ **Real-time Support** - WebSocket handlers for live updates
- ✅ **Vault Analysis** - Comprehensive vault content analysis
- ✅ **Workflow Management** - Advanced workflow processing
- ✅ **Analytics Dashboard** - Rich analytics and metrics
- ✅ **Chat Interface** - AI-powered chat functionality

## Package Structure

```
vaultpilot-api-integration/
├── README.md
├── package.json
├── tsconfig.json
├── src/
│   ├── types/           # TypeScript type definitions
│   ├── models/          # Data models (TS + Python)
│   ├── api/             # API endpoint definitions
│   ├── adapters/        # Backend adapters
│   ├── services/        # Core business logic
│   └── utils/           # Utility functions
├── python/              # Python implementations
│   ├── __init__.py
│   ├── models.py
│   ├── api.py
│   └── adapters/
└── examples/            # Implementation examples
    ├── fastapi/
    ├── express/
    └── evoagentx/
```

## Quick Start

### For Python/FastAPI backends:
```python
from vaultpilot_api_integration import VaultPilotAPI, FastAPIAdapter

app = FastAPI()
vaultpilot = VaultPilotAPI(adapter=FastAPIAdapter())
vaultpilot.setup_routes(app)
```

### For Node.js/Express backends:
```typescript
import { VaultPilotAPI, ExpressAdapter } from './vaultpilot-api-integration';

const app = express();
const vaultpilot = new VaultPilotAPI(new ExpressAdapter());
vaultpilot.setupRoutes(app);
```

## Integration with EvoAgentX

This package is designed to be easily integrated into EvoAgentX or any other AI backend system, providing a consistent API interface for VaultPilot clients.
