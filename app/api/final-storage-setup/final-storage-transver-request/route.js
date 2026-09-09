import { NextResponse } from "next/server";
import { prisma } from "@/lib/server/scoped-database.cjs";
import { withApiAuth } from "@/lib/server/api-route";

// Creating new request to pre-storage

async function POSTHandler(req, res) {
  const formData = await req.json();

  const {
    requestedQuantity,
    requestedByRoom,
    requestedByEmployeeId,
    finalStorageLocationId,
  } = formData;

  if (
    !requestedQuantity ||
    !requestedByRoom ||
    !requestedByEmployeeId ||
    !finalStorageLocationId
  ) {
    return NextResponse.json(
      {
        message: "Backend: All fields are required",
      },
      { status: 400 },
    );
  }

  {
    await prisma.storageTransferRequest.create({
      data: {
        requestedQuantity,
        requestedByRoom,
        requestedByEmployeeId,
        finalStorageLocationId,
      },
    });

    return NextResponse.json(
      { message: "New request to pre-storage created successfully." },
      { status: 200 },
    );
  }
}

// Fetch data

async function GETHandler() {
  {
    const finalStorageTransverRequestData =
      await prisma.storageTransferRequest.findMany({
        orderBy: {
          id: "desc",
        },
      });

    if (finalStorageTransverRequestData.length === 0) {
      return NextResponse.json(
        {
          finalStorageTransverRequestData: [],
          message: "No requests to pre-storage data available.",
        },
        { status: 200 }, // No Content
      );
    }

    return NextResponse.json(
      {
        finalStorageTransverRequestData,
        message: "Requests to pre-storage data fetched successfully",
      },
      { status: 200 },
    );
  }
}

async function PUTHandler(req, res) {
  const { operationType, data } = await req.json();

  {
    switch (operationType) {
      case "PRE_STORAGE_ACCEPT_REQUEST":
        if (!data.requestedQuantity || !data.approvedByEmployeeId) {
          return NextResponse.json(
            { message: "Missing required fields for accept operation" },
            { status: 400 },
          );
        }
        return await updateTransferRequest(
          {
            id: data.id,
            requestedQuantity: data.requestedQuantity,
            approvedByEmployeeId: data.approvedByEmployeeId,
            finalStorageStatus: "transportPending",
            preStorageStatus: "accepted",
          },
          "Request accepted successfully. Transport is pending.",
        );

      case "PRE_STORAGE_REJECT_REQUEST":
        if (!data.id) {
          return NextResponse.json(
            { message: "Missing request ID" },
            { status: 400 },
          );
        }
        return await updateTransferRequest(
          {
            id: data.id,
            finalStorageStatus: "requestRejected",
            preStorageStatus: "rejected",
          },
          "Request has been rejected.",
        );

      case "FINAL_STORAGE_ACCEPT_RESPONSE":
        if (!data.id) {
          return NextResponse.json(
            { message: "Missing request ID" },
            { status: 400 },
          );
        }
        return await updateTransferRequest(
          {
            id: data.id,
            finalStorageStatus: "accepted",
            preStorageStatus: "completed",
          },
          "Final storage request completed successfully.",
        );

      case "FINAL_STORAGE_REJECT_RESPONSE":
        if (!data.id) {
          return NextResponse.json(
            { message: "Missing request ID" },
            { status: 400 },
          );
        }
        return await updateTransferRequest(
          {
            id: data.id,
            requestedQuantity: data.requestedQuantity,
            approvedByEmployeeId: data.approvedByEmployeeId,
            finalStorageStatus: "requestPending",
            preStorageStatus: "pending",
          },
          "Request has been returned for revision.",
        );

      default:
        return NextResponse.json(
          { message: "Invalid operation type" },
          { status: 400 },
        );
    }
  }
}

// Helper function for updating storage transfer request
async function updateTransferRequest(updateData, successMessage) {
  {
    const updated = await prisma.storageTransferRequest.update({
      where: { id: updateData.id },
      data: Object.fromEntries(Object.entries(updateData).filter(([key]) => key !== "id")),
    });
    return NextResponse.json(
      {
        message: successMessage,
        data: updated,
      },
      { status: 200 },
    );
  }
}

export const POST = withApiAuth(POSTHandler);
export const GET = withApiAuth(GETHandler);
export const PUT = withApiAuth(PUTHandler, { bodyObjects: ["data"] });

export const dynamic = "force-dynamic";
