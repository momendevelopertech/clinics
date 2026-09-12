"use client";

import { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MessageCircle, Mail, MessageSquare, Phone } from "lucide-react";
import { AddCommunicationDialog } from "@/components/communications/add-communication-dialog";
import { DataPagination } from "@/components/ui/data-pagination";
import { FilterBar } from "@/components/ui/filter-bar";
import {
  EmptyState,
  ErrorState,
  TableSkeleton,
  useDelayedLoading,
} from "@/components/ui/loading";
import { paginate } from "@/lib/pagination";
import { toast } from "sonner";
import { logClientError } from "@/lib/client-logger";
import { PermissionDenied } from "@/components/ui/permission-denied";
import { usePermissionState } from "@/hooks/use-permission-state";
import { FeatureTip } from "@/components/feature-tips/feature-tip";
import { UpgradePrompt } from "@/components/plan/upgrade-prompt";
import { FeatureNotConfiguredBanner } from "@/components/ui/feature-not-configured-banner";
import { useFeatureConfig } from "@/hooks/use-feature-config";
import { useLocale } from "@/components/locale/locale-provider";

interface Communication {
  id: string;
  patient: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  channel: string;
  type: string;
  status: string;
  content: string;
  sentAt: string | null;
  createdAt: string;
}

const CHANNEL_LABEL_KEYS: Record<string, string> = {
  sms: "comm_channel_sms",
  email: "comm_channel_email",
  whatsapp: "comm_channel_whatsapp",
};

const TYPE_LABEL_KEYS: Record<string, string> = {
  reminder: "comm_type_reminder",
  campaign: "comm_type_campaign",
  notification: "comm_type_notification",
  survey: "comm_type_survey",
};

const STATUS_LABEL_KEYS: Record<string, string> = {
  pending: "comm_status_pending",
  sent: "comm_status_sent",
  delivered: "comm_status_delivered",
  scheduled: "comm_status_scheduled",
};

