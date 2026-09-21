import { prisma } from "./scoped-database.cjs";
import { HttpError } from "./errors.cjs";
export async function recordMeasurement(req, user, pre) {
  const input = await req.json(),
    prefix = pre ? "preStorage" : "finalStorage";
  const model = pre
    ? prisma.preStorageConditions
    : prisma.finalStorageCondition;
  const { submissionKey } = input;
  if (
    typeof submissionKey !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      submissionKey,
    )
  )
    throw new HttpError(400, "A valid measurement reference is required");
  const keys = [
    "Temperature",
    "RadiationLevel",
    "Humidity",
    "Pressure",
    "LocationId",
    "ResponsibleEmployeeId",
  ].map((key) => prefix + key);
  const data = Object.fromEntries(keys.map((key) => [key, input[key]]));
  if (
    Object.values(data).some(
      (value) => typeof value !== "number" || !Number.isFinite(value),
    )
  )
    throw new HttpError(
      400,
      "Enter a valid number for every measurement and select a responsible employee",
    );
  const previous = await model.findFirst({ where: { submissionKey } });
  if (previous) {
    if (
      previous.recordedById !== user.id ||
      keys.some((key) => previous[key] !== data[key])
    )
      throw new HttpError(
        409,
        "This measurement reference belongs to different data",
      );
    return Response.json({ measurement: previous, replayed: true });
  }
  const measurement = await model.create({
    data: { ...data, submissionKey, recordedById: user.id },
  });
  return Response.json({ measurement });
}
