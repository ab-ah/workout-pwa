// Minimal HTML escaper for values interpolated into innerHTML strings. User-
// created exercise/routine names are rendered in several places via template
// literals; escaping them stops a name containing markup from injecting DOM.
// Data is local and single-user so the risk is low, but escaping is cheap and
// correct. (History already had a private copy of this; this is the shared one.)
export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
