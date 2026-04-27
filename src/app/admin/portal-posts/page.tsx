import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { PostsAdminClient } from "./posts-admin-client";

export const dynamic = "force-dynamic";

export default async function AdminPostsPage() {
  const s = await getSession();
  if (s.role === "CLIENT") redirect("/portal");
  return <PostsAdminClient lang={s.language} />;
}
