"use client";

import Link from "next/link";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, CheckCircle2, XCircle, CreditCard } from "lucide-react";
import { useFinancialStore } from "@/store/financialStore";
import { usePageData } from "@/hooks/usePageData";
import { getUserFullName, getUserAge } from "@/lib/client-data";
import { useClientGate } from "@/hooks/useClientGate";
import { useProfilePanel } from "@/components/dashboard/profile-panel-context";

type ProfileField = { label: string; value: string };

function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? "")
    .join("");
}

function accountModeLabel(mode?: string) {
  if (mode === "partner") return "Partner Account";
  if (mode === "family") return "Family Account";
  return "Individual Account";
}

function riskLabel(risk?: string) {
  const map: Record<string, string> = {
    conservative: "Conservative",
    moderate: "Moderate Growth",
    aggressive: "Aggressive Growth",
  };
  return risk ? (map[risk] ?? risk) : "-";
}

function ucFirst(s?: string) {
  if (!s) return "-";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function ucGender(g?: string | null): string {
  const map: Record<string, string> = {
    M: "Male",
    F: "Female",
    O: "Non-binary / Other",
    X: "Prefer not to say",
  };
  return g ? (map[g] ?? g) : "-";
}

function Section({
  title,
  fields,
  loading,
}: {
  title: string;
  fields: ProfileField[];
  loading?: boolean;
}) {
  if (!loading && !fields.length) return null;
  return (
    <div className="rounded-xl border bg-white">
      <div className="border-b px-6 py-4">
        <h3 className="text-sm font-semibold capitalize">{title}</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-4 px-6 py-5">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-1">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-4 w-36" />
              </div>
            ))
          : fields.map((field) => (
              <div key={field.label}>
                <p className="text-xs text-muted-foreground">{field.label}</p>
                {field.value ? (
                  <p className="text-sm font-medium">{field.value}</p>
                ) : (
                  <Link
                    href="/dashboard/account/settings"
                    className="text-xs text-muted-foreground/60 italic hover:text-muted-foreground transition-colors"
                  >
                    Not set - add in settings
                  </Link>
                )}
              </div>
            ))}
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const { loading } = usePageData("profile");
  const user = useFinancialStore((s) => s.user);
  const mode = user?.account_mode ?? "solo";
  const isSolo = mode === "solo";
  const fullName = getUserFullName(user ?? undefined);
  const isEnterprise = user?.user_type === "enterprise";

  const { sub, ready: subReady } = useClientGate();
  const { openRiskQuiz } = useProfilePanel();
  const isTrialing = subReady && sub.status === "trialing";

  const trialDaysLeft =
    isTrialing && sub.trialEndsAt
      ? Math.max(
          0,
          Math.ceil(
            (new Date(sub.trialEndsAt).getTime() - Date.now()) / 86_400_000,
          ),
        )
      : null;

  // ── Personal / Household Information ──────────────────────────────────────
  const personalFields: ProfileField[] = [
    ...(isSolo
      ? [
          { label: "First Name", value: user?.first_name ?? "" },
          { label: "Last Name", value: user?.last_name ?? "" },
        ]
      : [{ label: "Household Name", value: user?.display_name ?? "" }]),
    ...(isSolo && user?.date_of_birth
      ? [
          {
            label: "Date of Birth",
            value: format(new Date(user.date_of_birth), "dd MMM yyyy"),
          },
          { label: "Age", value: `${getUserAge(user)} years old` },
        ]
      : []),
    { label: "Account Type", value: accountModeLabel(mode) },
    ...(isSolo
      ? [
          { label: "Marital Status", value: ucFirst(user?.marital_status) },
          { label: "Occupation", value: user?.occupation ?? "" },
          { label: "Prefix", value: user?.prefix ?? "" },
          { label: "Gender", value: ucGender(user?.gender) },
        ]
      : []),
    {
      label: "Dependents",
      value: user?.dependents != null ? String(user.dependents) : "0",
    },
  ];

  // ── Contact ────────────────────────────────────────────────────────────────
  const contactFields: ProfileField[] = [
    { label: "Email", value: user?.email ?? "" },
    { label: "Phone", value: user?.phone_number ?? "" },
    { label: "Preferred Contact", value: user?.preferred_contact ?? "" },
  ];

  // ── Location ───────────────────────────────────────────────────────────────
  const locationFields: ProfileField[] = [
    { label: "Country of Residence", value: user?.resident_country ?? "" },
    ...(user?.resident_state
      ? [{ label: "State / Region", value: user.resident_state }]
      : []),
    { label: "City", value: user?.city ?? "" },
    {
      label: "Citizenship(s)",
      value: user?.citizenships?.join(", ") ?? "",
    },
  ];

  // ── Account Information ────────────────────────────────────────────────────
  const accountFields: ProfileField[] = [
    { label: "Account Currency", value: user?.currency ?? "" },
    {
      label: "Member Since",
      value: user?.created_at
        ? format(new Date(user.created_at), "MMMM yyyy")
        : "",
    },
    {
      label: "Account Status",
      value: user?.is_active ? "Active" : "Inactive",
    },
  ];

  // ── Enterprise ────────────────────────────────────────────────────────────
  const enterpriseFields: ProfileField[] = isEnterprise
    ? [
        { label: "Company", value: user?.enterprise_info?.company_name ?? "" },
        { label: "Company ID", value: user?.enterprise_info?.company_id ?? "" },
        {
          label: "Seat Granted",
          value: user?.enterprise_info?.seat_granted_at
            ? format(
                new Date(user.enterprise_info.seat_granted_at),
                "dd MMM yyyy",
              )
            : "",
        },
        {
          label: "Provisioned By",
          value: user?.enterprise_info?.seat_granted_by ?? "",
        },
      ]
    : [];

  // ── Financial Profile ──────────────────────────────────────────────────────
  const financialFields: ProfileField[] = [
    { label: "Risk Profile", value: riskLabel(user?.risk_profile) },
    ...(user?.bio ? [{ label: "Bio", value: user.bio }] : []),
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="max-w-5xl mx-auto space-y-6"
    >
      {/* Header - always visible */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Profile</h1>
          <p className="text-sm text-muted-foreground">
            A summary of your personal and financial information.
          </p>
        </div>
        <Link href="/dashboard/account/settings">
          <Button variant="outline" size="sm">
            Edit in Settings
          </Button>
        </Link>
      </div>

      {/* Avatar summary */}
      <div className="flex items-center gap-4 rounded-xl border bg-white p-6">
        <Avatar className="h-14 w-14">
          <AvatarFallback className="bg-[var(--brand-primary)] text-white text-sm">
            {loading ? "…" : getInitials(fullName)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-56" />
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold text-lg">{fullName}</p>
                <Badge variant="outline" className="text-xs">
                  {accountModeLabel(mode)}
                </Badge>
                {isEnterprise && (
                  <Badge className="text-xs bg-[var(--brand-primary)] text-white gap-1">
                    <Building2 className="h-3 w-3" />
                    Enterprise
                  </Badge>
                )}
                {isTrialing && (
                  <Badge className="text-xs bg-amber-100 text-amber-700 border-amber-200 gap-1">
                    Trial
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
              {isTrialing && trialDaysLeft !== null && (
                <p className="text-xs text-amber-600 font-medium mt-0.5">
                  {trialDaysLeft === 0
                    ? "Trial expires today"
                    : `${trialDaysLeft} day${trialDaysLeft === 1 ? "" : "s"} left in trial`}
                </p>
              )}
            </>
          )}
        </div>
      </div>

      <Section
        title={isSolo ? "Personal Information" : "Household Information"}
        fields={personalFields}
        loading={loading}
      />
      <Section
        title="Contact Details"
        fields={contactFields}
        loading={loading}
      />
      <Section title="Location" fields={locationFields} loading={loading} />
      <Section
        title="Account Information"
        fields={accountFields}
        loading={loading}
      />
      {/* Client ID - secondary / greyed, not part of primary display */}
      {!loading && user?.user_id && (
        <div className="rounded-xl border border-dashed bg-white px-6 py-3 flex items-center gap-3">
          <p className="text-xs text-muted-foreground/60 shrink-0">Client ID</p>
          <p className="text-xs font-mono text-muted-foreground/50 truncate">
            {user.user_id}
          </p>
        </div>
      )}
      <Section
        title="Financial Profile"
        fields={user?.bio ? [{ label: "Bio", value: user.bio }] : []}
        loading={loading}
      />
      {/* Risk profile row - rendered separately so we can attach the quiz button */}
      {!loading && (
        <div className="rounded-xl border bg-white">
          <div className="border-b px-6 py-4">
            <h3 className="text-sm font-semibold">Risk Profile</h3>
          </div>
          <div className="flex items-center justify-between px-6 py-5">
            <div>
              <p className="text-xs text-muted-foreground">Risk appetite</p>
              <p className="text-sm font-medium">
                {riskLabel(user?.risk_profile)}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={openRiskQuiz}>
              {user?.risk_profile ? "Retake quiz" : "Take quiz"}
            </Button>
          </div>
        </div>
      )}
      {isEnterprise && (
        <Section
          title="Enterprise Account"
          fields={enterpriseFields}
          loading={loading}
        />
      )}
    </motion.div>
  );
}
