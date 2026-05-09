"use client";

import { useState } from "react";
import Link from "next/link";
import type { Project, Report } from "@/lib/supabase";

type Filter = "all" | "active" | "paused" | "archived";

const TABS: { key: Filter; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "active", label: "진행중" },
  { key: "paused", label: "보류" },
  { key: "archived", label: "종료" },
];

export default function DashboardFilter({
  projects,
  latestBySlug,
  stats,
}: {
  projects: Project[];
  latestBySlug: Record<string, Report>;
  stats: { total: number; active: number; paused: number; unreviewed: number; avgProgress: number };
}) {
  const [filter, setFilter] = useState<Filter>("all");

  const filtered =
    filter === "all"
      ? projects
      : projects.filter((p) => p.status === filter);

  return (
    <>
      {/* 전체 포트폴리오 진행률 요약 */}
      <div className="bg-white rounded-xl border p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-xs text-gray-500 mb-1">전체 포트폴리오 평균 진행률</p>
            <p className="text-4xl font-bold text-gray-900">{stats.avgProgress}%</p>
          </div>
          <div className="text-right text-xs text-gray-400 leading-6">
            <p>전체 {stats.total}개 프로젝트</p>
            <p>{stats.active}개 진행중 · {stats.paused}개 보류</p>
            <p>미확인 리포트 <span className={stats.unreviewed > 0 ? "text-red-500 font-semibold" : ""}>{stats.unreviewed}건</span></p>
          </div>
        </div>
        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-400 to-blue-600 transition-all duration-500"
            style={{ width: `${stats.avgProgress}%` }}
          />
        </div>
      </div>

      {/* 통계 바 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="전체 프로젝트" value={stats.total} color="gray" />
        <StatCard label="진행중" value={stats.active} color="green" />
        <StatCard label="보류" value={stats.paused} color="yellow" />
        <StatCard label="미확인 리포트" value={stats.unreviewed} color="red" />
      </div>

      {/* 필터 탭 */}
      <div className="flex gap-1 bg-white rounded-lg p-1 shadow-sm w-fit">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setFilter(t.key)}
            className={`text-sm px-3 py-1.5 rounded-md transition ${
              filter === t.key
                ? "bg-gray-900 text-white font-medium"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            {t.label}
            {t.key !== "all" && (
              <span className="ml-1 text-xs opacity-70">
                {projects.filter((p) => p.status === t.key).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* 프로젝트 그리드 */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 text-center text-gray-500 shadow-sm">
          해당 상태의 프로젝트가 없습니다.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((p) => {
            const r = latestBySlug[p.slug];
            return (
              <Link
                key={p.slug}
                href={`/${p.slug}`}
                className="bg-white rounded-2xl shadow-sm hover:shadow-md transition p-5 space-y-3 block"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="font-semibold text-lg">{p.name}</h2>
                    <p className="text-xs text-gray-500">{p.slug}</p>
                  </div>
                  <StatusBadge status={p.status} />
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                    <span>진행률</span>
                    <span className="font-medium">{p.progress_percent}%</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 transition-all"
                      style={{ width: `${p.progress_percent}%` }}
                    />
                  </div>
                </div>

                {r ? (
                  <div className="text-xs text-gray-600 space-y-1 pt-2 border-t">
                    <div className="flex items-center justify-between">
                      <p className="text-gray-400">최근: {r.report_date}</p>
                      <ReviewBadge status={r.review_status} />
                    </div>
                    {r.today_work && (
                      <p className="line-clamp-2">
                        <span className="text-gray-400">오늘: </span>
                        {r.today_work}
                      </p>
                    )}
                    {r.next_work && (
                      <p className="line-clamp-2">
                        <span className="text-gray-400">다음: </span>
                        {r.next_work}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 pt-2 border-t">리포트 없음</p>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: "gray" | "green" | "yellow" | "red";
}) {
  const cls = {
    gray: "bg-white",
    green: "bg-green-50 border-green-100",
    yellow: "bg-yellow-50 border-yellow-100",
    red: "bg-red-50 border-red-100",
  }[color];
  const numCls = {
    gray: "text-gray-900",
    green: "text-green-700",
    yellow: "text-yellow-700",
    red: "text-red-700",
  }[color];

  return (
    <div className={`rounded-xl border p-4 shadow-sm ${cls}`}>
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`text-2xl font-bold ${numCls}`}>{value}</p>
    </div>
  );
}

function ReviewBadge({ status }: { status: Report["review_status"] }) {
  const map = {
    unreviewed: { text: "미확인", cls: "bg-gray-200 text-gray-700" },
    pending: { text: "적용전", cls: "bg-amber-100 text-amber-800" },
    reviewed: { text: "확인", cls: "bg-blue-100 text-blue-800" },
    applied: { text: "적용완료", cls: "bg-green-100 text-green-800" },
  };
  const s = map[status] ?? map.unreviewed;
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${s.cls}`}>
      {s.text}
    </span>
  );
}

function StatusBadge({ status }: { status: Project["status"] }) {
  const map = {
    active: { text: "진행중", cls: "bg-green-100 text-green-700" },
    paused: { text: "보류", cls: "bg-yellow-100 text-yellow-700" },
    archived: { text: "종료", cls: "bg-gray-200 text-gray-600" },
  };
  const s = map[status] ?? map.active;
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full ${s.cls}`}>{s.text}</span>
  );
}
