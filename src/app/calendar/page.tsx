"use client";

import { useEffect, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import { Submission } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useRouter } from "next/navigation";

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  backgroundColor: string;
  borderColor: string;
  extendedProps: {
    submissionId: string;
    type: "submitted" | "expected" | "returned";
  };
}

export default function CalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/submissions")
      .then((r) => r.json())
      .then((submissions: Submission[]) => {
        const calEvents: CalendarEvent[] = [];

        submissions.forEach((sub) => {
          if (sub.submittedDate) {
            calEvents.push({
              id: `${sub.id}-submitted`,
              title: `Submitted: #${sub.orderNumber}`,
              start: sub.submittedDate,
              backgroundColor: "#6366f1",
              borderColor: "#6366f1",
              extendedProps: { submissionId: sub.id, type: "submitted" },
            });
          }

          if (sub.expectedReturnDate) {
            calEvents.push({
              id: `${sub.id}-expected`,
              title: `Expected: #${sub.orderNumber}`,
              start: sub.expectedReturnDate,
              backgroundColor: "#f59e0b",
              borderColor: "#f59e0b",
              extendedProps: { submissionId: sub.id, type: "expected" },
            });
          }

          if (sub.actualReturnDate) {
            calEvents.push({
              id: `${sub.id}-returned`,
              title: `Returned: #${sub.orderNumber}`,
              start: sub.actualReturnDate,
              backgroundColor: "#10b981",
              borderColor: "#10b981",
              extendedProps: { submissionId: sub.id, type: "returned" },
            });
          }
        });

        setEvents(calEvents);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-56 mt-2" />
        </div>
        <Skeleton className="h-[600px] rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Calendar</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            View submission dates and expected returns
          </p>
        </div>
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-2">
            <div className="h-2.5 w-2.5 rounded-full bg-indigo-500" />
            <span className="text-xs font-medium text-muted-foreground">Submitted</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2.5 w-2.5 rounded-full bg-amber-500" />
            <span className="text-xs font-medium text-muted-foreground">Expected Return</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
            <span className="text-xs font-medium text-muted-foreground">Returned</span>
          </div>
        </div>
      </div>

      <Card className="rounded-2xl shadow-sm border">
        <CardContent className="p-5">
          <FullCalendar
            plugins={[dayGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            events={events}
            eventClick={(info) => {
              const subId = info.event.extendedProps.submissionId;
              router.push(`/submissions/${subId}`);
            }}
            headerToolbar={{
              left: "prev,next today",
              center: "title",
              right: "dayGridMonth,dayGridWeek",
            }}
            height="auto"
            eventDisplay="block"
            dayMaxEvents={3}
          />
        </CardContent>
      </Card>
    </div>
  );
}
