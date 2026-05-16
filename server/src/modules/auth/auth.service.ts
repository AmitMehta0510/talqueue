import prisma from "shared/database/prisma";
import bcrypt from "bcryptjs";
import AppError from "shared/errors/AppError";
import { generateToken } from "shared/utils/jwt";

export const registerUser =  async (data: any) => {

    const {
      email,
      password,
      fullName,
      username,
      role,
    } = data;

    // Check existing email
    const existingUser =
      await prisma.user.findUnique({
        where: { email },
      });

    if (existingUser) {
      throw new AppError(
        "User already exists",
        400
      );
    }

    // Check existing username
    const existingUsername =
      await prisma.user.findUnique({
        where: {
          username,
        },
      });

    if (existingUsername) {
      throw new AppError(
        "Username already taken",
        400
      );
    }

    // Validate role BEFORE creation
    const foundRole =
      await prisma.role.findUnique({
        where: {
          name: role,
        },
      });

    if (!foundRole) {
      throw new AppError(
        "Invalid role",
        400
      );
    }

    const hashedPassword =
      await bcrypt.hash(
        password,
        10
      );

    // Transaction
    const user =
      await prisma.$transaction(
        async (tx) => {

          const createdUser =
            await tx.user.create({
              data: {
                email,

                username,

                password:
                  hashedPassword,

                profile: {
                  create: {
                    fullName,
                  },
                },
              },

              include: {
                profile: true,
              },
            });

          await tx.userRole.create({
            data: {
              userId:
                createdUser.id,

              roleId:
                foundRole.id,
            },
          });

          return createdUser;
        }
      );

    const token =
      generateToken(user.id);

    return {
      token,
      user,
    };
  };

export const loginUser = async (data: any) => {
  const { email, password } = data;

  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      profile: true,
      roles: {
        include: {
          role: true,
        },
      },
    },
  });

  if (!user) {
    throw new AppError("Invalid credentials", 401);
  }

  const isMatch = await bcrypt.compare(
    password,
    user.password
  );

  if (!isMatch) {
    throw new AppError("Invalid credentials", 401);
  }

  const token = generateToken(user.id);

  return {
    token,
    user,
  };
};