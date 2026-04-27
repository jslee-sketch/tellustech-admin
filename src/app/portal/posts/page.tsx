import { getSession } from "@/lib/session";
import { PostsClient } from "./posts-client";

export const dynamic = "force-dynamic";

export default async function PostsPage() {
  const s = await getSession();
  return <PostsClient lang={s.language} />;
}
