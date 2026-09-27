"use client";
import { useT } from "../shell/preferences";

// How the recorded stock of a hall or room is made up.
export default function InventoryNote({ inventory, final = false }) {
  const t = useT();
  if (!inventory) return null;
  return (
    <div className="mb-3 w-full space-y-2 rounded-xl bg-base-200/70 p-3 text-sm">
      <p className="font-semibold">
        {t("inv.recorded", { count: inventory.quantity })}
      </p>
      <p>
        {final
          ? t("inv.final", {
              stored: inventory.storedQuantity,
              linked: inventory.linkedReceived,
            })
          : t("inv.pre", {
              received: inventory.received,
              transferred: inventory.transferred,
            })}
        {inventory.corrected
          ? ` ${t("inv.corrected", { delta: `${inventory.corrected > 0 ? "+" : "−"} ${Math.abs(inventory.corrected)}` })}`
          : ""}
      </p>
      {final && inventory.unlinkedTransfers > 0 && (
        <p className="text-warning">
          {t("inv.unlinkedTransfers", { count: inventory.unlinkedTransfers })}
        </p>
      )}
      {!final && inventory.unlinkedQuantity > 0 && (
        <p>
          {t("inv.unlinkedQuantity", { count: inventory.unlinkedQuantity })}
        </p>
      )}
      {inventory.inconsistent && (
        <p role="alert" className="text-error">
          {t("inv.inconsistent")}
        </p>
      )}
    </div>
  );
}
