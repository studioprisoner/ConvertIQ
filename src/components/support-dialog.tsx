'use client'

import { useState } from 'react'
import { Button } from './button'
import { Dialog, DialogActions, DialogBody, DialogDescription, DialogTitle } from './dialog'
import { Field, Label, ErrorMessage } from './fieldset'
import { Input } from './input'
import { Textarea } from './textarea'
import { CheckCircleIcon } from '@heroicons/react/20/solid'
import { useSession } from '@/lib/auth-client'

interface SupportDialogProps {
  isOpen: boolean
  onClose: () => void
}

interface FormData {
  subject: string
  description: string
}

export function SupportDialog({ isOpen, onClose }: SupportDialogProps) {
  const { data: session } = useSession()
  const [formData, setFormData] = useState<FormData>({
    subject: '',
    description: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSuccess, setIsSuccess] = useState(false)
  const [issueId, setIssueId] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    // Get user info from session
    const userName = session?.user?.name || 'Unknown User'
    const userEmail = session?.user?.email || 'unknown@email.com'

    try {
      const response = await fetch('/api/support', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: userName,
          email: userEmail,
          ...formData
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to submit support request')
      }

      const result = await response.json()
      
      // Show success state
      setIsSuccess(true)
      setIssueId(result.issueId)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleChange = (field: keyof FormData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: e.target.value
    }))
  }

  const resetDialog = () => {
    setFormData({
      subject: '',
      description: ''
    })
    setError(null)
    setIsSuccess(false)
    setIssueId(null)
    setIsSubmitting(false)
  }

  const handleClose = () => {
    resetDialog()
    onClose()
  }

  return (
    <Dialog open={isOpen} onClose={handleClose} size="lg">
      {!isSuccess ? (
        <>
          <DialogTitle>Ask a question</DialogTitle>
          <DialogDescription>
            How can we help? Please share any relevant information we may need to answer your question.
          </DialogDescription>
          
          <DialogBody>
            <form onSubmit={handleSubmit} className="space-y-6">
              <Field>
                <Label>Subject</Label>
                <Input
                  type="text"
                  required
                  value={formData.subject}
                  onChange={handleChange('subject')}
                  placeholder="Brief description of your issue"
                />
              </Field>

              <Field>
                <Label>Description</Label>
                <Textarea
                  required
                  value={formData.description}
                  onChange={handleChange('description')}
                  placeholder="How do I..."
                  rows={6}
                />
              </Field>

              {error && (
                <ErrorMessage>{error}</ErrorMessage>
              )}
            </form>

            <div className="mt-6 text-sm text-zinc-500 dark:text-zinc-400">
              You can also email us at <span className="font-medium">support@convertiq.cloud</span>.
            </div>
          </DialogBody>

          <DialogActions>
            <Button plain onClick={handleClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              onClick={handleSubmit}
              disabled={isSubmitting || !formData.subject || !formData.description}
            >
              {isSubmitting ? 'Sending...' : 'Send question'}
            </Button>
          </DialogActions>
        </>
      ) : (
        <>
          <DialogTitle>Request submitted successfully!</DialogTitle>
          
          <DialogBody>
            <div className="flex items-center gap-4">
              <CheckCircleIcon className="h-12 w-12 text-green-500" />
              <div className="flex-1">
                <p className="text-base font-medium text-zinc-950 dark:text-white">
                  Thank you for your message
                </p>
                <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                  We've received your support request{issueId && ` (#${issueId})`} and will get back to you as soon as possible.
                </p>
                <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
                  You can also reach us directly at <span className="font-medium">support@convertiq.cloud</span> if you have any urgent questions.
                </p>
              </div>
            </div>
          </DialogBody>

          <DialogActions>
            <Button onClick={handleClose}>
              Close
            </Button>
          </DialogActions>
        </>
      )}
    </Dialog>
  )
}