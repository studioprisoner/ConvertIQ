# Authentication Debug Guide

## Issue
Users get logged out when navigating to another page after login in development server.

## Debugging Steps

### 1. Check Environment Variables
Verify these are set correctly in your `.env.local`:

```bash
# These should match exactly
NEXT_PUBLIC_URL=http://localhost:3000
BETTER_AUTH_URL=http://localhost:3000

# Must be at least 32 characters
BETTER_AUTH_SECRET=your-secret-here
```

### 2. Check Browser Developer Tools

#### Cookies Tab:
- Look for `better-auth.session_token` cookie
- Verify domain is `localhost` (not `127.0.0.1`)
- Check if cookie persists between page navigations

#### Network Tab:
- Monitor `/api/auth/session` requests
- Check if they return 401/403 errors
- Look for CORS errors in console

#### Console:
- Look for Better Auth errors
- Check for session validation warnings

### 3. Test Session Persistence

Add this debug component to test session state:

```typescript
// src/components/debug-session.tsx
"use client"
import { useSession } from "@/lib/auth-client"

export function DebugSession() {
  const { data: session, isPending, error } = useSession()
  
  return (
    <div style={{ position: 'fixed', top: 0, right: 0, background: 'white', padding: '10px', border: '1px solid black', zIndex: 9999 }}>
      <strong>Session Debug:</strong><br/>
      Pending: {isPending ? 'Yes' : 'No'}<br/>
      Session: {session ? 'Yes' : 'No'}<br/>
      User: {session?.user?.email || 'None'}<br/>
      Error: {error ? 'Yes' : 'No'}
    </div>
  )
}
```

### 4. Common Fixes

#### Fix 1: Environment Variables
Make sure both URLs match:
```env
NEXT_PUBLIC_URL=http://localhost:3000
BETTER_AUTH_URL=http://localhost:3000
```

#### Fix 2: Clear Browser Data
- Clear cookies for localhost
- Clear localStorage
- Hard refresh (Cmd+Shift+R)

#### Fix 3: Check Port Consistency
Ensure you're always using the same port (3000) for development.

#### Fix 4: Add Session Debug Logging
Add to your auth client:

```typescript
export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_URL || "http://localhost:3000",
  plugins: [emailOTPClient()],
  fetchOptions: {
    credentials: 'include',
  },
  // Add debug logging
  onError: (error) => {
    console.error('🚨 Auth Client Error:', error)
  },
})
```

## Next Steps
1. Check environment variables
2. Add debug session component
3. Monitor browser dev tools
4. Test with incognito window
5. Check server logs for Better Auth errors