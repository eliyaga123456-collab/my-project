# EAR — Design Direction

**Concept: "after-dark confessional."** The product lives in the moment between a thought and saying it.
Deep ink surfaces (`#0b0a14`) with soft blurred light blooms, a warm **ember** primary (energy, a lit match)
against cool **mist** violet (mystery). Light theme = warm bone paper with the same accents.

**Voice:** short, human, a little cheeky, never edgy-cruel. "Say what you really think." / "Nothing's traced back to you — but be kind."

**Type:** *Bricolage Grotesque* (display — characterful, slightly quirky terminals) + *Inter* (UI). Tight negative
tracking on big headlines, generous line-height on body.

**Signature elements**
- *Veil cards*: message cards have a blurred, frosted top edge and a "sealed" corner notch; unread cards glow with a thin ember rim.
- *Whisper gradient*: ember → violet → indigo, used sparingly (hero blob, primary CTAs, share cards).
- *Ink-drop motion*: elements appear with a 220ms ease-out rise + slight blur-to-sharp; buttons depress 2px.
- *Question stamp*: share cards render the question on a tilted "slip" over the answer panel.

**Spacing:** 4px base. **Radii:** 8/14/22/32. **Elevation:** blur shadows, never hard borders only.
**Motion:** ≤240ms, respects `prefers-reduced-motion`. **A11y:** AA contrast, 2px focus ring in `--secondary`, 44px touch targets.
**Tokens:** `packages/tokens` (TS + CSS variables). **Components:** Button, IconButton, Input, Textarea, Card, Modal,
Dialog, Toast, Avatar, Badge, MessageCard, Navigation, BottomNavigation, Tabs, Dropdown, Tooltip, LoadingSkeleton, EmptyState, ErrorState.
