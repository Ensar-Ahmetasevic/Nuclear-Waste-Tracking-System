export default function InventoryNote({ inventory, final = false }) {
  if (!inventory) return null;
  return <div className="my-4 w-full rounded-lg border border-base-content/20 p-4 text-sm">
    <p className="font-semibold">Recorded stock: {inventory.quantity} containers</p>
    <p className="mt-2">{final
      ? `${inventory.storedQuantity} in the existing stored count + ${inventory.linkedReceived} from linked final receipts.`
      : `${inventory.received} received − ${inventory.transferred} confirmed in final storage. Pending approvals are still counted here.`}</p>
    {final && inventory.unlinkedTransfers > 0 && <p className="mt-2 text-warning">{inventory.unlinkedTransfers} older completed transfers have no source link. They are not added to the existing stored count again; reconciliation is needed.</p>}
    {!final && inventory.unlinkedQuantity > 0 && <p className="mt-2">{inventory.unlinkedQuantity} received containers have no profile-level receipt link.</p>}
    {inventory.inconsistent && <p role="alert" className="mt-2 text-error">Recorded movements exceed recorded receipts. This stock balance needs review.</p>}
  </div>;
}
