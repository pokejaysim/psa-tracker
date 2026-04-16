"use client";

import { useEffect, useState, useCallback } from "react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from "@hello-pangea/dnd";
import { Submission, SubmissionStatus } from "@/types";
import { SUBMISSION_STAGES, getServiceLevelInfo } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import Link from "next/link";
import { differenceInDays } from "date-fns";
import { Clock, CreditCard } from "lucide-react";

export default function KanbanPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(() => {
    fetch("/api/submissions")
      .then((r) => r.json())
      .then((data) => {
        setSubmissions(data);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleDragEnd(result: DropResult) {
    if (!result.destination) return;
    const { draggableId, destination } = result;
    const newStatus = destination.droppableId as SubmissionStatus;

    setSubmissions((prev) =>
      prev.map((s) => (s.id === draggableId ? { ...s, status: newStatus } : s))
    );

    const res = await fetch(`/api/submissions/${draggableId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });

    if (!res.ok) {
      toast.error("Failed to update status");
      loadData();
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-4 w-56 mt-2" />
        </div>
        <div className="flex gap-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-96 w-64 shrink-0 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  const columns = SUBMISSION_STAGES.map((stage) => ({
    ...stage,
    items: submissions.filter((s) => s.status === stage.key),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Kanban Board</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Drag submissions between stages to update status
        </p>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <ScrollArea className="w-full">
          <div className="flex gap-4 pb-4 min-w-max">
            {columns.map((col) => (
              <div key={col.key} className="w-[260px] shrink-0">
                {/* Column header */}
                <div className="flex items-center gap-2.5 mb-3 px-1">
                  <div
                    className={`h-2.5 w-2.5 rounded-full ${col.color.replace(
                      "text-",
                      "bg-"
                    )}`}
                  />
                  <span className="text-[13px] font-semibold tracking-tight">
                    {col.label}
                  </span>
                  {col.items.length > 0 && (
                    <span className="ml-auto text-[11px] font-semibold text-muted-foreground bg-muted rounded-full h-5 w-5 flex items-center justify-center">
                      {col.items.length}
                    </span>
                  )}
                </div>

                <Droppable droppableId={col.key}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`min-h-[180px] rounded-2xl p-2 space-y-2.5 transition-all duration-200 ${
                        snapshot.isDraggingOver
                          ? "bg-indigo-500/5 ring-2 ring-indigo-500/20 ring-inset"
                          : "bg-muted/40"
                      }`}
                    >
                      {col.items.map((sub, index) => (
                        <Draggable
                          key={sub.id}
                          draggableId={sub.id}
                          index={index}
                        >
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`rounded-xl border bg-card p-3.5 transition-all duration-200 ${
                                snapshot.isDragging
                                  ? "shadow-xl shadow-indigo-500/10 ring-2 ring-indigo-500/30 rotate-[2deg]"
                                  : "shadow-sm hover:shadow-md hover:border-indigo-500/20"
                              }`}
                            >
                              <Link
                                href={`/submissions/${sub.id}`}
                                className="block"
                              >
                                <p className="font-semibold text-sm tracking-tight">
                                  #{sub.orderNumber}
                                </p>
                                <div className="flex items-center gap-3 mt-2.5">
                                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                                    <CreditCard className="h-3 w-3" />
                                    {sub.totalCards}
                                  </span>
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] h-5 font-medium rounded-md"
                                  >
                                    {getServiceLevelInfo(sub.serviceLevel).label}
                                  </Badge>
                                </div>
                                {sub.submittedDate && (
                                  <div className="flex items-center gap-1 mt-2 text-[11px] text-muted-foreground">
                                    <Clock className="h-3 w-3" />
                                    {differenceInDays(
                                      new Date(),
                                      new Date(sub.submittedDate)
                                    )}{" "}
                                    days
                                  </div>
                                )}
                              </Link>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </DragDropContext>
    </div>
  );
}
