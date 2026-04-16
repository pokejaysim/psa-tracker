"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { RefreshCw, CheckCircle, XCircle, Shield, Zap, Info } from "lucide-react";

export default function SettingsPage() {
  const [testing, setTesting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<
    "unknown" | "connected" | "error"
  >("unknown");

  async function testConnection() {
    setTesting(true);
    try {
      const res = await fetch("/api/psa/auth", { method: "POST" });
      if (res.ok) {
        setConnectionStatus("connected");
        toast.success("Successfully connected to PSA API");
      } else {
        setConnectionStatus("error");
        toast.error("Failed to connect to PSA API");
      }
    } catch {
      setConnectionStatus("error");
      toast.error("Could not reach PSA API");
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Configure your PSA API connection and preferences
        </p>
      </div>

      <Card className="rounded-2xl shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold tracking-tight">PSA API Configuration</CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Credentials are stored locally in your .env.local file
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="token" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">API Access Token</Label>
            <Input
              id="token"
              type="password"
              placeholder="Set in .env.local as PSA_API_TOKEN"
              disabled
              className="bg-muted/50 rounded-xl"
            />
          </div>

          <div className="p-3 rounded-xl bg-indigo-500/5 border border-indigo-500/10 flex items-start gap-2.5">
            <Info className="h-4 w-4 text-indigo-500 mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground">
              Edit <code className="bg-indigo-500/10 text-indigo-600 px-1.5 py-0.5 rounded font-mono text-[11px]">.env.local</code> in
              your project root to update your API token
            </p>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="text-sm font-medium">Connection:</span>
              {connectionStatus === "connected" && (
                <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 gap-1 rounded-lg">
                  <CheckCircle className="h-3 w-3" />
                  Connected
                </Badge>
              )}
              {connectionStatus === "error" && (
                <Badge className="bg-red-500/10 text-red-600 border-red-500/20 gap-1 rounded-lg">
                  <XCircle className="h-3 w-3" />
                  Error
                </Badge>
              )}
              {connectionStatus === "unknown" && (
                <Badge variant="secondary" className="rounded-lg">Not tested</Badge>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={testConnection}
              disabled={testing}
              className="gap-2 rounded-xl"
            >
              <RefreshCw
                className={`h-4 w-4 ${testing ? "animate-spin" : ""}`}
              />
              Test Connection
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/25">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold tracking-tight">API Usage</CardTitle>
              <CardDescription className="text-xs mt-0.5">
                PSA&apos;s free tier allows 100 API calls per day
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Order progress check</span>
              <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded-md">1 call</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Certificate lookup</span>
              <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded-md">1 call</span>
            </div>
            <Separator />
            <p className="text-xs text-muted-foreground">
              Use &quot;Sync with PSA&quot; in the sidebar to batch-sync all active submissions at once.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl shadow-sm">
        <CardContent className="p-5">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <Zap className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold">PSA Tracker v1.0.0</p>
              <p className="text-xs text-muted-foreground">
                Built with Next.js, shadcn/ui, SQLite & PSA Public API
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
