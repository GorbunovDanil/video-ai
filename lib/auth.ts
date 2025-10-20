import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { type NextAuthOptions } from "next-auth";
import EmailProvider from "next-auth/providers/email";
import GoogleProvider from "next-auth/providers/google";
import nodemailer from "nodemailer";

import prisma from "./prisma";

const emailHost = process.env.EMAIL_SERVER_HOST;
const emailPort = process.env.EMAIL_SERVER_PORT;
const emailUser = process.env.EMAIL_SERVER_USER;
const emailPassword = process.env.EMAIL_SERVER_PASSWORD;

const fromAddress = process.env.EMAIL_FROM ?? "Video AI Studio <noreply@video-ai.local>";

const transporter = emailHost
  ? nodemailer.createTransport({
      host: emailHost,
      port: Number(emailPort ?? 587),
      secure: Number(emailPort ?? 587) === 465,
      auth:
        emailUser && emailPassword
          ? {
              user: emailUser,
              pass: emailPassword,
            }
          : undefined,
    })
  : null;

const providers: NextAuthOptions["providers"] = [];

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      allowDangerousEmailAccountLinking: true,
    })
  );
}

providers.push(
  EmailProvider({
      from: fromAddress,
      async sendVerificationRequest({ identifier, url }) {
        if (!transporter) {
          throw new Error(
            "Email transport is not configured. Set EMAIL_SERVER_HOST, EMAIL_SERVER_PORT, EMAIL_SERVER_USER, and EMAIL_SERVER_PASSWORD."
          );
        }

        await transporter.sendMail({
          to: identifier,
          from: fromAddress,
          subject: "Sign in to Video AI Studio",
          text: `Sign in by clicking the following link: ${url}`,
          html: `<p>Click the button below to sign in to Video AI Studio.</p><p><a href="${url}" style="display:inline-block;padding:10px 16px;border-radius:8px;background:#2563eb;color:#fff;text-decoration:none;">Sign in</a></p><p>If you did not request this email you can safely ignore it.</p>`,
        });
      },
    })
);

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/auth/sign-in",
  },
  providers,
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.plan = user.plan;
        token.credits = user.credits;
      }

      if (!user && token.id) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id },
          select: { id: true, plan: true, credits: true },
        });

        if (dbUser) {
          token.plan = dbUser.plan;
          token.credits = dbUser.credits;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id;
        session.user.plan = (token.plan as typeof session.user.plan) ?? session.user.plan;
        session.user.credits = typeof token.credits === "number" ? token.credits : session.user.credits ?? 0;
      }

      return session;
    },
  },
  events: {
    async linkAccount({ user }) {
      await prisma.user.update({
        where: { id: user.id },
        data: { emailVerified: new Date() },
      });
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
