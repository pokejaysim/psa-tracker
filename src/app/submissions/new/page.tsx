"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SERVICE_LEVELS, SUBMISSION_STAGES } from "@/lib/constants";
import { ServiceLevel, SubmissionStatus } from "@/types";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function NewSubmissionPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    orderNumber: "",
    submissionNumber: "",
    serviceLevel: "regular" as ServiceLevel,
    status: "preparing" as SubmissionStatus,
    submittedDate: new Date().toISOString().split("T")[0],
    expectedReturnDate: "",
    totalDeclaredValue: "",
    notes: "",
  });

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.orderNumber) {
      toast.error("Order number is required");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          submissionNumber: form.submissionNumber || undefined,
          expectedReturnDate: form.expectedReturnDate || undefined,
          totalDeclaredValue: form.totalDeclaredValue
            ? parseFloat(form.totalDeclaredValue)
            : 0,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        toast.success("Submission created");
        router.push(`/submissions/${data.id}`);
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to create submission");
      }
    } catch {
      toast.error("An error occurred");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Link href="/submissions">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">New Submission</h1>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Submission Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="orderNumber">Order Number *</Label>
                <Input
                  id="orderNumber"
                  placeholder="e.g., 65-123456789"
                  value={form.orderNumber}
                  onChange={(e) => updateField("orderNumber", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="submissionNumber">Submission Number</Label>
                <Input
                  id="submissionNumber"
                  placeholder="Optional"
                  value={form.submissionNumber}
                  onChange={(e) =>
                    updateField("submissionNumber", e.target.value)
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Service Level</Label>
                <Select
                  value={form.serviceLevel}
                  onValueChange={(v) => v && updateField("serviceLevel", v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SERVICE_LEVELS.map((sl) => (
                      <SelectItem key={sl.key} value={sl.key}>
                        {sl.label} ({sl.turnaround})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) => v && updateField("status", v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SUBMISSION_STAGES.map((s) => (
                      <SelectItem key={s.key} value={s.key}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="submittedDate">Submitted Date *</Label>
                <Input
                  id="submittedDate"
                  type="date"
                  value={form.submittedDate}
                  onChange={(e) => updateField("submittedDate", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expectedReturnDate">Expected Return Date</Label>
                <Input
                  id="expectedReturnDate"
                  type="date"
                  value={form.expectedReturnDate}
                  onChange={(e) =>
                    updateField("expectedReturnDate", e.target.value)
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="totalDeclaredValue">Total Declared Value ($)</Label>
              <Input
                id="totalDeclaredValue"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={form.totalDeclaredValue}
                onChange={(e) =>
                  updateField("totalDeclaredValue", e.target.value)
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Any additional notes about this submission..."
                value={form.notes}
                onChange={(e) => updateField("notes", e.target.value)}
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Link href="/submissions">
                <Button variant="outline" type="button">
                  Cancel
                </Button>
              </Link>
              <Button type="submit" disabled={saving}>
                {saving ? "Creating..." : "Create Submission"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