export default function CommunicationsPage() {
  const { t } = useLocale();
  const [communications, setCommunications] = useState<Communication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [channelFilter, setChannelFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const { forbidden, setForbidden } = usePermissionState();
  const { get } = useFeatureConfig();
  const twilio = get("twilio");

  // Map handlers to convert "all" sentinel to empty string for API queries
  const handleChannelChange = (value: string) => {
    setChannelFilter(value === "all" ? "" : value);
    setPage(1);
  };

  const handleStatusChange = (value: string) => {
    setStatusFilter(value === "all" ? "" : value);
    setPage(1);
  };

  const fetchCommunications = useCallback(async () => {
    try {
      setLoading(true);
      setError(false);
      const params = new URLSearchParams();
      if (channelFilter) params.append("channel", channelFilter);
      if (statusFilter) params.append("status", statusFilter);

      const response = await fetch(`/api/communications?${params.toString()}`);
      if (response.status === 403) {
        setForbidden(true);
        return;
      }
      if (!response.ok) throw new Error("Failed to fetch");
      const data = await response.json();
      setCommunications(data);
    } catch (error) {
      setError(true);
      toast.error(t("comm_loadError"));
      logClientError("Communications list fetch failed", error);
    } finally {
      setLoading(false);
    }
  }, [channelFilter, statusFilter, setForbidden, t]);

  useEffect(() => {
    fetchCommunications();
  }, [fetchCommunications]);

  const filteredComms = communications.filter((comm) => {
    const patientName =
      `${comm.patient.firstName} ${comm.patient.lastName}`.toLowerCase();
    return patientName.includes(searchTerm.toLowerCase());
  });

  const PAGE_SIZE = 10;
  const pageCount = Math.max(1, Math.ceil(filteredComms.length / PAGE_SIZE));
  const visiblePage = Math.min(page, pageCount);
  const pagedComms = paginate(filteredComms, visiblePage, PAGE_SIZE);
  const showSkeleton = useDelayedLoading(loading);

  const channelIcon = (channel: string) => {
    switch (channel) {
      case "sms":
        return <MessageSquare className="w-4 h-4 text-blue-500" />;
      case "email":
        return <Mail className="w-4 h-4 text-purple-500" />;
      case "whatsapp":
        return <MessageCircle className="w-4 h-4 text-green-500" />;
      default:
        return <Phone className="w-4 h-4" />;
    }
  };

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-800",
      sent: "bg-green-100 text-green-800",
      delivered: "bg-blue-100 text-blue-800",
      failed: "bg-red-100 text-red-800",
      scheduled: "bg-gray-100 text-gray-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  const stats = {
    total: communications.length,
    sent: communications.filter((c) => c.status === "sent").length,
    failed: communications.filter((c) => c.status === "failed").length,
    pending: communications.filter((c) => c.status === "pending").length,
  };

  const channelLabel = (channel: string) =>
    CHANNEL_LABEL_KEYS[channel] ? t(CHANNEL_LABEL_KEYS[channel]) : channel;
  const typeLabel = (type: string) =>
    TYPE_LABEL_KEYS[type] ? t(TYPE_LABEL_KEYS[type]) : type;
  const statusLabel = (status: string) =>
    STATUS_LABEL_KEYS[status] ? t(STATUS_LABEL_KEYS[status]) : status;

  const resetFilters = () => {
    setSearchTerm("");
    setChannelFilter("");
    setStatusFilter("");
    setPage(1);
  };

  if (forbidden) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">{t("nav_communications")}</h1>
        <PermissionDenied />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <UpgradePrompt moduleKey="communications" />
      {twilio && !twilio.configured ? (
        <FeatureNotConfiguredBanner feature="twilio" missingEnvVars={twilio.missing} />
      ) : null}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t("nav_communications")}</h1>
          <p className="text-gray-600 mt-1">{t("comm_subtitle")}</p>
        </div>
        <AddCommunicationDialog onSuccess={() => fetchCommunications()} />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4">
          <div className="text-sm font-medium text-gray-600">
            {t("comm_totalSent")}
          </div>
          <div className="text-2xl font-bold mt-2">{stats.sent}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm font-medium text-gray-600">
            {t("comm_pending")}
          </div>
          <div className="text-2xl font-bold mt-2 text-yellow-600">
            {stats.pending}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-sm font-medium text-gray-600">
            {t("comm_failed")}
          </div>
          <div className="text-2xl font-bold mt-2 text-red-600">
            {stats.failed}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-sm font-medium text-gray-600">
            {t("comm_totalMessages")}
          </div>
          <div className="text-2xl font-bold mt-2">{stats.total}</div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <FilterBar
          hasActiveFilters={
            searchTerm !== "" || channelFilter !== "" || statusFilter !== ""
          }
          onReset={resetFilters}
        >
          <Input
            placeholder={t("comm_searchPlaceholder")}
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
            className="flex-1"
          />
          <Select
            value={channelFilter || "all"}
            onValueChange={handleChannelChange}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder={t("comm_allChannels")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("comm_allChannels")}</SelectItem>
              <SelectItem value="sms">{t("comm_channel_sms")}</SelectItem>
              <SelectItem value="email">{t("comm_channel_email")}</SelectItem>
              <SelectItem value="whatsapp">
                {t("comm_channel_whatsapp")}
              </SelectItem>
            </SelectContent>
          </Select>
          <FeatureTip tipId="communications-async">
            <span className="inline-flex">
              <Select
                value={statusFilter || "all"}
                onValueChange={handleStatusChange}
              >
                <SelectTrigger className="w-40">
                  <SelectValue placeholder={t("comm_allStatus")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("comm_allStatus")}</SelectItem>
                  <SelectItem value="pending">{t("comm_status_pending")}</SelectItem>
                  <SelectItem value="sent">{t("comm_status_sent")}</SelectItem>
                  <SelectItem value="delivered">
                    {t("comm_status_delivered")}
                  </SelectItem>
                  <SelectItem value="failed">{t("comm_failed")}</SelectItem>
                  <SelectItem value="scheduled">
                    {t("comm_status_scheduled")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </span>
          </FeatureTip>
        </FilterBar>
      </Card>

      {/* Communications Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("common_patient")}</TableHead>
              <TableHead>{t("comm_channel")}</TableHead>
              <TableHead>{t("common_type")}</TableHead>
              <TableHead>{t("common_status")}</TableHead>
              <TableHead>{t("comm_colContent")}</TableHead>
              <TableHead>{t("comm_colSentAt")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {showSkeleton ? (
              <TableRow>
                <TableCell colSpan={6} className="px-0">
                  <TableSkeleton rows={5} columns={6} />
                </TableCell>
              </TableRow>
            ) : error ? (
              <TableRow>
                <TableCell colSpan={6} className="py-4">
                  <ErrorState
                    title={t("comm_loadError")}
                    onRetry={fetchCommunications}
                  />
                </TableCell>
              </TableRow>
            ) : filteredComms.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-4">
                  <EmptyState
                    icon={
                      <MessageSquare className="w-10 h-10 text-neutral-300" />
                    }
                    title={t("comm_empty")}
                  />
                </TableCell>
              </TableRow>
            ) : (
              pagedComms.map((comm) => (
                <TableRow key={comm.id}>
                  <TableCell className="font-medium">
                    {comm.patient.firstName} {comm.patient.lastName}
                  </TableCell>
                  <TableCell className="flex items-center gap-2">
                    {channelIcon(comm.channel)}
                    {channelLabel(comm.channel)}
                  </TableCell>
                  <TableCell className="capitalize">
                    {typeLabel(comm.type)}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${statusBadge(
                        comm.status,
                      )}`}
                    >
                      {statusLabel(comm.status)}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-gray-600 max-w-xs truncate">
                    {comm.content}
                  </TableCell>
                  <TableCell className="text-sm">
                    {comm.sentAt
                      ? new Date(comm.sentAt).toLocaleString()
                      : "-"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        {filteredComms.length > PAGE_SIZE ? (
          <DataPagination
            page={visiblePage}
            pageSize={PAGE_SIZE}
            total={filteredComms.length}
            onPageChange={setPage}
          />
        ) : null}
      </Card>
    </div>
  );
}