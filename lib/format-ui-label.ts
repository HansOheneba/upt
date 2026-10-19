/**
 * Title-style casing for UI labels (card titles, stat rows, KPI labels).
 * Capitalizes the first letter of each word; leaves acronyms and user data unchanged
 * when already mixed-case.
 */
export function formatUiLabel(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return trimmed;

  return trimmed
    .split(/\s+/)
    .map((word) => {
      if (!word) return word;
      if (word === word.toUpperCase() && word.length > 1) return word;

      const parts = word.split(/([/&-])/);
      return parts
        .map((part) => {
          if (part.length <= 1 || /[/&-]/.test(part)) return part;
          return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
        })
        .join("");
    })
    .join(" ");
}
