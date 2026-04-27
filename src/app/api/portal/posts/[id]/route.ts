import { prisma } from "@/lib/prisma";
import { withSessionContext } from "@/lib/session";
import { notFound, ok, serverError } from "@/lib/api-utils";
import { grantPoints } from "@/lib/portal-points";

// GET /api/portal/posts/[id] — 상세 + 조회수 + 보너스 포인트
export async function GET(_r: Request, ctx: { params: Promise<{ id: string }> }) {
  return withSessionContext(async (session) => {
    const { id } = await ctx.params;
    const post = await prisma.portalPost.findUnique({ where: { id } });
    if (!post || !post.isPublished) return notFound();

    let pointsEarned: number | null = null;
    if (session.role === "CLIENT") {
      const user = await prisma.user.findUnique({ where: { id: session.sub }, select: { clientId: true } });
      if (user?.clientId) {
        try {
          const view = await prisma.portalPostView.upsert({
            where: { postId_clientId: { postId: id, clientId: user.clientId } },
            create: { postId: id, clientId: user.clientId, pointGranted: false },
            update: {},
          });
          // 보너스 포인트 — bonusPoints > 0 이고 아직 적립 전이면 1회 적립
          if (post.bonusPoints > 0 && !view.pointGranted) {
            const granted = await grantPoints({
              clientId: user.clientId,
              reason: "POST_READ_BONUS",
              linkedModel: "PortalPost",
              linkedId: id,
              customAmount: post.bonusPoints,
              reasonDetail: post.titleKo ?? post.titleVi ?? "",
            });
            if (granted) {
              pointsEarned = granted.pointsEarned;
              await prisma.portalPostView.update({ where: { id: view.id }, data: { pointGranted: true } });
            }
          }
          await prisma.portalPost.update({ where: { id }, data: { viewCount: { increment: 1 } } });
        } catch { /* ignore */ }
      }
    }
    try {
      const updated = await prisma.portalPost.findUnique({ where: { id } });
      return ok({ post: updated, pointsEarned });
    } catch (e) { return serverError(e); }
  });
}
