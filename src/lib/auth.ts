import NextAuth, { type NextAuthOptions } from "next-auth";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "./prisma";
import bcrypt from "bcrypt";
import { z } from "zod";

const credsSchema = z.object({ 
  email: z.string().email(), 
  password: z.string().min(8) 
});

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: "database" },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: { 
        email: { label: "Email", type: "email" }, 
        password: { label: "Password", type: "password" } 
      },
      async authorize(creds) {
        const parsed = credsSchema.safeParse(creds);
        if (!parsed.success) return null;
        
        const { email, password } = parsed.data;
        const user = await prisma.user.findUnique({ where: { email } });
        
        if (!user?.passwordHash) return null;
        
        const ok = await bcrypt.compare(password, user.passwordHash);
        return ok ? { 
          id: user.id, 
          email: user.email, 
          name: user.name || null 
        } : null;
      },
    }),
  ],
  pages: { 
    signIn: "/auth/sign-in",
    signUp: "/auth/sign-up"
  },
  callbacks: {
    session: async ({ session, user }) => ({
      ...session,
      user: { ...session.user, id: user.id },
    }),
  },
};

export const auth = NextAuth(authOptions);