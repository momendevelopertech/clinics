import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { logServerError } from "@/lib/safe-logger";
import { getAvailableSlots } from "@/lib/appointments";
import { parseOrgSettings } from "@/lib/org-settings";

const availabilityQuerySchema = z.object({
  providerId: z.string().min(1).max(80).optional().nullable(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD"),
});

const MAX_BOOK_AHEAD_DAYS = 60;
const MAX_PROVIDERS_PER_ORG = 20;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ orgSlug: string }> },
) {
  try {
    const { orgSlug } = await params;
    const { searchParams } = new URL(request.url);
    const parsed = availabilityQuerySchema.safeParse({
      providerId: searchParams.get("providerId"),
      date: searchParams.get("date"),
    });
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid availability query", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const org = await prisma.organization.findUnique({
      where: { slug: orgSlug },
      select: { id: true, name: true, status: true, settingsJson: true },
    });
    if (!org || org.status !== "active") {
      return NextResponse.json({ error: "Clinic not found" }, { status: 404 });
    }

    const [y, m, d] = parsed.data.date.split("-").map(Number);
    const day = new Date(y, m - 1, d);
    if (!Number.isFinite(day.getTime())) {
      return NextResponse.json({ error: "Invalid date" }, { status: 400 });
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const maxDay = new Date(today);
    maxDay.setDate(maxDay.getDate() + MAX_BOOK_AHEAD_DAYS);
    if (day < today || day > maxDay) {
      return NextResponse.json(
        { error: `Date must be within the next ${MAX_BOOK_AHEAD_DAYS} days` },
        { status: 400 },
      );
    }

    const settings = parseOrgSettings(org.settingsJson);
    const durationMins = settings.appointmentDurationMins ?? 30;

    const providers = await prisma.user.findMany({
      where: {
        organizationId: org.id,
        active: true,
        ...(parsed.data.providerId ? { id: parsed.data.providerId } : {}),
      },
      select: {
        id: true,
        name: true,
        specialty: true,
        availabilityType: true,
        availableDays: true,
        availableFrom: true,
        availableTo: true,
      },
      take: MAX_PROVIDERS_PER_ORG,
    });
    if (providers.length === 0) {
      return NextResponse.json({ error: "No providers available" }, { status: 404 });
    }

    const dayStart = new Date(day);
    const dayEnd = new Date(day);
    dayEnd.setDate(dayEnd.getDate() + 1);
    const booked = await prisma.appointment.findMany({
      where: {
        organizationId: org.id,
        providerId: { in: providers.map((p) => p.id) },
        status: { in: ["scheduled", "confirmed", "arrived", "in_progress"] },
        startTime: { gte: dayStart, lt: dayEnd },
      },
      select: { providerId: true, startTime: true, endTime: true },
    });
    const bookedByProvider = new Map<string, typeof booked>();
    for (const b of booked) {
      const list = bookedByProvider.get(b.providerId) ?? [];
      list.push(b);
      bookedByProvider.set(b.providerId, list);
    }

    const now = new Date();
    const result = providers.map((p) => ({
      id: p.id,
      name: p.name,
      specialty: p.specialty,
      slots: getAvailableSlots({
        provider: {
          availabilityType: p.availabilityType,
          availableDays: p.availableDays,
          availableFrom: p.availableFrom,
          availableTo: p.availableTo,
        },
        date: day,
        durationMins,
        existingAppointments: bookedByProvider.get(p.id) ?? [],
        now,
        openTime: settings.openTime,
        closeTime: settings.closeTime,
      }).map((s) => ({ start: s.start.toISOString(), end: s.end.toISOString() })),
    }));

    return NextResponse.json({
      org: { name: org.name },
      date: parsed.data.date,
      durationMins,
      providers: result,
    });
  } catch (error) {
    logServerError("Public availability lookup failed", error);
    return NextResponse.json({ error: "Failed to load availability" }, { status: 500 });
  }
}
