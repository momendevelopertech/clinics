import type { PrismaClient, Prisma } from "@prisma/client";
import { prisma } from "./prisma";

export type AuditAction = "CREATE" | "UPDATE" | "DELETE" | "READ";
type AuditDbClient = PrismaClient | Prisma.TransactionClient;

export interface CreateAuditParams {
  organizationId: string;
  userId?: string | null;
  actorType?: "user" | "patient" | "system" | "webhook";
  actorIdentifier?: string | null;
  action: AuditAction;
  entityType: string;
  entityId: string;
  beforeState?: string;
  afterState?: string;
  ipAddress?: string;
  userAgent?: string;
  db?: AuditDbClient;
  request?: Request;
}

/**
 * Append-only audit log. Every Create, Update, Delete must call this.
 */
export async function createAuditLog(params: CreateAuditParams) {
  const db = params.db ?? prisma;
  const forwardedFor = params.request?.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ipAddress = params.ipAddress ?? forwardedFor ?? params.request?.headers.get("x-real-ip");
  const userAgent = params.userAgent ?? params.request?.headers.get("user-agent");

  return db.auditLog.create({
    data: {
      organizationId: params.organizationId,
      userId: params.userId ?? null,
      actorType: params.actorType ?? (params.userId ? "user" : "system"),
      actorIdentifier: params.actorIdentifier ?? null,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      beforeState: params.beforeState ?? null,
      afterState: params.afterState ?? null,
      ipAddress: ipAddress ?? null,
      userAgent: userAgent ?? null,
    },
  });
}
