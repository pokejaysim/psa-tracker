import { ServiceLevel, SubmissionStatus } from "@/types";

export const SUBMISSION_STAGES: {
  key: SubmissionStatus;
  label: string;
  color: string;
  bgColor: string;
  icon: string;
}[] = [
  { key: "preparing", label: "Preparing", color: "text-slate-500", bgColor: "bg-slate-100", icon: "Package" },
  { key: "submitted", label: "Submitted", color: "text-blue-500", bgColor: "bg-blue-100", icon: "Send" },
  { key: "arrived", label: "Arrived", color: "text-indigo-500", bgColor: "bg-indigo-100", icon: "Inbox" },
  { key: "research_id", label: "Research & ID", color: "text-violet-500", bgColor: "bg-violet-100", icon: "Search" },
  { key: "grading", label: "Grading", color: "text-purple-500", bgColor: "bg-purple-100", icon: "Star" },
  { key: "assembly", label: "Assembly", color: "text-fuchsia-500", bgColor: "bg-fuchsia-100", icon: "Wrench" },
  { key: "grades_ready", label: "Grades Ready", color: "text-amber-500", bgColor: "bg-amber-100", icon: "Eye" },
  { key: "qa_checks", label: "QA Checks", color: "text-orange-500", bgColor: "bg-orange-100", icon: "ShieldCheck" },
  { key: "processing", label: "Processing", color: "text-cyan-500", bgColor: "bg-cyan-100", icon: "Loader" },
  { key: "shipped", label: "Shipped", color: "text-emerald-500", bgColor: "bg-emerald-100", icon: "Truck" },
  { key: "delivered", label: "Delivered", color: "text-green-600", bgColor: "bg-green-100", icon: "CheckCircle" },
];

export const SERVICE_LEVELS: {
  key: ServiceLevel;
  label: string;
  turnaround: string;
}[] = [
  { key: "value_bulk", label: "Value Bulk", turnaround: "150 business days" },
  { key: "value", label: "Value", turnaround: "120 business days" },
  { key: "value_plus", label: "Value Plus", turnaround: "70 business days" },
  { key: "value_max", label: "Value Max", turnaround: "50 business days" },
  { key: "regular", label: "Regular", turnaround: "30 business days" },
  { key: "express", label: "Express", turnaround: "15 business days" },
  { key: "super_express", label: "Super Express", turnaround: "5 business days" },
  { key: "walk_through", label: "Walk-Through", turnaround: "2 business days" },
];

export const PSA_STEP_MAP: Record<number, SubmissionStatus> = {
  0: "arrived",
  1: "research_id",
  2: "grading",
  3: "assembly",
  4: "grades_ready",
  5: "qa_checks",
  6: "processing",
  7: "shipped",
  8: "delivered",
};

export function getStageInfo(status: SubmissionStatus) {
  return SUBMISSION_STAGES.find((s) => s.key === status) ?? SUBMISSION_STAGES[0];
}

export function getServiceLevelInfo(level: ServiceLevel) {
  return SERVICE_LEVELS.find((s) => s.key === level) ?? SERVICE_LEVELS[0];
}

export function getStatusIndex(status: SubmissionStatus): number {
  return SUBMISSION_STAGES.findIndex((s) => s.key === status);
}
