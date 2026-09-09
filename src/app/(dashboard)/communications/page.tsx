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
import { paginate } from "@/lib/pagination";
import { toast } from "sonner";
import { logClientError } from "@/lib/client-logger";
import { PermissionDenied } from "@/components/ui/permission-denied";
import { usePermissionState } from "@/hooks/use-permission-state";
import { FeatureTip } from "@/components/feature-tips/feature-tip";

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

export default function CommunicationsPage() {
  const [communications, setCommunications] = useState<Communication[]>([]);
  const [loading, setLoading] = useState(true);
  const [channelFilter, setChannelFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const { forbidden, setForbidden } = usePermissionState();

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
      toast.error("Failed to fetch communications");
      logClientError("Communications list fetch failed", error);
    } finally {
      setLoading(false);
    }
  }, [channelFilter, statusFilter]);

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

  if (forbidden) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Communications</h1>
        <PermissionDenied
          title="You don't have permission"
          description="Only staff with patient or scheduling access can view communications."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Communications</h1>
          <p className="text-gray-600 mt-1">
            Manage SMS, email, and WhatsApp campaigns
          </p>
        </div>
        <AddCommunicationDialog onSuccess={() => fetchCommunications()} />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="text-sm font-medium text-gray-600">Total Sent</div>
          <div className="text-2xl font-bold mt-2">{stats.sent}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm font-medium text-gray-600">Pending</div>
          <div className="text-2xl font-bold mt-2 text-yellow-600">
            {stats.pending}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-sm font-medium text-gray-600">Failed</div>
          <div className="text-2xl font-bold mt-2 text-red-600">
            {stats.failed}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-sm font-medium text-gray-600">
            Total Messages
          </div>
          <div className="text-2xl font-bold mt-2">{stats.total}</div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex gap-4">
          <Input
            placeholder="Search by patient name..."
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
              <SelectValue placeholder="All Channels" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Channels</SelectItem>
              <SelectItem value="sms">SMS</SelectItem>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="whatsapp">WhatsApp</SelectItem>
            </SelectContent>
          </Select>
          <FeatureTip tipId="communications-async">
          <span className="inline-flex">
            <Select
              value={statusFilter || "all"}
              onValueChange={handleStatusChange}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="sent">Sent</SelectItem>
              <SelectItem value="delivered">Delivered</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="scheduled">Scheduled</SelectItem>
            </SelectContent>
          </Select>
          </span>
        </FeatureTip>
        </div>
      </Card>

      {/* Communications Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Patient</TableHead>
              <TableHead>Channel</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Content Preview</TableHead>
              <TableHead>Sent At</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  Loading...
                </TableCell>
              </TableRow>
            ) : filteredComms.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  No communications found
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
                    {comm.channel.toUpperCase()}
                  </TableCell>
                  <TableCell className="capitalize">{comm.type}</TableCell>
                  <TableCell>
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${statusBadge(
                        comm.status,
                      )}`}
                    >
                      {comm.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-gray-600 max-w-xs truncate">
                    {comm.content}
                  </TableCell>
                  <TableCell className="text-sm">
                    {comm.sentAt ? new Date(comm.sentAt).toLocaleString() : "-"}
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
