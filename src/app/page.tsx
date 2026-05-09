import { redirect } from "next/navigation";
import { auth, signOut } from "@/lib/auth";
import { supabase, type Project, type Report } from "@/lib/supabase";
import DashboardFilter from "./DashboardFilter";

export const dynamic = "force-dynamic";

const ALLOWED_EMAIL = process.env.ALLOWED_EMAIL;

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");
  if (ALLOWED_EMAIL && session.user.email !== ALLOWED_EMAIL) {
    return (
      <main className="min-h-screen flex items-center justify-center p-8">
        <div className="text-center space-y-3">
          <p className="text-gray-700">접근 권한이 없는 계정입니다.</p>
          <p className="text-xs text-gray-500">{session.user.email}</p>
          <form action={async () => { "use server"; await signOut({ redirectTo: "/login" }); }}>
            <button className="text-sm underline text-gray-600">다른 계정으로 로그인</button>
          </form>
        </div>
      </main>
    );
  }

  const { data: projects } = await supabase
    .from("projects")
    .select("*")
    .order("updated_at", { ascending: false });

  const slugs = (projects ?? []).map((p) => p.slug);
  const { data: latestReports } = slugs.length
    ? await supabase
        .from("reports")
        .select("*")
        .in("project_slug", slugs)
        .order("created_at", { ascending: false })
    : { data: [] as Report[] };

  const latestBySlug: Record<string, Report> = {};
  for (const r of (latestReports ?? []) as Report[]) {
    if (!latestBySlug[r.project_slug]) latestBySlug[r.project_slug] = r;
  }

  const projectList = (projects ?? []) as Project[];
  const unreviewedCount = Object.values(latestBySlug).filter(
    (r) => r.review_status === "unreviewed"
  ).length;

  const avgProgress = projectList.length > 0
    ? Math.round(projectList.reduce((sum, p) => sum + p.progress_percent, 0) / projectList.length)
    : 0;

  const stats = {
    total: projectList.length,
    active: projectList.filter((p) => p.status === "active").length,
    paused: projectList.filter((p) => p.status === "paused").length,
    unreviewed: unreviewedCount,
    avgProgress,
  };

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">프로젝트 리포트 허브</h1>
            <p className="text-sm text-gray-500">총 {projectList.length}개 프로젝트</p>
          </div>
          <form action={async () => { "use server"; await signOut({ redirectTo: "/login" }); }}>
            <button className="text-sm text-gray-600 underline">로그아웃 ({session.user.email})</button>
          </form>
        </header>

        {projectList.length === 0 ? (
          <div className="bg-white rounded-2xl p-10 text-center text-gray-500 shadow-sm">
            아직 수신된 리포트가 없습니다.<br />
            각 프로젝트에서 <code className="bg-gray-100 px-1 rounded">/bye</code> 실행 시 자동 수집됩니다.
          </div>
        ) : (
          <DashboardFilter
            projects={projectList}
            latestBySlug={latestBySlug}
            stats={stats}
          />
        )}
      </div>
    </main>
  );
}
