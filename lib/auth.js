import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { database as prisma } from "./server/database.cjs";

import { rateLimit } from "./server/rate-limit.cjs";

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password are required");
        }

        if (
          typeof credentials.email !== "string" ||
          typeof credentials.password !== "string" ||
          credentials.email.length > 254 ||
          Buffer.byteLength(credentials.password) > 72
        )
          throw new Error("Invalid credentials");
        const email = credentials.email.trim().toLowerCase();
        await rateLimit("login", email, 10);
        const user = await prisma.userProfile.findFirst({
          where: { OR: [{ email }, { username: email }] },
        });

        if (!user || !user.active || !user.organizationId) {
          throw new Error("Invalid email or password");
        }

        const isValid = await bcrypt.compare(
          credentials.password,
          user.password,
        );

        if (!isValid) {
          throw new Error("Invalid email or password");
        }

        return {
          id: String(user.id),
          email: user.email,
          name: user.displayName || user.username || user.companyName,
          role: user.role,
          sessionVersion: user.sessionVersion,
          companyId: user.companyId,
          administrator: user.role === "ADMINISTRATOR",
          organizationId: user.organizationId,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.sessionVersion = user.sessionVersion;
        token.companyId = user.companyId;
        token.administrator = user.administrator;
        token.organizationId = user.organizationId;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id;
        session.user.companyId = token.companyId;
        const current = await prisma.userProfile.findUnique({
          where: { id: Number(token.id) },
        });
        if (
          !current?.active ||
          !current.organizationId ||
          current.sessionVersion !== (token.sessionVersion ?? 0)
        ) {
          session.user = undefined;
          return session;
        }
        session.user.name =
          current.displayName || current.username || current.companyName;
        session.user.role = current.role;
        session.user.workArea = current.workArea;
        session.user.administrator = current.role === "ADMINISTRATOR";
        session.user.organizationId = current.organizationId;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
