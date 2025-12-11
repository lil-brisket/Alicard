import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { db } from "~/server/db";

const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(20, "Username must be at most 20 characters")
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      "Username can only contain letters, numbers, underscores, and hyphens"
    ),
  password: z.string().min(8, "Password must be at least 8 characters"),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validatedData = registerSchema.parse(body);

    // Check if user already exists by email
    const existingUserByEmail = await db.user.findUnique({
      where: { email: validatedData.email },
    });

    if (existingUserByEmail) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 400 },
      );
    }

    // Check if username already exists
    const existingUserByUsername = await db.user.findUnique({
      where: { username: validatedData.username },
    });

    if (existingUserByUsername) {
      return NextResponse.json(
        { error: "Username is already taken" },
        { status: 400 },
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(validatedData.password, 10);

    // Base stats for character
    const vitality = 5;
    const strength = 5;
    const speed = 5;
    const dexterity = 5;
    const maxHp = vitality * 10; // 50
    const maxStamina = 50;

    // Create user and character in a transaction
    const user = await db.user.create({
      data: {
        email: validatedData.email,
        username: validatedData.username,
        password: hashedPassword,
        gender: validatedData.gender,
        characters: {
          create: {
            name: validatedData.username,
            gender: validatedData.gender,
            vitality,
            strength,
            speed,
            dexterity,
            maxHp,
            currentHp: maxHp,
            maxStamina,
            currentStamina: maxStamina,
            floor: 1,
            location: "Town Square",
          },
        },
      },
      select: {
        id: true,
        email: true,
        username: true,
        image: true,
        gender: true,
      },
    });

    return NextResponse.json(
      { message: "User created successfully", user },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 },
      );
    }

    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

