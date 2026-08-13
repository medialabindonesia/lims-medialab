"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Mail,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  User,
  Calendar,
} from "lucide-react";

interface EmailHistoryItem {
  id: string;
  status: "DRAFT" | "SENDING" | "SENT" | "FAILED";
  toEmail: string;
  ccEmails: string[] | null;
  subject: string;
  sentAt: string | null;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
  createdByName: string | null;
  sentByName: string | null;
}

interface EmailHistoryProps {
  quotationId: string;
  trigger?: React.ReactNode;
}

function formatStatus(status: EmailHistoryItem["status"]) {
  switch (status) {
    case "DRAFT":
      return { label: "Draf", color: "bg-gray-100 text-gray-700", icon: Clock };
    case "SENDING":
      return {
        label: "Mengirim...",
        color: "bg-blue-100 text-blue-700",
        icon: Clock,
      };
    case "SENT":
      return {
        label: "Terkirim",
        color: "bg-green-100 text-green-700",
        icon: CheckCircle,
      };
    case "FAILED":
      return {
        label: "Gagal",
        color: "bg-red-100 text-red-700",
        icon: XCircle,
      };
  }
}

function formatDateTime(dateStr: string | null) {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function QuotationEmailHistory({
  quotationId,
  trigger,
}: EmailHistoryProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [emails, setEmails] = useState<EmailHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch email history when dialog opens
  useEffect(() => {
    if (!isOpen) return;

    setIsLoading(true);
    setError(null);

    fetch(`/api/quotations/${quotationId}/emails`)
      .then((res) => {
        if (!res.ok) throw new Error("Gagal memuat riwayat email");
        return res.json();
      })
      .then((data) => {
        setEmails(data.emails || []);
      })
      .catch((err) => {
        setError(err.message);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [isOpen, quotationId]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Mail className="h-4 w-4 mr-2" />
            Riwayat Email
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Riwayat Email
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 max-h-96 overflow-y-auto">
          {isLoading && (
            <div className="text-center py-8 text-muted-foreground">
              Memuat riwayat email...
            </div>
          )}

          {error && (
            <div className="text-center py-8 text-red-500">
              <AlertCircle className="h-8 w-8 mx-auto mb-2" />
              {error}
            </div>
          )}

          {!isLoading && !error && emails.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              Belum ada email yang dikirim
            </div>
          )}

          {!isLoading && !error && emails.length > 0 && (
            emails.map((email) => {
              const statusInfo = formatStatus(email.status);
              const StatusIcon = statusInfo.icon;

              return (
                <Card key={email.id} className="border">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge className={statusInfo.color}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {statusInfo.label}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {formatDateTime(email.sentAt || email.createdAt)}
                          </span>
                        </div>

                        <div className="text-sm">
                          <span className="text-muted-foreground">Ke: </span>
                          <span className="font-medium">{email.toEmail}</span>
                          {email.ccEmails && email.ccEmails.length > 0 && (
                            <span className="text-muted-foreground">
                              {" "}
                              (CC: {email.ccEmails.join(", ")})
                            </span>
                          )}
                        </div>

                        {email.subject && (
                          <div className="text-sm">
                            <span className="text-muted-foreground">
                              Subjek:{" "}
                            </span>
                            <span>{email.subject}</span>
                          </div>
                        )}

                        {email.sentByName && (
                          <div className="text-sm text-muted-foreground flex items-center gap-1">
                            <User className="h-3 w-3" />
                            Dikirim oleh: {email.sentByName}
                          </div>
                        )}
                      </div>
                    </div>

                    {email.status === "FAILED" && email.lastError && (
                      <div className="mt-3 p-3 bg-red-50 rounded text-sm text-red-700">
                        <strong>Error:</strong> {email.lastError}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
