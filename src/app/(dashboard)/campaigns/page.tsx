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
  Radio,
  Send,
  Zap,
} from "lucide-react";;
import { AddCampaignDialog } from "@/components/communications/add-campaign-dialog";
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
import { useLocale } from "@/components/locale/locale-provider";

interface Campaign {
  id: string;
  name: string;
  type: string;
  status: string;
  triggerType: string | null;
  createdAt: string;
}

export default function CampaignsPage() {
  const { t } = useLocale();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const { forbidden, setForbidden } = usePermissionState();

  const fetchCampaigns = useCallback(async () => {
    try {
      setLoading(true);
      setError(false);
      const response = await fetch("/api/communications/campaigns");
      if (response.status === 403) {
        setForbidden(true);
        return;
      }
      if (!response.ok) throw new Error("Failed to fetch");
      const data = await response.json();
      setCampaigns(data);
    } catch (error) {
      setError(true);
      toast.error(t("camp_loadError"));
      logClientError("Campaign list fetch failed", error);
    } finally {
      setLoading(false);
    }
  }, [setForbidden, t]);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  const filteredCampaigns = campaigns.filter((campaign) =>
    campaign.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const stats = {
    total: campaigns.length,
    active: campaigns.filter((c) => c.status === "active").length,
    draft: campaigns.filter((c) => c.status === "draft").length,
    archived: campaigns.filter((c) => c.status === "archived").length,
  };

  const PAGE_SIZE = 10;
  const pageCount = Math.max(1, Math.ceil(filteredCampaigns.length / PAGE_SIZE));
  const visiblePage = Math.min(page, pageCount);
  const pagedCampaigns = paginate(filteredCampaigns, visiblePage, PAGE_SIZE);
  const showSkeleton = useDelayedLoading(loading);

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      draft: "bg-muted-bg text-muted-foreground",
      active: "bg-success-bg text-success-text",
      paused: "bg-warning-bg text-warning-text",
      archived: "bg-muted-bg text-muted-foreground",
    };
    return colors[status] || "bg-muted-bg text-muted-foreground";
  };

  const statusLabel = (status: string) => {
    const key = `camp_status_${status}` as
      | "camp_status_draft"
      | "camp_status_active"
      | "camp_status_paused"
      | "camp_status_archived";
    const translated = t(key);
    return translated === key ? status : translated;
  };

  const typeIcon = (type: string) => {
    return type === "drip" ? (
      <Zap className="w-4 h-4 text-accent-blue-text" />
    ) : (
      <Radio className="w-4 h-4 text-purple-500 dark:text-purple-400" />
    );
  };

  const typeLabel = (type: string) =>
    type === "drip" ? t("camp_drip") : t("camp_broadcast");

  const triggerLabel = (trigger: string | null) => {
    if (!trigger) return <span className="text-muted-foreground">{t("camp_manual")}</span>;
    if (trigger === "post_visit") return t("camp_afterVisit");
    if (trigger === "chronic_care") return t("camp_chronicCare");
    return trigger;
  };

  const resetFilters = () => {
    setSearchTerm("");
    setPage(1);
  };

  if (forbidden) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{t("camp_title")}</h1>
          </div>
        </div>
        <PermissionDenied />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <UpgradePrompt moduleKey="campaigns" />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">{t("camp_title")}</h1>
          <p className="text-muted-foreground mt-1">{t("camp_subtitle")}</p>
        </div>
        <FeatureTip tipId="campaigns-audience">
          <span className="inline-flex">
            <AddCampaignDialog onSuccess={() => fetchCampaigns()} />
          </span>
        </FeatureTip>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4 border-border bg-card shadow-sm">
          <div className="text-sm font-medium text-muted-foreground">
            {t("camp_total")}
          </div>
          <div className="text-2xl font-bold mt-2 text-foreground">{stats.total}</div>
        </Card>
        <Card className="p-4 border-border bg-card shadow-sm">
          <div className="text-sm font-medium text-muted-foreground">
            {t("camp_active")}
          </div>
          <div className="text-2xl font-bold mt-2 text-success-text">
            {stats.active}
          </div>
        </Card>
        <Card className="p-4 border-border bg-card shadow-sm">
          <div className="text-sm font-medium text-muted-foreground">
            {t("camp_drafts")}
          </div>
          <div className="text-2xl font-bold mt-2 text-muted-foreground">
            {stats.draft}
          </div>
        </Card>
        <Card className="p-4 border-border bg-card shadow-sm">
          <div className="text-sm font-medium text-muted-foreground">
            {t("camp_archived")}
          </div>
          <div className="text-2xl font-bold mt-2 text-muted-foreground">
            {stats.archived}
          </div>
        </Card>
      </div>

      {/* Search filter */}
      <Card className="p-4 border-border bg-card shadow-sm">
        <FilterBar hasActiveFilters={searchTerm !== ""} onReset={resetFilters}>
          <Input
            placeholder={t("common_search")}
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
            className="w-full sm:max-w-sm h-9"
          />
        </FilterBar>
      </Card>

      {/* Campaigns Table */}
      <Card className="border-border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("camp_colName")}</TableHead>
              <TableHead>{t("common_type")}</TableHead>
              <TableHead>{t("camp_colTrigger")}</TableHead>
              <TableHead>{t("common_status")}</TableHead>
              <TableHead>{t("camp_colCreated")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {showSkeleton ? (
              <TableRow>
                <TableCell colSpan={5} className="px-0">
                  <TableSkeleton rows={5} columns={5} />
                </TableCell>
              </TableRow>
            ) : error ? (
              <TableRow>
                <TableCell colSpan={5} className="py-4">
                  <ErrorState
                    title={t("camp_loadError")}
                    onRetry={fetchCampaigns}
                  />
                </TableCell>
              </TableRow>
            ) : filteredCampaigns.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-4">
                  <EmptyState title={t("camp_empty")} />
                </TableCell>
              </TableRow>
            ) : (
              pagedCampaigns.map((campaign) => (
                <TableRow key={campaign.id}>
                  <TableCell className="font-medium text-foreground">
                    {campaign.name}
                  </TableCell>
                  <TableCell className="flex items-center gap-2 text-foreground">
                    {typeIcon(campaign.type)}
                    {typeLabel(campaign.type)}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {triggerLabel(campaign.triggerType)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${statusBadge(
                          campaign.status,
                        )}`}
                      >
                        {statusLabel(campaign.status)}
                      </span>
                      {campaign.status !== "archived" ? (
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              const response = await fetch(
                                `/api/communications/campaigns/${campaign.id}/launch`,
                                { method: "POST" },
                              );
                              const data = await response.json().catch(() => ({}));
                              if (!response.ok) {
                                throw new Error(data.error || "Launch failed");
                              }
                              toast.success(`Launched: ${data.sent} sent, ${data.failed} failed`);
                              fetchCampaigns();
                            } catch (error) {
                              toast.error(error instanceof Error ? error.message : "Launch failed");
                              logClientError("Campaign launch failed", error);
                            }
                          }}
                          className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted-bg transition-colors shadow-sm"
                        >
                          <Send className="h-3 w-3 mr-1" />Launch
                        </button>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(campaign.createdAt).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        {!loading && filteredCampaigns.length > PAGE_SIZE ? (
          <DataPagination
            page={visiblePage}
            pageSize={PAGE_SIZE}
            total={filteredCampaigns.length}
            onPageChange={setPage}
          />
        ) : null}
      </Card>
    </div>
  );
}