import { storageBalances } from "@/lib/server/storage-balances";
import { createHash } from "node:crypto";
import { HttpError } from "@/lib/server/errors.cjs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/server/scoped-database.cjs";
import { withApiAuth } from "@/lib/server/api-route";

// Creating data

async function POSTHandler(req, { user }) {
  const formData = await req.json();

  const { quantity, preStorageLocationId, responsiblePreStorageEmployeeId } =
    formData;

  if (!quantity || !preStorageLocationId || !responsiblePreStorageEmployeeId) {
    return NextResponse.json(
      {
        message: "Backend: All fields are required",
      },
      { status: 400 },
    );
  }

  const ids = formData.containerProfileIds;
  const receiptKey = formData.receiptKey;
  let receiptFingerprint;
  if (receiptKey !== undefined) {
    if (
      typeof receiptKey !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        receiptKey,
      ) ||
      !Array.isArray(ids)
    )
      throw new HttpError(400, "Invalid receipt reference");
    receiptFingerprint = createHash("sha256")
      .update(
        JSON.stringify({
          quantity,
          preStorageLocationId,
          responsiblePreStorageEmployeeId,
          ids: [...ids].sort((a, b) => a - b),
        }),
      )
      .digest("hex");
    const saved = await prisma.preStorageEntry.findFirst({
      where: { receiptKey },
    });
    if (saved) {
      if (saved.receiptFingerprint !== receiptFingerprint)
        throw new HttpError(
          409,
          "This receipt reference was used for different data",
        );
      return NextResponse.json({
        message: "Receipt already recorded",
        receipt: {
          id: saved.id,
          createdAt: saved.createdAt,
          quantity: saved.quantity,
        },
        replayed: true,
      });
    }
  }

  let receivedProfiles = [];
  if (user.role !== "ADMINISTRATOR" || ids) {
    if (
      !Array.isArray(ids) ||
      !ids.length ||
      ids.some((id) => !Number.isSafeInteger(id) || id <= 0) ||
      new Set(ids).size !== ids.length
    )
      throw new HttpError(400, "Select the incoming container profiles");
    const profiles = await prisma.containerProfile.findMany({
      where: { id: { in: ids } },
      include: { shippingInformation: true },
    });
    receivedProfiles = profiles;
    if (profiles.length !== ids.length)
      throw new HttpError(404, "Container profile not found");
    if (
      profiles.some(
        (p) =>
          p.containerStatus !== "pending" ||
          p.shippingInformation.truckStatus !== "IN",
      )
    )
      throw new HttpError(
        409,
        "These containers are no longer awaiting receipt",
      );
    if (profiles.reduce((sum, p) => sum + p.quantity, 0) !== quantity)
      throw new HttpError(
        400,
        "Receipt quantity must match the selected container profiles",
      );
    const hall = await prisma.preStorageLocation.findUniqueOrThrow({
      where: { id: preStorageLocationId },
      include: { preStorageEntry: true },
    });
    const balance = (await storageBalances()).pre.find(row => row.id === hall.id).inventory;
    if (balance.inconsistent) throw new HttpError(409, "Review inconsistent recorded stock before receiving more containers");
    if (
      (balance.quantity + quantity) *
        hall.containerFootprint >
      hall.surfaceArea
    )
      throw new HttpError(409, "The hall does not have enough free capacity");
    for (const profile of profiles)
      await prisma.containerProfile.update({
        where: { id: profile.id },
        data: { containerStatus: "accepted" },
      });
    for (const shipmentId of new Set(
      profiles.map((p) => p.shippingInformationId),
    )) {
      const remaining = await prisma.containerProfile.count({
        where: {
          shippingInformationId: shipmentId,
          containerStatus: { not: "accepted" },
        },
      });
      if (!remaining)
        await prisma.shippingInformation.update({
          where: { id: shipmentId },
          data: { status: "accepted" },
        });
    }
  }

  {
    const saved = await prisma.preStorageEntry.create({
      data: {
        ...(receiptKey ? { receiptKey, receiptFingerprint } : {}),
        quantity,
        preStorageLocationId,
        responsiblePreStorageEmployeeId,
      },
    });

    for (const profile of receivedProfiles) {
      await prisma.receiptAllocation.create({ data: {
        receiptId: saved.id, shipmentId: profile.shippingInformationId,
        containerProfileId: profile.id, locationId: preStorageLocationId,
        quantity: profile.quantity, actorId: user.id,
        responsibleEmployeeId: responsiblePreStorageEmployeeId,
        createdAt: saved.createdAt,
      } });
    }

    return NextResponse.json(
      {
        message: "Receipt recorded successfully.",
        receipt: {
          id: saved.id,
          createdAt: saved.createdAt,
          quantity: saved.quantity,
        },
      },
      { status: 200 },
    );
  }
}

// Fetch data

async function GETHandler() {
  {
    const preStorageOfCapacityData = await prisma.preStorageEntry.findMany({
      orderBy: {
        id: "desc",
      },
    });

    if (preStorageOfCapacityData.length === 0) {
      return NextResponse.json(
        {
          preStorageOfCapacityData: [],
          message: "No PreStorage Of Waste data available.",
        },
        { status: 200 }, // No Content
      );
    }

    return NextResponse.json(
      { preStorageOfCapacityData, message: "Data fetched successfully" },
      { status: 200 },
    );
  }
}

export const POST = withApiAuth(POSTHandler, { access: "member" });
export const GET = withApiAuth(GETHandler);

export const dynamic = "force-dynamic";
