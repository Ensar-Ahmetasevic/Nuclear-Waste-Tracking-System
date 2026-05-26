import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(req) {
  try {
    const body = await req.json();
    const { email, password, companyId, companyName, address, administrator } =
      body;

    if (!email || !password || !companyName || !companyId || !address) {
      return NextResponse.json(
        { message: "All fields are required" },
        { status: 400 },
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { message: "Password must be at least 6 characters" },
        { status: 400 },
      );
    }

    const existing = await prisma.userProfile.findUnique({
      where: { email },
    });

    if (existing) {
      return NextResponse.json(
        { message: "User with this email already exists" },
        { status: 409 },
      );
    }

    const hashed = await bcrypt.hash(password, 10);

    const user = await prisma.userProfile.create({
      data: {
        email,
        password: hashed,
        companyId: parseInt(companyId),
        companyName,
        address,
        administrator: Boolean(administrator),
      },
      select: {
        id: true,
        email: true,
        companyName: true,
        administrator: true,
      },
    });

    return NextResponse.json(
      { message: "User registered successfully", user },
      { status: 201 },
    );
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { message: "Failed to register user", error: error.message },
      { status: 500 },
    );
  }
}
