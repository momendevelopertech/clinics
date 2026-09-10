import type { Metadata } from "next";
import { BookClinicClient } from "@/components/booking/book-clinic-client";

export const metadata: Metadata = { title: "Book an appointment" };

export default async function BookClinicPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  return <BookClinicClient orgSlug={orgSlug} />;
}
