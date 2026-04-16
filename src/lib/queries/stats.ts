import { getDb } from "@/lib/db";
import { DashboardStats, SubmissionStatus } from "@/types";

export function getDashboardStats(): DashboardStats {
  const db = getDb();

  const totals = db
    .prepare(
      `SELECT
        COUNT(*) as totalSubmissions,
        COALESCE(SUM(totalCards), 0) as totalCards
      FROM submissions`
    )
    .get() as { totalSubmissions: number; totalCards: number };

  const active = db
    .prepare(
      `SELECT COUNT(*) as count FROM submissions WHERE status NOT IN ('delivered', 'preparing')`
    )
    .get() as { count: number };

  const grading = db
    .prepare(
      `SELECT COALESCE(SUM(totalCards), 0) as count FROM submissions WHERE status IN ('arrived', 'research_id', 'grading', 'assembly', 'grades_ready', 'qa_checks', 'processing')`
    )
    .get() as { count: number };

  const avgGrade = db
    .prepare(
      `SELECT AVG(CAST(grade AS REAL)) as avg FROM cards WHERE grade IS NOT NULL AND grade GLOB '[0-9]*'`
    )
    .get() as { avg: number | null };

  const gradeDistribution = db
    .prepare(
      `SELECT grade, COUNT(*) as count FROM cards WHERE grade IS NOT NULL GROUP BY grade ORDER BY count DESC`
    )
    .all() as { grade: string; count: number }[];

  const statusCounts = db
    .prepare(
      `SELECT status, COUNT(*) as count FROM submissions GROUP BY status ORDER BY count DESC`
    )
    .all() as { status: SubmissionStatus; count: number }[];

  return {
    totalSubmissions: totals.totalSubmissions,
    totalCards: totals.totalCards,
    activeSubmissions: active.count,
    cardsGrading: grading.count,
    averageGrade: avgGrade.avg ? Math.round(avgGrade.avg * 10) / 10 : null,
    gradeDistribution,
    statusCounts,
  };
}
