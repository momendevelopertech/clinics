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
import { Zap, Radio } from "lucide-react";
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
      draft: "bg-gray-100 text-gray-800 dark:bg-gray-500/15 dark:text-gray-300",
      active: "bg-green-100 text-green-800 dark:bg-green-500/15 dark:text-green-300",
      paused: "bg-yellow-100 text-yellow-800 dark:bg-yellow-500/15 dark:text-yellow-300",
      archived: "bg-gray-200 text-gray-800 dark:bg-gray-500/15 dark:text-gray-300",
    };
    return colors[status] || "bg-gray-100 text-gray-800 dark:bg-gray-500/15 dark:text-gray-300";
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
      <Zap className="w-4 h-4 text-blue-500" />
    ) : (
      <Radio className="w-4 h-4 text-purple-500" />
    );
  };

  const typeLabel = (type: string) =>
    type === "drip" ? t("camp_drip") : t("camp_broadcast");

  const triggerLabel = (trigger: string | null) => {
    if (!trigger) return <span className="text-gray-400">{t("camp_manual")}</span>;
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
            <h1 className="text-2xl font-bold">{t("camp_title")}</h1>
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
          <h1 className="text-3xl font-bold">{t("camp_title")}</h1>
          <p className="text-gray-600 mt-1">{t("camp_subtitle")}</p>
        </div>
        <FeatureTip tipId="campaigns-audience">
          <span className="inline-flex">
            <AddCampaignDialog onSuccess={() => fetchCampaigns()} />
          </span>
        </FeatureTip>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4">
          <div className="text-sm font-medium text-gray-600">
            {t("camp_total")}
          </div>
          <div className="text-2xl font-bold mt-2">{stats.total}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm font-medium text-gray-600">
            {t("camp_active")}
          </div>
          <div className="text-2xl font-bold mt-2 text-green-600">
            {stats.active}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-sm font-medium text-gray-600">
            {t("camp_drafts")}
          </div>
          <div className="text-2xl font-bold mt-2 text-gray-600">
            {stats.draft}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-sm font-medium text-gray-600">
            {t("camp_archived")}
          </div>
          <div className="text-2xl font-bold mt-2 text-gray-600">
            {stats.archived}
          </div>
        </Card>
      </div>

      {/* Search filter */}
      <Card className="p-4">
        <FilterBar hasActiveFilters={searchTerm !== ""} onReset={resetFilters}>
          <Input
            placeholder={t("common_search")}
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
            className="w-full sm:max-w-sm"
          />
        </FilterBar>
      </Card>

      {/* Campaigns Table */}
      <Card>
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
                  <TableCell className="font-medium">
                    {campaign.name}
                  </TableCell>
                  <TableCell className="flex items-center gap-2">
                    {typeIcon(campaign.type)}
                    {typeLabel(campaign.type)}
                  </TableCell>
                  <TableCell className="text-sm text-gray-600">
                    {triggerLabel(campaign.triggerType)}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${statusBadge(
                        campaign.status,
                      )}`}
                    >
                      {statusLabel(campaign.status)}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-gray-600">
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