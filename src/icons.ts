const PATHS: Record<string, string> = {
  sun: '<circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
  moon: '<path d="M20 13A8 8 0 1111 4a6.5 6.5 0 009 9z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>',
  upload: '<path d="M12 16V4m0 0L8 8m4-4l4 4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M4 15v3a2 2 0 002 2h12a2 2 0 002-2v-3" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
  download: '<path d="M7 17l5 5 5-5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 22V9" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M4 13H3a2 2 0 01-2-2V5a2 2 0 012-2h18a2 2 0 012 2v6a2 2 0 01-2 2h-1" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 002 2h6a2 2 0 002-2l1-12M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
  close: '<path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  check: '<path d="M5 12l5 5 9-11" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>',
  chevron: '<path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  palette: '<path d="M12 3a9 9 0 000 18c1 0 1.5-.8 1.5-1.5 0-.4-.2-.7-.5-1-.3-.3-.5-.6-.5-1A1.5 1.5 0 0114 16h2.5A5.5 5.5 0 0022 10.5C22 6 17.5 3 12 3z" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="7.5" cy="10.5" r="1" fill="currentColor"/><circle cx="12" cy="7.5" r="1" fill="currentColor"/><circle cx="16.5" cy="10.5" r="1" fill="currentColor"/>',
  plus: '<path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  image: '<rect x="3" y="4" width="18" height="16" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="9" cy="10" r="1.6" fill="currentColor"/><path d="M4 18l5-5 3 3 3-3 5 5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
  wand: '<path d="M4 20l11-11M13 4l7 7M8 4l-3 3M13 8l-3 3M17 12l-3 3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
}

export function icon(name: keyof typeof PATHS | string, size = 20): string {
  const body = PATHS[name] ?? PATHS.plus
  return `<svg class="ic" viewBox="0 0 24 24" width="${size}" height="${size}" aria-hidden="true">${body}</svg>`
}