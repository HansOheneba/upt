"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";

import { motion, AnimatePresence } from "framer-motion";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChartPie,
  faChartLine,
  faBullseye,
  faBriefcase,
  faHouse,
  faShieldHalved,
  faMoneyBillWave,
  faUmbrellaBeach,
  faBrain,
  faBellConcierge,
  faHeadset,
  faScaleUnbalanced,
  faCalendarDays,
  faEnvelope,
  faFileLines,
  faListCheck,
  faCoins,
  faRightLeft,
} from "@fortawesome/free-solid-svg-icons";

import { useFinancialStore } from "@/store/financialStore";
import { useShallow } from "zustand/react/shallow";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ChevronDown, Settings, LogOut, UserIcon, Zap } from "lucide-react";
import {
  clearAuth,
  clearUserProfile,
  getUserFullName,
} from "@/lib/client-data";
import { useClientGate } from "@/hooks/useClientGate";
import { useEffect, useMemo, useState } from "react";
import { useProfilePanel } from "./profile-panel-context";
import { useMockUpgrade } from "@/hooks/useMockUpgrade";
import { isDemoPath, toDemoPath } from "@/lib/demo-mode";
import { brand } from "@/lib/tenant";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";

type NavItem = {
  label: string;
  href: string;
  icon: IconDefinition;
};

type NavSection = {
  label: string | null;
  items: NavItem[];
};

const wealthNavSections: NavSection[] = [
  {
    label: null,
    items: [{ label: "Overview", href: "/dashboard", icon: faChartPie }],
  },
  {
    label: "Wealth",
    items: [
      { label: "Assets", href: "/dashboard/assets", icon: faBriefcase },
      { label: "Properties", href: "/dashboard/properties", icon: faHouse },
      {
        label: "Investment Opportunities",
        href: "/dashboard/opportunities",
        icon: faChartLine,
      },
    ],
  },
  {
    label: "Planning",
    items: [
      { label: "Goals & Planning", href: "/dashboard/goals", icon: faBullseye },
      { label: "Cash Flow", href: "/dashboard/cash-flow", icon: faMoneyBillWave },
      { label: "Liabilities", href: "/dashboard/liabilities", icon: faScaleUnbalanced },
      { label: "Insurance", href: "/dashboard/insurance", icon: faShieldHalved },
      { label: "Retirement", href: "/dashboard/retirement", icon: faUmbrellaBeach },
    ],
  },
  {
    label: "Relationship",
    items: [
      { label: "Appointments", href: "/dashboard/appointments", icon: faCalendarDays },
      { label: "Messages", href: "/dashboard/messages", icon: faEnvelope },
      { label: "Tasks", href: "/dashboard/tasks", icon: faListCheck },
      { label: "Documents", href: "/dashboard/documents", icon: faFileLines },
    ],
  },
  {
    label: "Insights",
    items: [
      { label: "Celerey Copilot", href: "/dashboard/ai", icon: faBrain },
      { label: "Concierge", href: "/dashboard/concierge", icon: faBellConcierge },
    ],
  },
];

const pensionNavSections: NavSection[] = [
  {
    label: null,
    items: [{ label: "Overview", href: "/dashboard", icon: faChartPie }],
  },
  {
    label: "My Own Pension",
    items: [
      { label: "Contributions", href: "/dashboard/contributions", icon: faCoins },
      { label: "Withdrawals", href: "/dashboard/withdrawals", icon: faRightLeft },
      { label: "Requests", href: "/dashboard/requests", icon: faEnvelope },
      { label: "Statement", href: "/dashboard/statement", icon: faFileLines },
    ],
  },
];

