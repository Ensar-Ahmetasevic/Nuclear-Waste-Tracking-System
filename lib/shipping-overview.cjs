function shipmentGroup(truck) {
  if (truck.truckStatus === 'OUT') return 'out';
  return truck.containerProfiles?.length ? 'recorded' : 'missing';
}
function newestShipments(trucks) {
  return [...trucks].sort((a, b) => b.id - a.id);
}
module.exports = { shipmentGroup, newestShipments };
