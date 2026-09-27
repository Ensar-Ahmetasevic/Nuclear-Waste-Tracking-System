// Each hall and room has its own colour, used on its card and throughout its
// page. Assigned from the id, so it never changes when locations are added.
export const LOCATION_TONES = [
  "tone-blue",
  "tone-magenta",
  "tone-teal",
  "tone-orange",
  "step-3",
  "step-1",
];

export const locationTone = (id) =>
  LOCATION_TONES[(Math.max(1, Number(id) || 1) - 1) % LOCATION_TONES.length];

// Literal class names, so the stylesheet contains them.
export const LOCATION_BORDERS = {
  "tone-blue": "border-tone-blue",
  "tone-magenta": "border-tone-magenta",
  "tone-teal": "border-tone-teal",
  "tone-orange": "border-tone-orange",
  "step-3": "border-step-3",
  "step-1": "border-step-1",
};
