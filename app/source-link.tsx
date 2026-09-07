export function SourceLink({ href }: { href: string }) {
  return (
    <a
      href={href}
      aria-label="View source on GitHub"
      title="View source on GitHub"
      className="ml-auto inline-flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
    >
      <span className="sr-only">View source on GitHub</span>
      <svg
        viewBox="0 0 24 24"
        fill="currentColor"
        className="size-4"
        aria-hidden="true"
      >
        <path d="M12 .75a11.25 11.25 0 0 0-3.558 21.923c.563.104.768-.244.768-.542 0-.267-.01-.974-.015-1.912-3.13.68-3.79-1.508-3.79-1.508-.512-1.3-1.25-1.646-1.25-1.646-1.022-.7.078-.685.078-.685 1.13.08 1.724 1.16 1.724 1.16 1.005 1.723 2.637 1.225 3.28.937.103-.728.394-1.225.716-1.507-2.498-.284-5.125-1.25-5.125-5.563 0-1.229.44-2.232 1.16-3.02-.116-.284-.502-1.429.11-2.978 0 0 .945-.302 3.094 1.154A10.78 10.78 0 0 1 12 6.195c.956.004 1.918.13 2.817.38 2.148-1.456 3.091-1.154 3.091-1.154.614 1.55.228 2.694.112 2.978.722.788 1.158 1.791 1.158 3.02 0 4.325-2.63 5.276-5.137 5.555.404.35.766 1.04.766 2.098 0 1.515-.014 2.737-.014 3.109 0 .301.203.652.774.541A11.25 11.25 0 0 0 12 .75Z" />
      </svg>
    </a>
  )
}
