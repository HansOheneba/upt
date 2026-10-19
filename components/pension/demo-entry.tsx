"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { startPensionJoin, startPensionPreview } from "@/lib/pension/enter";

export function PensionDemoEntry() {
  const router = useRouter();

  return (
    <div className="mt-8 border-t border-border pt-6">
      <p className="text-sm font-medium">My Own Pension</p>
      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
        View your pot, contributions, and statement, or open an account with your details.
      </p>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <Button
          type="button"
          className="flex-1"
          onClick={() => {
            startPensionPreview();
            router.push("/dashboard");
          }}
        >
          View my pension
        </Button>
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          onClick={() => {
            startPensionJoin();
            router.push("/onboarding");
          }}
        >
          Open an account
        </Button>
      </div>
    </div>
  );
}
