"use client";

import { useEffect, useState } from "react";
import { Submission } from "@/types";
import { getStageInfo, getServiceLevelInfo } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Search, ClipboardList, Trash2 } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { toast } from "sonner";

export default function SubmissionsPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetch("/api/submissions")
      .then((r) => r.json())
      .then((data) => {
        setSubmissions(data);
        setLoading(false);
      });
  }, []);

  const filtered = submissions.filter(
    (s) =>
      s.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
      (s.submissionNumber ?? "").toLowerCase().includes(search.toLowerCase()) ||
      s.notes.toLowerCase().includes(search.toLowerCase())
  );

  const allFilteredSelected =
    filtered.length > 0 && filtered.every((s) => selected.has(s.id));

  function toggleAll() {
    if (allFilteredSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((s) => s.id)));
    }
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  async function deleteSelected() {
    if (selected.size === 0) return;
    setDeleting(true);
    try {
      const res = await fetch("/api/submissions", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [...selected] }),
      });
      if (!res.ok) throw new Error("Delete failed");
      const data = await res.json();
      setSubmissions((prev) => prev.filter((s) => !selected.has(s.id)));
      setSelected(new Set());
      toast.success(`Deleted ${data.deleted} submission${data.deleted !== 1 ? "s" : ""}`);
    } catch {
      toast.error("Failed to delete submissions");
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-9 w-36" />
        </div>
        <Skeleton className="h-10 rounded-xl" />
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Submissions</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage all your PSA submissions
          </p>
        </div>
        <Link href="/submissions/new">
          <Button className="gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all duration-200 hover:-translate-y-0.5">
            <Plus className="h-4 w-4" />
            New Submission
          </Button>
        </Link>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by order number, submission number, or notes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-11 rounded-xl bg-card"
          />
        </div>
        {selected.size > 0 && (
          <Button
            variant="destructive"
            size="sm"
            onClick={deleteSelected}
            disabled={deleting}
            className="gap-2 rounded-xl shrink-0"
          >
            <Trash2 className="h-4 w-4" />
            Delete {selected.size}
          </Button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16">
          {submissions.length === 0 ? (
            <>
              <div className="h-16 w-16 mx-auto rounded-2xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 flex items-center justify-center mb-4">
                <ClipboardList className="h-7 w-7 text-indigo-500" />
              </div>
              <p className="font-medium text-foreground text-lg">No submissions yet</p>
              <p className="text-sm text-muted-foreground mt-1.5">
                Create your first submission to get started
              </p>
              <Link
                href="/submissions/new"
                className="inline-flex items-center gap-1.5 mt-4 px-4 py-2 rounded-lg bg-indigo-500/10 text-indigo-600 text-sm font-medium hover:bg-indigo-500/20 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                New Submission
              </Link>
            </>
          ) : (
            <p className="text-muted-foreground">No submissions match your search</p>
          )}
        </div>
      ) : (
        <div className="border rounded-2xl overflow-hidden bg-card shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-10 pl-4">
                  <Checkbox
                    checked={allFilteredSelected}
                    onCheckedChange={toggleAll}
                  />
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Order #</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Service Level</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground text-center">Cards</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Submitted</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Expected Return</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((sub) => {
                const stage = getStageInfo(sub.status);
                const service = getServiceLevelInfo(sub.serviceLevel);
                const isSelected = selected.has(sub.id);
                return (
                  <TableRow
                    key={sub.id}
                    className={`cursor-pointer group ${isSelected ? "bg-indigo-500/5" : ""}`}
                  >
                    <TableCell className="pl-4">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleOne(sub.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/submissions/${sub.id}`}
                        className="font-semibold text-sm hover:text-indigo-600 transition-colors"
                      >
                        {sub.orderNumber}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={`${stage.bgColor} ${stage.color} border-0 font-medium rounded-lg`}
                      >
                        {stage.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {service.label}
                    </TableCell>
                    <TableCell className="text-center text-sm font-medium">{sub.totalCards}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {sub.submittedDate ? format(new Date(sub.submittedDate), "MMM d, yyyy") : "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {sub.expectedReturnDate
                        ? format(new Date(sub.expectedReturnDate), "MMM d, yyyy")
                        : <span className="text-muted-foreground/40">--</span>}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
