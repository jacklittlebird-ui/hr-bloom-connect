// Color mapping for job degrees (badge classes)
// Each degree gets a distinct color so users can scan quickly.
export function getJobDegreeBadgeClass(degree?: string | null): string {
  const d = (degree || '').toString().trim().toUpperCase();
  switch (d) {
    case 'AA':
      return 'bg-red-100 text-red-700 border-red-300 hover:bg-red-100 dark:bg-red-500/15 dark:text-red-300 dark:border-red-500/40';
    case 'A':
      return 'bg-orange-100 text-orange-700 border-orange-300 hover:bg-orange-100 dark:bg-orange-500/15 dark:text-orange-300 dark:border-orange-500/40';
    case 'B':
      return 'bg-blue-100 text-blue-700 border-blue-300 hover:bg-blue-100 dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-500/40';
    case 'C':
      return 'bg-emerald-100 text-emerald-700 border-emerald-300 hover:bg-emerald-100 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/40';
    case 'D':
      return 'bg-purple-100 text-purple-700 border-purple-300 hover:bg-purple-100 dark:bg-purple-500/15 dark:text-purple-300 dark:border-purple-500/40';
    case 'E':
      return 'bg-pink-100 text-pink-700 border-pink-300 hover:bg-pink-100 dark:bg-pink-500/15 dark:text-pink-300 dark:border-pink-500/40';
    default:
      return 'bg-muted text-muted-foreground border-border';
  }
}
