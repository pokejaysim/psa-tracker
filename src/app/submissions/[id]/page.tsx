"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { SubmissionWithCards, Card as CardType, CreateCardInput } from "@/types";
import { getStageInfo, getServiceLevelInfo, SUBMISSION_STAGES } from "@/lib/constants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Plus,
  Trash2,
  RefreshCw,
  Truck,
  Calendar as CalendarIcon,
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { toast } from "sonner";

export default function SubmissionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [submission, setSubmission] = useState<SubmissionWithCards | null>(null);
  const [loading, setLoading] = useState(true);
  const [cardDialogOpen, setCardDialogOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [cardForm, setCardForm] = useState({
    year: "",
    brand: "",
    cardNumber: "",
    subject: "",
    variety: "",
    category: "",
    certNumber: "",
    declaredValue: "",
    purchasePrice: "",
  });

  function loadSubmission() {
    fetch(`/api/submissions/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setSubmission(data);
        setLoading(false);
      });
  }

  useEffect(() => {
    loadSubmission();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleAddCard(e: React.FormEvent) {
    e.preventDefault();
    const input: CreateCardInput = {
      submissionId: id,
      lineNumber: (submission?.cards.length ?? 0) + 1,
      year: cardForm.year,
      brand: cardForm.brand,
      cardNumber: cardForm.cardNumber,
      subject: cardForm.subject,
      variety: cardForm.variety,
      category: cardForm.category,
      certNumber: cardForm.certNumber || undefined,
      declaredValue: cardForm.declaredValue
        ? parseFloat(cardForm.declaredValue)
        : 0,
      purchasePrice: cardForm.purchasePrice
        ? parseFloat(cardForm.purchasePrice)
        : undefined,
    };

    const res = await fetch("/api/cards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });

    if (res.ok) {
      toast.success("Card added");
      setCardDialogOpen(false);
      setCardForm({
        year: "",
        brand: "",
        cardNumber: "",
        subject: "",
        variety: "",
        category: "",
        certNumber: "",
        declaredValue: "",
        purchasePrice: "",
      });
      loadSubmission();
    } else {
      toast.error("Failed to add card");
    }
  }

  async function handleDeleteCard(cardId: string) {
    const res = await fetch(`/api/cards/${cardId}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Card removed");
      loadSubmission();
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this submission and all its cards?")) return;
    const res = await fetch(`/api/submissions/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Submission deleted");
      router.push("/submissions");
    }
  }

  async function handleSync() {
    if (!submission) return;
    setSyncing(true);
    try {
      const res = await fetch(
        `/api/psa/order/${submission.orderNumber}`
      );
      if (res.ok) {
        const progress = await res.json();
        toast.success("Synced with PSA");
        loadSubmission();
      } else {
        toast.error("Could not find order on PSA");
      }
    } catch {
      toast.error("Sync failed");
    } finally {
      setSyncing(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!submission) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Submission not found</p>
        <Link href="/submissions" className="text-primary hover:underline text-sm">
          Back to submissions
        </Link>
      </div>
    );
  }

  const stage = getStageInfo(submission.status);
  const service = getServiceLevelInfo(submission.serviceLevel);

  // Build progress steps
  const currentIndex = SUBMISSION_STAGES.findIndex(
    (s) => s.key === submission.status
  );

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/submissions">
            <Button variant="ghost" size="icon" className="rounded-xl">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Order #{submission.orderNumber}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {service.label} &middot; {submission.totalCards} card
              {submission.totalCards !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSync}
            disabled={syncing}
            className="gap-2 rounded-xl"
          >
            <RefreshCw
              className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`}
            />
            Sync
          </Button>
          <Link href={`/submissions/${id}/edit`}>
            <Button variant="outline" size="sm" className="rounded-xl">
              Edit
            </Button>
          </Link>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            className="rounded-xl"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Progress Bar */}
      <Card className="rounded-2xl shadow-sm overflow-hidden">
        <CardContent className="p-6">
          <div className="relative flex items-center justify-between overflow-x-auto gap-1">
            <div className="absolute top-[14px] left-4 right-4 h-[2px] bg-gradient-to-r from-indigo-200 via-purple-200 to-emerald-200 rounded-full" />
            {SUBMISSION_STAGES.map((s, i) => (
              <div key={s.key} className="relative flex flex-col items-center min-w-[60px]">
                <div
                  className={`h-7 w-7 rounded-full flex items-center justify-center z-10 text-[10px] font-bold transition-all ${
                    i <= currentIndex
                      ? `${stage.color.replace("text-", "bg-")} text-white ring-4 ring-white shadow-sm`
                      : "bg-muted text-muted-foreground/60"
                  }`}
                >
                  {i <= currentIndex ? "\u2713" : ""}
                </div>
                <span
                  className={`text-[10px] text-center leading-tight mt-1.5 ${
                    i <= currentIndex
                      ? "text-foreground font-semibold"
                      : "text-muted-foreground/60"
                  }`}
                >
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold tracking-tight">Submission Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status</span>
              <Badge
                variant="secondary"
                className={`${stage.bgColor} ${stage.color} border-0`}
              >
                {stage.label}
              </Badge>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-muted-foreground">Service Level</span>
              <span>{service.label}</span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-muted-foreground">Submitted</span>
              <span className="flex items-center gap-1">
                <CalendarIcon className="h-3 w-3" />
                {submission.submittedDate ? format(new Date(submission.submittedDate), "MMM d, yyyy") : "—"}
              </span>
            </div>
            {submission.receivedDate && (
              <>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Received by PSA</span>
                  <span>
                    {format(new Date(submission.receivedDate), "MMM d, yyyy")}
                  </span>
                </div>
              </>
            )}
            {submission.expectedReturnDate && (
              <>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Expected Return</span>
                  <span>
                    {format(
                      new Date(submission.expectedReturnDate),
                      "MMM d, yyyy"
                    )}
                  </span>
                </div>
              </>
            )}
            {submission.actualReturnDate && (
              <>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Returned</span>
                  <span>
                    {format(
                      new Date(submission.actualReturnDate),
                      "MMM d, yyyy"
                    )}
                  </span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold tracking-tight">Shipping & Value</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Cards</span>
              <span>{submission.totalCards}</span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-muted-foreground">Declared Value</span>
              <span>${submission.totalDeclaredValue.toFixed(2)}</span>
            </div>
            {submission.shipTrackingNumber && (
              <>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Truck className="h-3 w-3" />
                    Tracking
                  </span>
                  <span className="font-mono text-xs">
                    {submission.shipTrackingNumber}
                  </span>
                </div>
              </>
            )}
            {submission.notes && (
              <>
                <Separator />
                <div>
                  <span className="text-muted-foreground block mb-1">Notes</span>
                  <p className="text-sm">{submission.notes}</p>
                </div>
              </>
            )}
            {submission.lastApiSync && (
              <>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Last Synced</span>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(submission.lastApiSync), "MMM d, yyyy h:mm a")}
                  </span>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Cards */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">
            Cards ({submission.cards.length})
          </CardTitle>
          <Dialog open={cardDialogOpen} onOpenChange={setCardDialogOpen}>
            <DialogTrigger
              className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-3"
            >
              <Plus className="h-4 w-4" />
              Add Card
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Card</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddCard} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Year</Label>
                    <Input
                      placeholder="2023"
                      value={cardForm.year}
                      onChange={(e) =>
                        setCardForm((p) => ({ ...p, year: e.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Brand</Label>
                    <Input
                      placeholder="Topps Chrome"
                      value={cardForm.brand}
                      onChange={(e) =>
                        setCardForm((p) => ({ ...p, brand: e.target.value }))
                      }
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Card #</Label>
                    <Input
                      placeholder="150"
                      value={cardForm.cardNumber}
                      onChange={(e) =>
                        setCardForm((p) => ({
                          ...p,
                          cardNumber: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Subject *</Label>
                    <Input
                      placeholder="Shohei Ohtani"
                      value={cardForm.subject}
                      onChange={(e) =>
                        setCardForm((p) => ({
                          ...p,
                          subject: e.target.value,
                        }))
                      }
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Variety</Label>
                    <Input
                      placeholder="Refractor"
                      value={cardForm.variety}
                      onChange={(e) =>
                        setCardForm((p) => ({
                          ...p,
                          variety: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Cert #</Label>
                    <Input
                      placeholder="Optional"
                      value={cardForm.certNumber}
                      onChange={(e) =>
                        setCardForm((p) => ({
                          ...p,
                          certNumber: e.target.value,
                        }))
                      }
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Declared Value ($)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={cardForm.declaredValue}
                      onChange={(e) =>
                        setCardForm((p) => ({
                          ...p,
                          declaredValue: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Purchase Price ($)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={cardForm.purchasePrice}
                      onChange={(e) =>
                        setCardForm((p) => ({
                          ...p,
                          purchasePrice: e.target.value,
                        }))
                      }
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCardDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit">Add Card</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {submission.cards.length === 0 ? (
            <p className="text-center text-muted-foreground py-6 text-sm">
              No cards added yet
            </p>
          ) : (
            <div className="space-y-2">
              {submission.cards.map((card: CardType) => (
                <div
                  key={card.id}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div className="flex items-center gap-4">
                    <span className="text-xs text-muted-foreground font-mono w-6">
                      #{card.lineNumber}
                    </span>
                    <div>
                      <p className="font-medium text-sm">
                        {card.year} {card.brand} {card.subject}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {[card.cardNumber && `#${card.cardNumber}`, card.variety]
                          .filter(Boolean)
                          .join(" · ") || "No details"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {card.grade && (
                      <Badge variant="outline" className="font-mono">
                        PSA {card.grade}
                      </Badge>
                    )}
                    {card.certNumber && (
                      <span className="text-xs text-muted-foreground font-mono">
                        Cert: {card.certNumber}
                      </span>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDeleteCard(card.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
