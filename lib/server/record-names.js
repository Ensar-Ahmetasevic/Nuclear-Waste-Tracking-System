import { prisma } from "./scoped-database.cjs";
import { database } from "./database.cjs";

const unique = (ids) => [...new Set(ids.filter((id) => Number.isSafeInteger(id) && id > 0))];
const byId = (rows, label) => new Map(rows.map((row) => [row.id, label(row)]));

// Readable names for ids stored in records: people of this organization and the
// definitions and locations a record refers to. Missing ids stay unresolved.
export async function recordNames({ users = [], origins = [], wastes = [], types = [], halls = [], rooms = [], preEmployees = [] } = {}) {
  const find = (model, ids, select = { id: true, name: true }) =>
    ids.length ? prisma[model].findMany({ where: { id: { in: ids } }, select }) : [];
  const userIds = unique(users);
  const people = userIds.length
    ? await database.userProfile.findMany({
        where: { id: { in: userIds }, organizationId: prisma.$organizationId },
        select: { id: true, displayName: true, username: true, email: true },
      })
    : [];
  return {
    users: byId(people, (row) => row.displayName || row.username || row.email),
    origins: byId(await find("locationOrigin", unique(origins)), (row) => row.name),
    wastes: byId(await find("wasteProfile", unique(wastes)), (row) => row.name),
    types: byId(await find("containerType", unique(types)), (row) => row.name),
    halls: byId(await find("preStorageLocation", unique(halls)), (row) => row.name),
    rooms: byId(await find("finalStorageLocation", unique(rooms)), (row) => row.name),
    preEmployees: byId(
      await find("preStorageResponsibleEmployee", unique(preEmployees), { id: true, name: true, surname: true }),
      (row) => `${row.name} ${row.surname}`,
    ),
  };
}

// Name for display, or the stored reference when the record no longer exists.
export const nameOr = (map, id, fallback) => map.get(id) ?? `${fallback} #${id}`;

// { id: name } of people, for the page to show who recorded something.
export const peopleMap = (names) => Object.fromEntries(names.users);
