import { redirect } from "next/navigation";
import { data } from "@/lib/data";
import type { User } from "@/lib/data/schemas";
import { getSessionUserId } from "./session";

/** The logged-in user for an owner-area page, or a redirect to log in and come back to `path`. */
export async function requireUser(path: string): Promise<User> {
  const id = await getSessionUserId();
  const user = id ? await data.getUser(id) : null;
  if (!user) redirect(`/login?next=${encodeURIComponent(path)}`);
  return user;
}
