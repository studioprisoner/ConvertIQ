import clsx from 'clsx'
import React from 'react'

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={clsx(
        'animate-pulse rounded-md bg-zinc-900/10 dark:bg-white/10',
        className
      )}
      {...props}
    />
  )
}