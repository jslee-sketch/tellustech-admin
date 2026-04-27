import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { BannersClient } from "./banners-client";

export const dynamic = "force-dynamic";

export default async function AdminBannersPage() {
  const s = await getSession();
  if (s.role !== "ADMIN" && s.role !== "MANAGER") redirect("/");
  return <BannersClient lang={s.language} />;
}
