import { NextResponse } from "next/server";
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

// Creating new request to pre-storage

export async function POST(req, res) {
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

  try {
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
  } catch (error) {
    console.error("Faild to create request to pre-storage:", error);
    return NextResponse.json(
      { message: "Faild to create request to pre-storage" },
      { status: 500 },
      { error: `${error.message}` },
    );
  }
}

// Fetch data

export async function GET() {
  try {
    const finalStorageTransverRequestData =
      await prisma.storageTransferRequest.findMany({
        orderBy: {
          id: "desc",
        },
      });

    if (finalStorageTransverRequestData.length === 0) {
      return NextResponse.json(
        {
          finalStorageTransverRequestData: null,
          message: "No requests to pre-storage data available.",
        },
        { status: 204 }, // No Content
      );
    }

    return NextResponse.json(
      {
        finalStorageTransverRequestData,
        message: "Requests to pre-storage data fetched successfully",
      },
      { status: 200 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        message: "Failed to fetch data requests to pre-storage.",
        error: error.message,
      },
      { status: 500 },
    );
  }
}

export async function PUT(req, res) {
  const { operationType, data } = await req.json();

  try {
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
  } catch (error) {
    console.error("Failed to update Final Storage Transfer Request.", error);
    return NextResponse.json(
      {
        message: "Failed to process the request. Please try again.",
        error: error.message,
      },
      { status: 500 },
    );
  }
}

// Helper function for updating storage transfer request
async function updateTransferRequest(updateData, successMessage) {
  try {
    const updated = await prisma.storageTransferRequest.update({
      where: { id: updateData.id },
      data: updateData,
    });
    return NextResponse.json(
      {
        message: successMessage,
        data: updated,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Failed to update transfer request:", error);
    return NextResponse.json(
      {
        message: `Error: ${error.message}`,
        error: error.message,
      },
      { status: 500 },
    );
  }
}
