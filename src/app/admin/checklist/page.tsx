"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AdminNav } from "@/components/admin-nav";
import { SetupChecklist } from "@/components/setup-checklist";
import { canManageInstitute, getSession, isAdmin } from "@/lib/auth";
import { profileBundleLabel } from "@/lib/product-profile";
import {
  INSTITUTE_CHECKLIST_STORAGE_KEY,
  fetchInstituteChecklistAuto,
  instituteChecklistSections,
  isInstituteItemAutoComplete,
} from "@/lib/setup-checklists";

export default function AdminChecklistPage() {
  const router = useRouter();
  const bundleLabel = profileBundleLabel(getSession()?.tenant);

  useEffect(() => {
    const session = getSession();
    if (!session) {
      router.replace("/login");
      return;
    }
    if (!isAdmin(session)) {
      router.replace("/dashboard");
      return;
    }
    if (!canManageInstitute(session)) {
      router.replace("/admin/home");
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-slate-50">
      <AdminNav />
      <main className="px-8 py-8">
        <SetupChecklist
          title="Institute setup checklist"
          description="Complete these steps once when launching a new institute. Progress is saved in your browser."
          storageKey={INSTITUTE_CHECKLIST_STORAGE_KEY}
          sections={instituteChecklistSections}
          fetchAuto={fetchInstituteChecklistAuto}
          isItemAutoComplete={isInstituteItemAutoComplete}
          variant="light"
          tips={[
            {
              title: "Self-enroll off",
              body: `Most institutes require admin enrollment. Always pick a ${bundleLabel} when creating students.`,
            },
            {
              title: "Teachers are scoped",
              body: "Assign subjects at /admin/teachers — teachers only see those subjects in CMS and doubts.",
            },
            {
              title: "Dev emails",
              body: "Without SMTP, welcome emails land in backend/dev-emails/ as HTML files.",
            },
            {
              title: "Zoom optional",
              body: "Skip Zoom settings and paste a manual join URL when scheduling each live class.",
            },
          ]}
        />
      </main>
    </div>
  );
}
