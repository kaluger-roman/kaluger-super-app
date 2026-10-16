export const hasVisibleNotes = (notes?: string): notes is string =>
  Boolean(notes && notes.trim().length > 0);
