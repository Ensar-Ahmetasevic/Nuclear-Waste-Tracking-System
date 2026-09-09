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

        if (typeof credentials.email !== "string" || typeof credentials.password !== "string" || credentials.email.length > 254 || Buffer.byteLength(credentials.password) > 72) throw new Error("Invalid credentials");
        const email = credentials.email.toLowerCase();
        await rateLimit("login", email, 10);
        const user = await prisma.userProfile.findUnique({
          where: { email },
        });

        if (!user || !user.active) {
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
          name: user.companyName,
          companyId: user.companyId,
          administrator: user.administrator,
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
        session.user.administrator = token.administrator;
        session.user.organizationId = token.organizationId;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
