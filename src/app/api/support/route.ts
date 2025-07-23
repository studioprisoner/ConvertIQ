import { NextRequest, NextResponse } from 'next/server'
import { LinearClient } from '@linear/sdk'

interface SupportRequest {
  name: string
  email: string
  subject: string
  description: string
}

export async function POST(request: NextRequest) {
  try {
    const { name, email, subject, description }: SupportRequest = await request.json()

    // Validate required fields
    if (!name || !email || !subject || !description) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      )
    }

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

    // Create Linear issue
    const issuePayload = await linearClient.createIssue({
      title: `Support: ${subject}`,
      description: `**From:** ${name} (${email})

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

    const issue = issuePayload.issue

    return NextResponse.json({
      success: true,
      issueId: issue?.identifier,
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