export default function DashboardSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { state, isMobile, setOpenMobile } = useSidebar();
  const collapsed = !isMobile && state === "collapsed";
  const closeMobile = () => {
    if (isMobile) setOpenMobile(false);
  };

  const user = useFinancialStore((s) => s.user);
  const displayName = user ? getUserFullName(user) : "";
  const userEmail = user?.email ?? "";
  const [mounted, setMounted] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const { upgrading, upgrade: handleUpgrade } = useMockUpgrade();
  useEffect(() => setMounted(true), []);

  const { sub } = useClientGate();

  // Trial end date, formatted for display
  const trialEndsLabel = useMemo(() => {
    if (!sub.trialEndsAt) return null;
    return new Date(sub.trialEndsAt).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }, [sub.trialEndsAt]);

  const showUpgradeWidget = !collapsed && mounted && sub.status === "trialing";

  const profileCompletionScore = useFinancialStore(
    (s) => s.profileCompletionScore,
  );
  const { isOpen, open: openProfilePanel } = useProfilePanel();
  const inDemo = isDemoPath(pathname);
  const pensionNav = brand.id === "upt";
  const navSections = pensionNav ? pensionNavSections : wealthNavSections;
  const navHref = (href: string) =>
    inDemo && !pensionNav ? toDemoPath(href) : href;
  const homeHref = inDemo ? toDemoPath("/dashboard") : "/dashboard";

  // ── Attention badges: incomplete checklist items mapped to their nav href ──
  const attentionHrefs = useFinancialStore(
    useShallow((s) => {
      const hrefs: string[] = [];
      if (!s.goals.length) hrefs.push("/dashboard/goals");
      if (!s.holdings.length && !s.accounts.length)
        hrefs.push("/dashboard/assets");
      const hasAnyInsurance =
        s.insurancePolicies.length > 0 ||
        s.propertyAssets.some((p) => p.is_active && p.insurance.length > 0);
      if (!hasAnyInsurance) hrefs.push("/dashboard/insurance");
      if (
        !s.incomeRows.length ||
        !s.expenseCategories.length ||
        !s.emergencyFund.currentCashBalance
      )
        hrefs.push("/dashboard/cash-flow");
      const hasAnyLiability =
        s.liabilities.length > 0 ||
        s.propertyAssets.some((p) => p.is_active && !!p.mortgage);
      if (!hasAnyLiability) hrefs.push("/dashboard/liabilities");
      if (!s.retirement.desiredMonthlyIncome || !s.retirement.retirementAge)
        hrefs.push("/dashboard/retirement");
      return hrefs;
    }),
  );

  return (
    <Sidebar
      collapsible="icon"
      variant="sidebar"
      className="border-r border-white/10 text-white/80"
    >
      {/* ── Header: Logo ── */}
      <SidebarHeader className="sticky top-0 z-10 h-16 flex-row items-center justify-center border-b border-white/10 p-0 px-3">
        <Link
          href={homeHref}
          onClick={closeMobile}
          className="flex h-12 w-full items-center justify-center overflow-hidden"
        >
          {/* w-full tracks the rail width so both marks stay centered when toggling */}
          <div className="relative h-12 w-full max-w-48">
            <motion.div
              animate={{ opacity: collapsed ? 0 : 1 }}
              transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] as const }}
              className="absolute inset-0 flex items-center justify-center"
              aria-hidden={collapsed}
            >
              <Image
                src={brand.logo.light}
                alt={brand.name}
                width={260}
                height={72}
                priority
                className={
                  brand.logoClassName?.sidebarWordmark ??
                  brand.logoClassName?.wordmark ??
                  "h-12 w-auto max-w-full object-contain"
                }
              />
            </motion.div>
            <motion.div
              animate={{ opacity: collapsed ? 1 : 0 }}
              transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] as const }}
              className="absolute inset-0 flex items-center justify-center"
              aria-hidden={!collapsed}
            >
              <Image
                src={brand.logo.symbol}
                alt={brand.name}
                width={36}
                height={36}
                priority
                className={brand.logoClassName?.symbol ?? "size-9 object-contain"}
              />
            </motion.div>
          </div>
        </Link>
      </SidebarHeader>

      {/* ── Nav ── */}
      <SidebarContent className="px-0">
        {navSections.map((section, sectionIndex) => (
          <SidebarGroup
            key={section.label ?? "overview"}
            className={`p-0 px-2 ${sectionIndex === 0 ? "pt-2" : "pt-3"}`}
          >
            {section.label ? (
              <SidebarGroupLabel className="h-7 px-2.5 text-[10px] font-medium uppercase tracking-[0.14em] text-white/40">
                {section.label}
              </SidebarGroupLabel>
            ) : null}
            <SidebarGroupContent>
              <SidebarMenu className="flex flex-col gap-0.5">
                {section.items.map((item) => {
                  const href = navHref(item.href);
                  const active =
                    href === homeHref
                      ? pathname === homeHref
                      : pathname.startsWith(href);

                  const tourNavId =
                    item.href === "/dashboard"
                      ? "overview"
                      : (item.href.split("/").pop() ?? "overview");

                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        asChild
                        isActive={active}
                        tooltip={item.label}
                        className={`
                    relative rounded-md h-11 md:h-9 px-2.5
                    transition-[color,background-color,transform] duration-160 ease-out
                    active:scale-[0.97]
                    ${active ? "bg-white/15" : "hover:bg-white/8"}
                  `}
                      >
                        <Link
                          className="flex items-center gap-2.5"
                          href={href}
                          data-tour-nav={tourNavId}
                          onClick={closeMobile}
                        >
                          <span className="shrink-0">
                            <FontAwesomeIcon
                              icon={item.icon}
                              className={`
                          h-4 w-4
                          ${active ? "text-white" : "text-white/50"}
                        `}
                              fixedWidth
                            />
                          </span>

                          <AnimatePresence initial={false}>
                            {!collapsed && (
                              <motion.span
                                key="label"
                                initial={{
                                  opacity: 0,
                                  transform: "translateX(-4px)",
                                }}
                                animate={{
                                  opacity: 1,
                                  transform: "translateX(0px)",
                                }}
                                exit={{
                                  opacity: 0,
                                  transform: "translateX(-4px)",
                                }}
                                transition={{
                                  duration: 0.14,
                                  ease: [0.23, 1, 0.32, 1] as const,
                                }}
                                className={`
                            text-sm leading-tight whitespace-nowrap
                            ${active ? "text-white font-medium" : "text-white/90"}
                          `}
                              >
                                {item.label}
                              </motion.span>
                            )}
                          </AnimatePresence>
                        </Link>
                      </SidebarMenuButton>

                      <AnimatePresence>
                        {attentionHrefs.includes(item.href) && (
                          <motion.span
                            key="badge"
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            transition={{
                              type: "spring",
                              damping: 16,
                              stiffness: 300,
                            }}
                            className="pointer-events-none absolute top-1.5 left-1.5 flex size-2"
                          >
                            <span className="relative inline-flex size-2 rounded-full bg-blue-200" />
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarSeparator className="my-2 bg-white/10" />

      {/* ── Profile Completion (above trial widget) ── */}
      <AnimatePresence initial={false}>
        {!pensionNav && !collapsed && profileCompletionScore < 100 && (
          <motion.div
            key="profile-completion"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden px-2 pb-1.5"
          >
            <button
              type="button"
              onClick={() => {
                closeMobile();
                openProfilePanel();
              }}
              className="w-full text-left rounded-md border border-white/12 bg-white/6 hover:bg-white/10 transition-[color,background-color,transform] duration-160 ease-out active:scale-[0.97] px-2.5 py-2 space-y-1.5"
            >
              <p className="text-[11px] font-medium text-white/75 leading-none">
                Your profile is{" "}
                <span className="font-semibold text-white tabular-nums">
                  {profileCompletionScore}%
                </span>{" "}
                complete
              </p>
              <div className="h-1 rounded-full bg-white/12 overflow-hidden">
                <motion.div
                  initial={{ transform: "scaleX(0)" }}
                  animate={{
                    transform: `scaleX(${Math.max(profileCompletionScore, 0) / 100})`,
                  }}
                  transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] as const }}
                  className="h-full origin-left rounded-full bg-white/90"
                />
              </div>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Upgrade to Pro Widget ── */}
      <AnimatePresence initial={false}>
        {!pensionNav && showUpgradeWidget && (
          <motion.div
            key="upgrade-widget"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden px-2 pb-1.5"
          >
            <div className="space-y-1.5 rounded-md border border-white/12 bg-white/6 px-2.5 py-2">
              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-white/70">
                Trial account
              </p>
              <p className="text-[11px] leading-snug text-white/70">
                Upgrade to Pro for full access to all {brand.name} features.
              </p>
              <button
                type="button"
                onClick={() => {
                  closeMobile();
                  void handleUpgrade();
                }}
                disabled={upgrading}
                className="w-full rounded-md bg-white px-3 py-1.5 text-[11px] font-medium text-[var(--brand-primary)] transition-[color,background-color,transform] duration-160 ease-out hover:bg-white/90 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-70 disabled:active:scale-100"
              >
                {upgrading ? "Starting checkout…" : "Upgrade to Pro"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Footer ── */}
      <SidebarFooter className="px-2 pb-[max(0.625rem,env(safe-area-inset-bottom))] space-y-0.5">
        {/* Support */}
        {pensionNav ? null : (
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              tooltip="Support"
              className="h-9 hover:bg-white/8 active:scale-[0.97]"
            >
              <Link
                href={navHref("/dashboard/support")}
                onClick={closeMobile}
                className="flex items-center gap-2.5 px-2.5"
              >
                <FontAwesomeIcon
                  icon={faHeadset}
                  className="h-4 w-4 text-white/40"
                  fixedWidth
                />
                <AnimatePresence initial={false}>
                  {!collapsed && (
                    <motion.span
                      key="support-label"
                      initial={{ opacity: 0, transform: "translateX(-4px)" }}
                      animate={{ opacity: 1, transform: "translateX(0px)" }}
                      exit={{ opacity: 0, transform: "translateX(-4px)" }}
                      transition={{
                        duration: 0.14,
                        ease: [0.23, 1, 0.32, 1] as const,
                      }}
                      className="text-sm text-white/60"
                    >
                      Support
                    </motion.span>
                  )}
                </AnimatePresence>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
