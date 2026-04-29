import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { CompatSearchClient } from "./compat-search-client";

export const dynamic = "force-dynamic";

export default async function ItemCompatPage() {
  const s = await getSession();
  if (s.role !== "ADMIN" && s.role !== "MANAGER") redirect("/");
  return <CompatSearchClient lang={s.language} />;
}
