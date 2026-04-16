"use client";

import { useEffect, useState } from "react";
import { DashboardStats, Submission } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { SUBMISSION_STAGES, getStageInfo, getServiceLevelInfo } from "@/lib/constants";
import {
  ClipboardList,
  CreditCard,
  Loader,
  Star,
  Plus,
  ArrowUpRight,
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";

const gradients = [
  "from-indigo-500 to-blue-600",
  "from-violet-500 to-purple-600",
  "from-amber-500 to-orange-600",
  "from-emerald-500 to-teal-600",
];

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/stats").then((r) => r.json()),
      fetch("/api/submissions").then((r) => r.json()),
    ]).then(([s, sub]) => {
      setStats(s);
      setSubmissions(sub);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-4 w-56 mt-2" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-24 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  const statCards = [
    {
      title: "Total Submissions",
      value: stats?.totalSubmissions ?? 0,
      icon: ClipboardList,
      gradient: gradients[0],
    },
    {
      title: "Total Cards",
      value: stats?.totalCards ?? 0,
      icon: CreditCard,
      gradient: gradients[1],
    },
    {
      title: "Currently Active",
      value: stats?.activeSubmissions ?? 0,
      icon: Loader,
      gradient: gradients[2],
    },
    {
      title: "Average Grade",
      value: stats?.averageGrade ?? "N/A",
      icon: Star,
      gradient: gradients[3],
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Overview of your PSA card submissions
          </p>
        </div>
        <Link
          href="/submissions/new"
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all duration-200 hover:-translate-y-0.5"
        >
          <Plus className="h-4 w-4" />
          New Submission
        </Link>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {statCards.map((stat) => (
          <div
            key={stat.title}
            className="relative group overflow-hidden rounded-2xl bg-card border shadow-sm hover:shadow-md transition-all duration-300"
          >
            <div className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[13px] font-medium text-muted-foreground">
                    {stat.title}
                  </p>
                  <p className="text-3xl font-bold mt-2 tracking-tight">
                    {stat.value}
                  </p>
                </div>
                <div
                  className={`h-11 w-11 rounded-xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center shadow-lg`}
                >
                  <stat.icon className="h-5 w-5 text-white" />
                </div>
              </div>
            </div>
            <div
              className={`h-1 bg-gradient-to-r ${stat.gradient} opacity-80`}
            />
          </div>
        ))}
      </div>

      {/* Status Pipeline */}
      <Card className="rounded-2xl shadow-sm border overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold tracking-tight">
            Status Pipeline
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-5">
          <div className="relative flex items-center gap-0 overflow-x-auto pb-2">
            {/* Background connector line */}
            <div className="absolute top-[18px] left-4 right-4 h-[2px] bg-gradient-to-r from-slate-200 via-indigo-200 to-emerald-200 rounded-full" />

            {SUBMISSION_STAGES.map((stage) => {
              const count =
                stats?.statusCounts.find((s) => s.status === stage.key)?.count ?? 0;
              const hasItems = count > 0;
              return (
                <div
                  key={stage.key}
                  className="relative flex flex-col items-center flex-1 min-w-[70px]"
                >
                  <div
                    className={cn(
                      "h-9 w-9 rounded-full flex items-center justify-center text-xs font-bold z-10 transition-all duration-300",
                      hasItems
                        ? `${stage.bgColor} ${stage.color} ring-4 ring-white shadow-md`
                        : "bg-muted text-muted-foreground/60"
                    )}
                  >
                    {count}
                  </div>
                  <span
                    className={cn(
                      "text-[10px] mt-2 text-center leading-tight font-medium",
                      hasItems ? "text-foreground" : "text-muted-foreground/60"
                    )}
                  >
                    {stage.label}
                  </span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Recent Submissions */}
      <Card className="rounded-2xl shadow-sm border">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base font-semibold tracking-tight">
            Recent Submissions
          </CardTitle>
          {submissions.length > 0 && (
            <Link
              href="/submissions"
              className="text-xs font-medium text-indigo-500 hover:text-indigo-600 flex items-center gap-0.5 transition-colors"
            >
              View all <ArrowUpRight className="h-3 w-3" />
            </Link>
          )}
        </CardHeader>
        <CardContent>
          {submissions.length === 0 ? (
            <div className="text-center py-12">
              <div className="h-16 w-16 mx-auto rounded-2xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 flex items-center justify-center mb-4">
                <ClipboardList className="h-7 w-7 text-indigo-500" />
              </div>
              <p className="font-medium text-foreground">No submissions yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Create your first submission to start tracking
              </p>
              <Link
                href="/submissions/new"
                className="inline-flex items-center gap-1.5 mt-4 px-4 py-2 rounded-lg bg-indigo-500/10 text-indigo-600 text-sm font-medium hover:bg-indigo-500/20 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                New Submission
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {submissions.slice(0, 5).map((sub) => {
                const stage = getStageInfo(sub.status);
                const service = getServiceLevelInfo(sub.serviceLevel);
                return (
                  <Link
                    key={sub.id}
                    href={`/submissions/${sub.id}`}
                    className="flex items-center justify-between p-3.5 rounded-xl border hover:bg-accent/50 hover:border-indigo-500/20 transition-all duration-200 group"
                  >
                    <div className="flex items-center gap-3.5">
                      <div
                        className={`h-10 w-10 rounded-xl ${stage.bgColor} flex items-center justify-center`}
                      >
                        <div
                          className={`h-2.5 w-2.5 rounded-full ${stage.color.replace(
                            "text-",
                            "bg-"
                          )}`}
                        />
                      </div>
                      <div>
                        <p className="font-semibold text-sm group-hover:text-indigo-600 transition-colors">
                          Order #{sub.orderNumber}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {sub.totalCards} card{sub.totalCards !== 1 ? "s" : ""} &middot;{" "}
                          {service.label} &middot;{" "}
                          {format(new Date(sub.submittedDate), "MMM d, yyyy")}
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant="secondary"
                      className={`${stage.bgColor} ${stage.color} border-0 text-xs font-medium rounded-lg px-2.5`}
                    >
                      {stage.label}
                    </Badge>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}
