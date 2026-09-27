import { prisma } from "./scoped-database.cjs";
import { HttpError } from "./errors.cjs";
import { assertActiveResponsibleEmployee } from "./definition-changes";
import { evaluateMeasurement } from "./monitoring";
import readings from "../measurement-reading.cjs";

const { readingSourceProblem, storedReadingSource } = readings;
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
  // Values read from a device must each be confirmed by the person saving them.
  const problem = readingSourceProblem(input.readingSource);
  if (problem) throw new HttpError(400, problem);
  const readingSource = storedReadingSource(input.readingSource);
  const previous = await model.findFirst({ where: { submissionKey } });
  if (previous) {
    if (
      previous.recordedById !== user.id ||
      keys.some((key) => previous[key] !== data[key]) ||
      JSON.stringify(previous.readingSource ?? null) !== JSON.stringify(readingSource)
    )
      throw new HttpError(
        409,
        "This measurement reference belongs to different data",
      );
    return Response.json({ measurement: previous, replayed: true });
  }
  await assertActiveResponsibleEmployee(pre, data[prefix + "ResponsibleEmployeeId"]);
  const measurement = await model.create({
    data: { ...data, submissionKey, recordedById: user.id, ...(readingSource && { readingSource }) },
  });
  // Alerts open, continue or clear in the same transaction as the measurement.
  const alerts = await evaluateMeasurement(pre ? "PRE_STORAGE" : "FINAL_STORAGE", measurement);
  return Response.json({ measurement, alerts });
}
