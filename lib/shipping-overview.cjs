function shipmentGroup(truck) {
  if (truck.truckStatus === 'OUT') return 'out';
  return truck.containerProfiles?.length ? 'recorded' : 'missing';
}
function newestShipments(trucks) {
  return [...trucks].sort((a, b) => b.id - a.id);
}
// Colour of a truck wherever it is listed: blue = IN, content not entered yet;
// green = IN, content entered; red = OUT.
const GROUP_TONE = { missing: 'step-1', recorded: 'success', out: 'error' };
module.exports = { shipmentGroup, newestShipments, GROUP_TONE };
