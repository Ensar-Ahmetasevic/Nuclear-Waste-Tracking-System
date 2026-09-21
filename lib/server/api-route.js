import { apiAllowed } from "../workspaces.cjs";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth";
import { database } from "./database.cjs";
import {
  requestDatabase,
  createScopedDatabase,
  positiveInteger,
} from "./scoped-database.cjs";
import { validateRequestValues, readJson } from "./request-validation.cjs";
import { HttpError } from "./errors.cjs";

export function withApiAuth(
  handler,
  { bodyObjects = [], access = "admin", allowedRoles = null } = {},
) {
  return async (request, context) => {
    try {
      const session = await getServerSession(authOptions);
      const id = Number(session?.user?.id);
      if (!positiveInteger(id)) throw new HttpError(401, "Sign in to continue");
      // Read current privileges, rather than trusting a week-old JWT claim.
      const user = await database.userProfile.findUnique({
        where: { id },
        select: { id: true, organizationId: true, active: true, role: true, workArea: true },
      });
      if (!user?.active || !user.organizationId)
        throw new HttpError(
          403,
          "An active organization membership is required",
        );
      if (allowedRoles && !allowedRoles.includes(user.role)) throw new HttpError(403, "This page requires Administrator or Supervision access");
      const resolvedParams = await context?.params;
      if (resolvedParams) {
        validateRequestValues(resolvedParams);
        context = { ...context, params: resolvedParams };
      }
      const mutation = !["GET", "HEAD", "OPTIONS"].includes(request.method);
      let requestBody = {};
      const path = new URL(request.url).pathname.replace(/\/$/, "");
      if (!mutation && !apiAllowed(user, path, request.method)) throw new HttpError(403, "This action is outside your assigned work area");
      if (mutation) {
        if (access === "admin" && user.role !== "ADMINISTRATOR")
          throw new HttpError(
            403,
            "Organization administrator access is required",
          );
        const origin = request.headers.get("origin");
        const expected = new URL(process.env.NEXTAUTH_URL || request.url)
          .origin;
        if (!origin || origin !== expected)
          throw new HttpError(403, "Invalid request origin");
        if (
          !request.headers
            .get("content-type")
            ?.toLowerCase()
            .startsWith("application/json")
        )
          throw new HttpError(415, "JSON is required");
        const body = await readJson(request);
        requestBody = body;
        validateRequestValues(body);
        for (const key of bodyObjects) {
          if (
            !body[key] ||
            typeof body[key] !== "object" ||
            Array.isArray(body[key])
          )
            throw new HttpError(400, `${key} must be an object`);
        }
        request = new Request(request.url, {
          method: request.method,
          headers: request.headers,
          body: JSON.stringify(body),
        });
      }
      if (mutation && !apiAllowed(user, path, request.method, requestBody)) throw new HttpError(403, "This action is outside your assigned work area");
      const response = await database.$transaction(
        (tx) =>
          requestDatabase.run(
            createScopedDatabase(tx, user.organizationId),
            async () => {
              if (
                mutation &&
                access === "shipping" &&
                user.role !== "ADMINISTRATOR"
              ) {
                const body = await request.clone().json();
                const path = new URL(request.url).pathname;
                const scoped = createScopedDatabase(tx, user.organizationId);
                let shipment;
                if (
                  path === "/api/shipping-informations" &&
                  request.method !== "POST"
                ) {
                  const id = Number(
                    body.id ||
                      body.updatedTruckData?.id ||
                      body.shippingStatusData?.id,
                  );
                  shipment = await scoped.shippingInformation.findUniqueOrThrow(
                    { where: { id } },
                  );
                } else if (path === "/api/container-profile") {
                  let id = Number(body.shippingInformationId);
                  if (request.method !== "POST") {
                    const container =
                      await scoped.containerProfile.findUniqueOrThrow({
                        where: {
                          id: Number(
                            body.id ||
                              body.preparedData?.id ||
                              body.containerStatusUpdateData
                                ?.containerProfileId,
                          ),
                        },
                      });
                    id = container.shippingInformationId;
                  }
                  shipment = await scoped.shippingInformation.findUniqueOrThrow(
                    { where: { id } },
                  );
                }
                if (shipment?.truckStatus === "OUT")
                  throw new HttpError(
                    403,
                    "Only administrators can correct a departed shipment",
                  );
              }
              return handler(request, { ...context, user, tx });
            },
          ),
        { isolationLevel: "Serializable", timeout: 10000 },
      );
      response.headers.set("Cache-Control", "private, no-store");
      return response;
    } catch (error) {
      // Prisma 7 driver adapters surface serializable conflicts as DriverAdapterError
      // (kind TransactionWriteConflict) instead of PrismaClientKnownRequestError P2034.
      const adapterKind = error.cause?.kind || error.kind;
      const conflict =
        error.code === "P2034" ||
        error.code === "P2002" ||
        error.code === "P2003" ||
        adapterKind === "TransactionWriteConflict" ||
        /could not serialize access|concurrent update/i.test(String(error.message || ""));
      const status =
        error.status ||
        (error.code === "P2025" ? 404 : null) ||
        (conflict ? 409 : null) ||
        (error instanceof SyntaxError ? 400 : 500);
      const message =
        error instanceof HttpError
          ? error.message
          : {
              400: "Invalid request",
              404: "Record not found",
              409: "The record changed or is still in use. Refresh and retry.",
            }[status] || "Unable to complete the request";
      if (status === 500)
        console.error("API request failed", {
          code: error.code,
          name: error.name,
          kind: adapterKind,
        });
      return Response.json(
        { message },
        { status, headers: { "Cache-Control": "private, no-store" } },
      );
    }
  };
}
