"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { Submission } from "@/types";
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
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function EditSubmissionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch(`/api/submissions/${id}`)
      .then((r) => r.json())
      .then((data: Submission) => {
        setForm({
          orderNumber: data.orderNumber,
          submissionNumber: data.submissionNumber ?? "",
          serviceLevel: data.serviceLevel,
          status: data.status,
          submittedDate: data.submittedDate.split("T")[0],
          receivedDate: data.receivedDate?.split("T")[0] ?? "",
          expectedReturnDate: data.expectedReturnDate?.split("T")[0] ?? "",
          actualReturnDate: data.actualReturnDate?.split("T")[0] ?? "",
          totalDeclaredValue: String(data.totalDeclaredValue || ""),
          notes: data.notes,
        });
        setLoading(false);
      });
  }, [id]);

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/submissions/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          submissionNumber: form.submissionNumber || null,
          receivedDate: form.receivedDate || null,
          expectedReturnDate: form.expectedReturnDate || null,
          actualReturnDate: form.actualReturnDate || null,
          totalDeclaredValue: form.totalDeclaredValue
            ? parseFloat(form.totalDeclaredValue)
            : 0,
        }),
      });

      if (res.ok) {
        toast.success("Submission updated");
        router.push(`/submissions/${id}`);
      } else {
        toast.error("Failed to update");
      }
    } catch {
      toast.error("An error occurred");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 max-w-2xl">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Link href={`/submissions/${id}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">Edit Submission</h1>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Submission Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Order Number</Label>
                <Input
                  value={form.orderNumber ?? ""}
                  onChange={(e) => updateField("orderNumber", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Submission Number</Label>
                <Input
                  value={form.submissionNumber ?? ""}
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
                        {sl.label}
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
                <Label>Submitted Date</Label>
                <Input
                  type="date"
                  value={form.submittedDate ?? ""}
                  onChange={(e) => updateField("submittedDate", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Received Date</Label>
                <Input
                  type="date"
                  value={form.receivedDate ?? ""}
                  onChange={(e) => updateField("receivedDate", e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Expected Return Date</Label>
                <Input
                  type="date"
                  value={form.expectedReturnDate ?? ""}
                  onChange={(e) =>
                    updateField("expectedReturnDate", e.target.value)
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Actual Return Date</Label>
                <Input
                  type="date"
                  value={form.actualReturnDate ?? ""}
                  onChange={(e) =>
                    updateField("actualReturnDate", e.target.value)
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Total Declared Value ($)</Label>
              <Input
                type="number"
                step="0.01"
                value={form.totalDeclaredValue ?? ""}
                onChange={(e) =>
                  updateField("totalDeclaredValue", e.target.value)
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={form.notes ?? ""}
                onChange={(e) => updateField("notes", e.target.value)}
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Link href={`/submissions/${id}`}>
                <Button variant="outline" type="button">
                  Cancel
                </Button>
              </Link>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
