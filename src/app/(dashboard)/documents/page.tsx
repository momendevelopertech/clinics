"use client";

import * as React from "react";
import {
  FileText,
  Filter as FilterIcon,
  Download,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { UploadDocumentDialog } from "@/components/documents/upload-document-dialog";
import { logClientError } from "@/lib/client-logger";
import { PermissionDenied } from "@/components/ui/permission-denied";
import { usePermissionState } from "@/hooks/use-permission-state";

interface Document {
  id: string;
  patientId: string;
  patientName: string;
  documentType: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  uploadedBy: string;
  createdAt: string;
}

export default function DocumentsPage() {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [documents, setDocuments] = React.useState<Document[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [typeFilter, setTypeFilter] = React.useState<string | null>(null);
  const { forbidden, setForbidden } = usePermissionState();

  React.useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/documents");
      if (response.status === 403) {
        setForbidden(true);
        return;
      }
      if (!response.ok) throw new Error("Failed to fetch documents");
      const data = await response.json();
      setDocuments(data);
    } catch (error) {
      toast.error("Failed to load documents");
      logClientError("Document list fetch failed", error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    const csv = [
      [
        "Patient Name",
        "Document Type",
        "File Name",
        "File Size (MB)",
        "Uploaded By",
        "Date",
      ],
      ...documents.map((d) => [
        d.patientName,
        d.documentType,
        d.fileName,
        (d.fileSize / 1024 / 1024).toFixed(2),
        d.uploadedBy,
        new Date(d.createdAt).toLocaleDateString(),
      ]),
    ]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `documents-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success("Documents exported successfully");
  };

  const filteredDocuments = documents.filter((document) => {
    const matchesSearch =
      document.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      document.fileName.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesType = !typeFilter || document.documentType === typeFilter;

    return matchesSearch && matchesType;
  });

  const getDocumentTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      imaging: "bg-purple-100 text-purple-800",
      lab: "bg-blue-100 text-blue-800",
      pathology: "bg-pink-100 text-pink-800",
      consent: "bg-green-100 text-green-800",
      medical_record: "bg-orange-100 text-orange-800",
      prescription: "bg-cyan-100 text-cyan-800",
      other: "bg-gray-100 text-gray-800",
    };
    return colors[type] || colors["other"];
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  const documentTypes = [
    "imaging",
    "lab",
    "pathology",
    "consent",
    "medical_record",
    "prescription",
    "other",
  ];

  if (forbidden) {
    return (
      <div className="flex flex-col gap-6 w-full h-full">
        <h2 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50 mb-1">
          <FileText className="w-6 h-6 inline mr-2" />
          Documents &amp; Imaging
        </h2>
        <PermissionDenied
          title="You don't have permission"
          description="Only staff with patient access can view documents."
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 w-full h-full">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50 mb-1">
            <FileText className="w-6 h-6 inline mr-2" />
            Documents & Imaging
          </h2>
          <p className="text-sm text-neutral-500">
            Manage patient medical documents and imaging files.
          </p>
        </div>

        <UploadDocumentDialog onSuccess={fetchDocuments} />
      </div>

      <div className="bg-white dark:bg-neutral-900 border rounded-[5px] flex-1 shadow-sm flex flex-col pt-2">
        <div className="px-6 py-4 border-b flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <Input
            type="search"
            placeholder="Search patient name or file name..."
            className="w-full sm:max-w-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <div className="flex gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <FilterIcon className="w-4 h-4" /> Type
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>Filter by Type</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuCheckboxItem
                  checked={!typeFilter}
                  onCheckedChange={() => setTypeFilter(null)}
                >
                  All
                </DropdownMenuCheckboxItem>
                {documentTypes.map((type) => (
                  <DropdownMenuCheckboxItem
                    key={type}
                    checked={typeFilter === type}
                    onCheckedChange={() =>
                      setTypeFilter(typeFilter === type ? null : type)
                    }
                  >
                    {type.replace("_", " ").charAt(0).toUpperCase() +
                      type.slice(1).replace("_", " ")}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              className="flex items-center gap-2"
            >
              <Download className="w-4 h-4" /> Export
            </Button>
          </div>
        </div>

        <div className="p-0 overflow-x-auto flex-1">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <p className="text-neutral-500">Loading documents...</p>
            </div>
          ) : filteredDocuments.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <Upload className="w-12 h-12 text-neutral-300 mb-4" />
              <p className="text-neutral-600">No documents found</p>
            </div>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="bg-neutral-50 dark:bg-neutral-800/50 text-neutral-500 font-medium">
                <tr>
                  <th className="px-6 py-4 border-b">Patient</th>
                  <th className="px-6 py-4 border-b">File Name</th>
                  <th className="px-6 py-4 border-b">Type</th>
                  <th className="px-6 py-4 border-b hidden md:table-cell">
                    Size
                  </th>
                  <th className="px-6 py-4 border-b hidden md:table-cell">
                    Uploaded
                  </th>
                  <th className="px-6 py-4 border-b">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y text-neutral-800 dark:text-neutral-200">
                {filteredDocuments.map((document) => (
                  <tr
                    key={document.id}
                    className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-[5px] bg-amber-100 text-amber-700 font-bold flex justify-center items-center text-xs">
                          {document.patientName
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .slice(0, 2)}
                        </div>
                        <p className="font-medium">{document.patientName}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium truncate max-w-xs">
                        {document.fileName}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${getDocumentTypeColor(document.documentType)}`}
                      >
                        {document.documentType.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-6 py-4 hidden md:table-cell">
                      {formatFileSize(document.fileSize)}
                    </td>
                    <td className="px-6 py-4 hidden md:table-cell">
                      {new Date(document.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <a
                        href={document.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Button variant="ghost" size="sm">
                          View
                        </Button>
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
