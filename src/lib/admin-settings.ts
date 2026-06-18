import { Mail, Palette, Video, LayoutTemplate, CreditCard, UserPlus } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type AdminSettingsItem = {
  href: string;
  label: string;
  title: string;
  description: string;
  icon: LucideIcon;
};

export const ADMIN_SETTINGS_ITEMS: AdminSettingsItem[] = [
  {
    href: "/admin/settings/branding",
    label: "Theme & branding",
    title: "Theme & branding",
    description: "Logo, colors, display name, and mentor label with live preview.",
    icon: Palette,
  },
  {
    href: "/admin/settings/landing",
    label: "Landing page",
    title: "Landing page",
    description: "Public homepage copy, hero image, and call-to-action.",
    icon: LayoutTemplate,
  },
  {
    href: "/admin/settings/email",
    label: "Email",
    title: "Email (SMTP)",
    description: "Outgoing mail for welcome messages and notifications.",
    icon: Mail,
  },
  {
    href: "/admin/settings/zoom",
    label: "Zoom",
    title: "Zoom integration",
    description: "Connect Zoom or use manual join links for live classes.",
    icon: Video,
  },
  {
    href: "/admin/settings/enrollment",
    label: "Enrollment",
    title: "Enrollment",
    description: "Allow or block student self-signup for your institute.",
    icon: UserPlus,
  },
  {
    href: "/admin/settings/payments",
    label: "Payments",
    title: "Payments",
    description: "Enrollment modes and gateway credentials for course checkout.",
    icon: CreditCard,
  },
];
