"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Zap, Radio } from "lucide-react";
import { AddCampaignDialog } from "@/components/communications/add-campaign-dialog";
import { DataPagination } from "@/components/ui/data-pagination";
import { paginate } from "@/lib/pagination";
import { toast } from "sonner";
import { logClientError } from "@/lib/client-logger";
import { PermissionDenied } from "@/components/ui/permission-denied";
import { usePermissionState } from "@/hooks/use-permission-state";
import { FeatureTip } from "@/components/feature-tips/feature-tip";

interface Campaign {
  id: string;
  name: string;
  type: string;
  status: string;
  triggerType: string | null;
  createdAt: string;
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const { forbidden, setForbidden } = usePermissionState();

  useEffect(() => {
    fetchCampaigns();
  }, []);

  async function fetchCampaigns() {
    try {
      const response = await fetch("/api/communications/campaigns");
      if (response.status === 403) {
        setForbidden(true);
        return;
      }
      if (!response.ok) throw new Error("Failed to fetch");
      const data = await response.json();
      setCampaigns(data);
    } catch (error) {
      toast.error("Failed to fetch campaigns");
      logClientError("Campaign list fetch failed", error);
    } finally {
      setLoading(false);
    }
  }

  const stats = {
    total: campaigns.length,
    active: campaigns.filter((c) => c.status === "active").length,
    draft: campaigns.filter((c) => c.status === "draft").length,
    archived: campaigns.filter((c) => c.status === "archived").length,
  };

  const PAGE_SIZE = 10;
  const pageCount = Math.max(1, Math.ceil(campaigns.length / PAGE_SIZE));
  const visiblePage = Math.min(page, pageCount);
  const pagedCampaigns = paginate(campaigns, visiblePage, PAGE_SIZE);

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      draft: "bg-gray-100 text-gray-800",
      active: "bg-green-100 text-green-800",
      paused: "bg-yellow-100 text-yellow-800",
      archived: "bg-gray-200 text-gray-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  const typeIcon = (type: string) => {
    return type === "drip" ? (
      <Zap className="w-4 h-4 text-blue-500" />
    ) : (
      <Radio className="w-4 h-4 text-purple-500" />
    );
  };

  if (forbidden) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Campaigns</h1>
          </div>
        </div>
        <PermissionDenied
          title="You don't have permission"
          description="Only staff with patient or scheduling access can view campaigns."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Marketing Campaigns</h1>
          <p className="text-gray-600 mt-1">
            Create and manage drip campaigns and broadcasts
          </p>
        </div>
        <FeatureTip tipId="campaigns-audience">
          <span className="inline-flex">
            <AddCampaignDialog onSuccess={() => fetchCampaigns()} />
          </span>
        </FeatureTip>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="text-sm font-medium text-gray-600">
            Total Campaigns
          </div>
          <div className="text-2xl font-bold mt-2">{stats.total}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm font-medium text-gray-600">Active</div>
          <div className="text-2xl font-bold mt-2 text-green-600">
            {stats.active}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-sm font-medium text-gray-600">Drafts</div>
          <div className="text-2xl font-bold mt-2 text-gray-600">
            {stats.draft}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-sm font-medium text-gray-600">Archived</div>
          <div className="text-2xl font-bold mt-2 text-gray-600">
            {stats.archived}
          </div>
        </Card>
      </div>

      {/* Campaigns Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Campaign Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Trigger</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  Loading...
                </TableCell>
              </TableRow>
            ) : campaigns.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  No campaigns yet. Create your first campaign to get started!
                </TableCell>
              </TableRow>
            ) : (
              pagedCampaigns.map((campaign) => (
                <TableRow key={campaign.id}>
                  <TableCell className="font-medium">{campaign.name}</TableCell>
                  <TableCell className="flex items-center gap-2">
                    {typeIcon(campaign.type)}
                    {campaign.type === "drip" ? "Drip" : "Broadcast"}
                  </TableCell>
                  <TableCell className="text-sm text-gray-600">
                    {campaign.triggerType ? (
                      campaign.triggerType === "post_visit" ? (
                        "After Visit"
                      ) : (
                        "Chronic Care"
                      )
                    ) : (
                      <span className="text-gray-400">Manual</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${statusBadge(
                        campaign.status,
                      )}`}
                    >
                      {campaign.status}
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
        {!loading && campaigns.length > PAGE_SIZE ? (
          <div className="border-t">
            <DataPagination
              page={visiblePage}
              pageSize={PAGE_SIZE}
              total={campaigns.length}
              onPageChange={setPage}
            />
          </div>
        ) : null}
      </Card>
    </div>
  );
}
