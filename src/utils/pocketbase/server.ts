import "server-only";

import PocketBase from "pocketbase";
import { cookies } from "next/headers";

export const AUTH_COOKIE_NAME = "wedding_admin_auth";

function getPocketBaseUrl() {
  return process.env.POCKETBASE_URL || "http://127.0.0.1:8090";
}

function isSecureCookie() {
  const configured = process.env.AUTH_COOKIE_SECURE;

  if (configured !== undefined) {
    return configured.toLowerCase() === "true";
  }

  return process.env.NODE_ENV === "production";
}

export function createPocketBase() {
  const pb = new PocketBase(getPocketBaseUrl());
  pb.autoCancellation(false);
  return pb;
}

export function createPocketBaseFromCookie() {
  const pb = createPocketBase();
  const storedCookie = cookies().get(AUTH_COOKIE_NAME)?.value;

  if (!storedCookie) {
    return pb;
  }

  try {
    pb.authStore.loadFromCookie(
      `${AUTH_COOKIE_NAME}=${storedCookie}`,
      AUTH_COOKIE_NAME,
    );
  } catch {
    pb.authStore.clear();
  }

  return pb;
}

export function persistPocketBaseAuth(pb: PocketBase) {
  cookies().set(
    AUTH_COOKIE_NAME,
    JSON.stringify({
      token: pb.authStore.token,
      record: pb.authStore.record,
    }),
    {
      httpOnly: true,
      secure: isSecureCookie(),
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 14,
    },
  );
}

export function clearPocketBaseAuth() {
  cookies().set(AUTH_COOKIE_NAME, "", {
    httpOnly: true,
    secure: isSecureCookie(),
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export async function requireAdminPocketBase() {
  const pb = createPocketBaseFromCookie();

  if (!pb.authStore.isValid) {
    throw new Error("UNAUTHORIZED");
  }

  try {
    await pb.collection("admins").authRefresh();
  } catch {
    pb.authStore.clear();
    throw new Error("UNAUTHORIZED");
  }

  return pb;
}
