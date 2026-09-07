import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { getDictionary } from "@/lib/i18n/server";

export default async function EncountersPage() {
  const t = await getDictionary();
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">{t["enc_title"]}</h1>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          {t["enc_start"]}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t["enc_recent"]}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-[5px] border">
            <div className="p-8 text-center text-sm text-muted-foreground">
              {t["enc_empty"]}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
