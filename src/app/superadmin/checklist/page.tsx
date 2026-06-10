"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { SuperAdminShell } from "@/components/superadmin-shell";
import { SetupChecklist } from "@/components/setup-checklist";
import { getSession, isSuperAdmin } from "@/lib/auth";
import {
  SUPERADMIN_CHECKLIST_STORAGE_KEY,
  fetchSuperAdminChecklistAuto,
  isSuperAdminItemAutoComplete,
  superAdminChecklistSections,
} from "@/lib/setup-checklists";

export default function SuperAdminChecklistPage() {
  const router = useRouter();

  useEffect(() => {
    const session = getSession();
    if (!session || !isSuperAdmin(session)) {
      router.replace("/login");
    }
  }, [router]);

  return (
    <SuperAdminShell
      title="Setup checklist"
      subtitle="Step-by-step onboarding with automatic progress detection and manual handoff checks."
    >
      <SetupChecklist
        title="Platform onboarding checklist"
        description="Use this when creating a new institute. Automatic checks refresh from tenant and admin data."
        storageKey={SUPERADMIN_CHECKLIST_STORAGE_KEY}
        sections={superAdminChecklistSections}
        fetchAuto={fetchSuperAdminChecklistAuto}
        isItemAutoComplete={isSuperAdminItemAutoComplete}
        variant="dark"
        tips={[
          {
            title: "SuperAdmin vs Institute Admin",
            body: "You create tenants and flags here. Owners configure branding, courses, and students in /admin.",
          },
          {
            title: "Plan field",
            body: "MVP and Pro are billing labels today — both get the same feature set unless flags say otherwise.",
          },
          {
            title: "Temp passwords",
            body: "Shown only when creating an institute admin. The admin list shows email and name only.",
          },
        ]}
      />
    </SuperAdminShell>
  );
}
