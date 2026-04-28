import { NextResponse } from "next/server";

// GET /api/snmp/agent-version — 에이전트 자동 업데이트 체크용.
// 응답: { latestVersion, downloadUrl, releaseNotes }
//   - 환경변수 AGENT_LATEST_VERSION / AGENT_DOWNLOAD_URL 로 관리.
//   - 미설정 시 1.0.0 (변경 없음). 새 버전 배포 시 환경변수만 갱신하면 전 에이전트 자동 업데이트.
export async function GET() {
  const latestVersion = process.env.AGENT_LATEST_VERSION ?? "1.0.0";
  const downloadUrl = process.env.AGENT_DOWNLOAD_URL ?? "";
  const releaseNotes = process.env.AGENT_RELEASE_NOTES ?? "";
  return NextResponse.json({ latestVersion, downloadUrl, releaseNotes });
}
