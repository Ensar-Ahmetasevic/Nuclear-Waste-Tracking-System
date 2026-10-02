@AGENTS.md

# Design philosophy: "Jednostavnost je ključ uspjeha"

Every UI/UX decision follows an Apple-like principle: the simpler the app is to use, the better.

- Show enough information, never unnecessary information. Extra text and data confuse the user.
- Keep related information together in one place instead of spreading it across many small places (pages, tabs, cards, dialogs).
- Prefer short labels, clear hierarchy and one obvious primary action per screen over explanatory paragraphs.
- Before adding a new page, card, badge, dialog or paragraph, check whether an existing place can hold it instead.
- When reviewing or changing UI, look for things to remove or merge, not only things to add.
- Colour carries meaning, not decoration, so the app is neither monotone nor colourful. Buttons:
  - blue `btn-primary`: the normal main action of a screen or form step;
  - amber `btn-warning`: the action the process is waiting for right now (e.g. "Record departure" once the journey is at Departure);
  - green `btn-success`: accepting — receive, approve, confirm receipt, resolve;
  - red `btn-error` / `btn-soft btn-error`: reject, return, delete;
  - neutral ghost: opening and navigating (Open, History, Edit).
  One coloured button per context; everything else stays neutral.
- A truck has three colours wherever it is listed (stripe, chip, Open): blue = IN, content not entered yet; green = IN, content entered; red = OUT. Free space is green and used space red in a hall.
- Every correction (edit, delete, or adding to a departed shipment) asks for a written reason and is kept in the history. Employees correct while the truck is IN; after OUT only Supervision and Administrators. Deleting a shipment or a Container Profile is always for Supervision and Administrators only.
- Every page below a hub page gets `components/ui/breadcrumb.js` showing where it belongs (area › hall › alert), so each level above is one click away.
