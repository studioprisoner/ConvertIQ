import { NextRequest, NextResponse } from 'next/server'
import { LinearClient } from '@linear/sdk'
import { z } from 'zod'
import { auth } from '@/lib/auth'

const supportRequestSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100),
  email: z.string().trim().email('A valid email is required').max(254),
  subject: z.string().trim().min(1, 'Subject is required').max(200),
  description: z.string().trim().min(1, 'Description is required').max(5000),
})

export async function POST(request: NextRequest) {
  try {
    // Require an authenticated session — the support dialog runs in the
    // authenticated dashboard, so this breaks no legitimate flow while
    // preventing anonymous ticket spam.
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Validate + bound the input (caps prevent megabyte-sized ticket bodies)
    const parsed = supportRequestSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid input' },
        { status: 400 }
      )
    }
    const { name, email, subject, description } = parsed.data

    // Validate environment variables
    if (!process.env.LINEAR_API_KEY || !process.env.LINEAR_TEAM_ID) {
      console.error('Missing Linear environment variables')
      return NextResponse.json(
        { error: 'Linear integration not configured' },
        { status: 500 }
      )
    }

    // Initialize Linear client
    const linearClient = new LinearClient({
      apiKey: process.env.LINEAR_API_KEY
    })

    // Create Linear issue. The authenticated identity is recorded alongside the
    // submitted name/email so spoofed form values are detectable by support.
    const issuePayload = await linearClient.createIssue({
      title: `Support: ${subject}`,
      description: `**From:** ${name} (${email})
**Authenticated user:** ${session.user.email} (id: ${session.user.id})

**Subject:** ${subject}

**Description:**
${description}

---
*This issue was created automatically from a support form submission.*`,
      teamId: process.env.LINEAR_TEAM_ID,
      labelIds: ['99d221e1-6d69-46c9-8a71-fcf64153bd59'], // Bug label ID from your Linear
      priority: 2, // High priority
    })

    if (!issuePayload.success) {
      console.error('Linear issue creation failed:', issuePayload)
      throw new Error('Failed to create Linear issue')
    }

    return NextResponse.json({
      success: true,
      issueId: 'created',
      message: 'Support request submitted successfully'
    })

  } catch (error) {
    console.error('Support API error:', error)
    return NextResponse.json(
      { error: 'Failed to submit support request' },
      { status: 500 }
    )
  }
}
