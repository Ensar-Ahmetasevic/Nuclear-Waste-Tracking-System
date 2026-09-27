// Name of the person who recorded something, or "User #id" when no name is known.
export const personLabel = (t, name, id) => name || t("ship.activity.user", { actor: id });
