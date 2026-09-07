import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getDictionary } from "@/lib/i18n/server";
import { AvailabilityForm } from "@/components/settings/availability-form";

export default async function AvailabilityPage() {
  const session = await auth();
  if (!session?.user?.organizationId) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      role: true,
      availabilityType: true,
      availableDays: true,
      availableFrom: true,
      availableTo: true,
    },
  });

  if (!user) redirect("/login");

  const t = await getDictionary();

  return (
    <AvailabilityForm
      t={t}
      current={{
        availabilityType: user.availabilityType ?? "regular",
        availableDays: user.availableDays ?? "",
        availableFrom: user.availableFrom ?? "09:00",
        availableTo: user.availableTo ?? "17:00",
      }}
    />
  );
}