# Linear Integration Setup

This document explains how to set up Linear integration for the support dialog using the official Linear SDK.

## Dependencies

The integration uses the official Linear SDK:
```bash
bun add @linear/sdk
```

## Required Environment Variables

Add these to your `.env.local` file:

```bash
# Linear (for support tickets)
LINEAR_API_KEY="your-linear-api-key-here"
LINEAR_TEAM_ID="your-linear-team-id-here"
```

## Getting Linear API Key

1. Go to Linear's settings → API
2. Create a new API key with the following permissions:
   - `read` - to read team information
   - `write` - to create issues

## Getting Team ID

⚠️ **Important**: You need the team UUID (not the team key/identifier).

You can find your team UUID by:

1. Using the Linear MCP tools (if available):
   ```bash
   # List teams to find the full UUID
   mcp__linear-server__list_teams
   ```
   Example output:
   ```json
   [{"id":"50742f72-d16f-4731-8138-bea9cf3e51fd","name":"ConvertIQ"}]
   ```

2. Using the Linear GraphQL API:
   ```graphql
   query {
     teams {
       nodes {
         id
         name
         key
       }
     }
   }
   ```

**Note**: Do not use the team key (e.g., "CON") - you must use the full UUID format like `50742f72-d16f-4731-8138-bea9cf3e51fd`

## Implementation Details

The implementation uses the Linear SDK's `LinearClient` class:

```typescript
import { LinearClient } from '@linear/sdk'

const linearClient = new LinearClient({
  apiKey: process.env.LINEAR_API_KEY
})

const issuePayload = await linearClient.createIssue({
  title: `Support: ${subject}`,
  description: `...`,
  teamId: process.env.LINEAR_TEAM_ID,
  labelIds: ['99d221e1-6d69-46c9-8a71-fcf64153bd59'],
  priority: 2,
})
```

## Current Configuration

The support dialog will:
- Create issues in the specified Linear team using the SDK
- Apply the "Bug" label (ID: `99d221e1-6d69-46c9-8a71-fcf64153bd59`)
- Set priority to "High" (priority: 2)
- Include user details in the issue description
- Provide proper error handling and validation

## Usage

Users can access the support dialog by clicking "Support" in the sidebar. The dialog will:
1. Collect user information (name, email, subject, description)
2. Create a Linear issue with the provided information using the SDK
3. Show success/error feedback to the user

## Benefits of Using the SDK

- Type-safe operations
- Automatic error handling
- Built-in GraphQL optimizations
- Consistent API interface
- Better TypeScript integration