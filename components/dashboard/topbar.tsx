"use client";

import { SidebarTrigger } from "@/components/ui/sidebar";
import Breadcrumbs from "./breadcrumbs";
import { Popover, PopoverTrigger } from "@/components/ui/popover";
import { Popover as PopoverPrimitive } from "radix-ui";
import { Bell, UserCheck, Clock } from "lucide-react";
import { useFinancialStore } from "@/store/financialStore";
import { useProfilePanel } from "./profile-panel-context";
import { Progress } from "@/components/ui/progress";
import { getUserFullName } from "@/lib/client-data";
import { useEffect, useState } from "react";
import { brand } from "@/lib/tenant";
import { usePensionStore } from "@/store/pensionStore";
import { memberName } from "@/lib/pension/metrics";

import {
  DropdownMenu,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DropdownMenu as DropdownMenuRadix } from "radix-ui";
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
import { Settings, LogOut, UserIcon, Loader2, ChevronDown } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useClientGate } from "@/hooks/useClientGate";
import { useMockUpgrade } from "@/hooks/useMockUpgrade";
import { resetSession } from "@/lib/session-reset";

export default function DashboardTopbar() {
  const profileCompletionScore = useFinancialStore(
    (s) => s.profileCompletionScore,
  );
  const user = useFinancialStore((s) => s.user);
  const pensionMember = usePensionStore((s) => s.member);
  const { open: openProfilePanel } = useProfilePanel();
  const router = useRouter();
  const incomplete = brand.id === "upt" ? false : profileCompletionScore < 100;
  const [mounted, setMounted] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifEverOpened, setNotifEverOpened] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [dropdownEverOpened, setDropdownEverOpened] = useState(false);
  const { upgrading, upgrade: handleUpgradeFromNotif } = useMockUpgrade({
    onSuccess: () => setNotifOpen(false),
  });
  useEffect(() => setMounted(true), []);

  const { sub } = useClientGate();
  const isTrialing = mounted && sub.status === "trialing";
  const trialDaysLeft =
    isTrialing && sub.trialEndsAt
      ? Math.max(
          0,
          Math.ceil(
            (new Date(sub.trialEndsAt).getTime() - Date.now()) / 86_400_000,
          ),
        )
      : null;
  const hasNotifications = incomplete || isTrialing;

  const pensionLabel =
    brand.id === "upt" && pensionMember ? memberName(pensionMember) : "";
  const displayName = pensionLabel || (user ? getUserFullName(user) : "");
  const userEmail =
    brand.id === "upt" && pensionMember
      ? pensionMember.email
      : (user?.email ?? "");
  const initials = mounted
    ? displayName
        .split(" ")
        .slice(0, 2)
        .map((n) => n[0])
        .join("")
    : "";

  return (
    <div className="sticky top-0 z-20 flex items-center justify-between border-b bg-white px-3 sm:px-6 h-16 gap-2 overflow-x-clip print:hidden">
      {/* LEFT SIDE */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
        <SidebarTrigger />
        <div className="min-w-0 truncate">
          <Breadcrumbs />
        </div>
      </div>

      {/* RIGHT SIDE */}
      <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
        {/* Bell / Notifications */}
        <Popover
          open={notifOpen}
          onOpenChange={(v) => {
            if (v) setNotifEverOpened(true);
            setNotifOpen(v);
          }}
        >
          <PopoverTrigger asChild>
            <button className="relative rounded-md p-2 hover:bg-muted transition-[background-color,transform] duration-160 ease-out active:scale-[0.97]">
              <Bell className="h-5 w-5 text-gray-500" />
              {/* Pulsing dot when there are notifications */}
              {hasNotifications && (
                <span className="absolute top-1 right-1 flex size-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75 motion-reduce:animate-none" />
                  <span className="relative inline-flex size-2 rounded-full bg-blue-500" />
                </span>
              )}
            </button>
          </PopoverTrigger>
          <PopoverPrimitive.Portal>
            <PopoverPrimitive.Content
              forceMount
              align="end"
              sideOffset={4}
              className={[
                "z-50 w-[min(20rem,calc(100vw-1.5rem))] overflow-hidden rounded-xl border bg-white p-0 text-popover-foreground shadow-md outline-none",
                notifOpen
                  ? "animate-fade-down animate-duration-200 animate-ease-out"
                  : notifEverOpened
                    ? "animate-fade-down animate-reverse animate-duration-150 animate-ease-out animate-fill-forwards pointer-events-none"
                    : "hidden",
              ].join(" ")}
            >
              <div className="px-4 py-3 border-b">
                <p className="text-sm font-semibold text-gray-800">
                  Notifications
                </p>
              </div>

              {/* Profile completion notification */}
              {incomplete && (
                <div className="flex items-start gap-3 px-4 py-4 border-b bg-white">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                    <UserCheck className="h-4 w-4" />
                  </span>
                  <div className="flex-1 min-w-0 space-y-2">
                    <div>
                      <p className="text-xs font-semibold text-gray-800 leading-snug">
                        Complete your profile
                      </p>
                      <p className="text-[11px] text-gray-500 leading-snug mt-0.5">
                        Your profile is {profileCompletionScore}% complete.
                        Finish setting up to unlock deeper insights.
                      </p>
                    </div>
                    <Progress value={profileCompletionScore} className="h-1" />
                    <button
                      type="button"
                      onClick={() => {
                        setNotifOpen(false);
                        openProfilePanel();
                      }}
                      className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 transition-colors"
                    >
                      Complete profile →
                    </button>
                  </div>
                </div>
              )}

              {/* Trial notification */}
              {isTrialing && (
                <div className="flex items-start gap-3 px-4 py-4 border-b bg-white">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                    <Clock className="h-4 w-4" />
                  </span>
                  <div className="flex-1 min-w-0 space-y-2">
                    <div>
                      <p className="text-xs font-semibold text-gray-800 leading-snug">
                        {trialDaysLeft === 0
                          ? "Trial expires today"
                          : `${trialDaysLeft} day${trialDaysLeft === 1 ? "" : "s"} left in trial`}
                      </p>
                      <p className="text-[11px] text-gray-500 leading-snug mt-0.5">
                        Upgrade to Premium for full access to all {brand.name}
                        {" "}features.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleUpgradeFromNotif}
                      disabled={upgrading}
                      className="text-[11px] font-semibold text-amber-600 hover:text-amber-700 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                      {upgrading
                        ? "Starting checkout…"
                        : "Upgrade to Premium →"}
                    </button>
                  </div>
                </div>
              )}

              {/* Empty state */}
              {!hasNotifications && (
                <div className="flex flex-col items-center gap-2 py-6 text-center">
                  <Bell className="h-7 w-7 text-gray-200" />
                  <p className="text-xs text-gray-400">No notifications</p>
                </div>
              )}
            </PopoverPrimitive.Content>
          </PopoverPrimitive.Portal>
        </Popover>

        {/* Divider */}
        <div className="hidden sm:block h-8 w-px bg-gray-200" />

        {/* User profile dropdown */}
        <AlertDialog>
          <DropdownMenu
            open={dropdownOpen}
            onOpenChange={(v) => {
              if (v) setDropdownEverOpened(true);
              setDropdownOpen(v);
            }}
          >
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-1.5 sm:gap-2.5 rounded-lg px-1 sm:px-2 py-1.5 hover:bg-gray-100 transition-[background-color,transform] duration-160 ease-out active:scale-[0.97] text-left">
                <div className="hidden md:flex flex-col text-right max-w-45">
                  <span className="text-sm font-semibold text-gray-800 leading-tight truncate">
                    {mounted ? displayName : ""}
                  </span>
                  <span className="text-xs text-gray-500 leading-tight truncate">
                    {userEmail}
                  </span>
                </div>
                <Avatar className="h-9 w-9 shrink-0 ring-2 ring-white">
                  <AvatarFallback className="bg-[var(--brand-primary)] text-white text-sm font-semibold">
                    {mounted
                      ? displayName
                          .split(" ")
                          .slice(0, 2)
                          .map((n) => n[0])
                          .join("")
                      : ""}
                  </AvatarFallback>
                </Avatar>
                <ChevronDown className="hidden sm:block h-3.5 w-3.5 text-gray-400 shrink-0" />
              </button>
            </DropdownMenuTrigger>

            <DropdownMenuRadix.Portal>
              <DropdownMenuRadix.Content
                forceMount
                side="bottom"
                align="end"
                sideOffset={4}
                className={[
                  "z-50 w-56 overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md",
                  dropdownOpen
                    ? "animate-fade-down animate-duration-200 animate-ease-out"
                    : dropdownEverOpened
                      ? "animate-fade-down animate-reverse animate-duration-150 animate-ease-out animate-fill-forwards pointer-events-none"
                      : "hidden",
                ].join(" ")}
              >
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-0.5">
                    <p className="text-sm font-medium">
                      {mounted ? displayName : ""}
                    </p>
                    <p className="text-xs text-muted-foreground">{userEmail}</p>
                  </div>
                </DropdownMenuLabel>

                <DropdownMenuSeparator />

                {brand.id === "upt" ? null : (
                <DropdownMenuGroup>
                  <DropdownMenuItem asChild>
                    <Link
                      href="/dashboard/account/profile"
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <UserIcon className="h-4 w-4" />
                      Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link
                      href="/dashboard/account/settings"
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <Settings className="h-4 w-4" />
                      Account Settings
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                )}

                {brand.id === "upt" ? null : <DropdownMenuSeparator />}

                <AlertDialogTrigger asChild>
                  <DropdownMenuItem
                    className="text-destructive cursor-pointer focus:text-destructive"
                    onSelect={(e) => e.preventDefault()}
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign out
                  </DropdownMenuItem>
                </AlertDialogTrigger>
              </DropdownMenuRadix.Content>
            </DropdownMenuRadix.Portal>
          </DropdownMenu>

          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Sign out?</AlertDialogTitle>
              <AlertDialogDescription>
                You&apos;ll be returned to the sign-in page. Any unsaved changes
                will be lost.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={loggingOut}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                disabled={loggingOut}
                className="bg-destructive hover:bg-destructive/90 text-white min-w-25"
                onClick={async (e) => {
                  e.preventDefault();
                  setLoggingOut(true);
                  try {
                    await fetch("/api/auth/sign-out", { method: "POST" });
                  } catch {
                    // ignore - still clear local state
                  }
                  resetSession();
                  router.replace("/");
                }}
              >
                {loggingOut ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Signing out…
                  </span>
                ) : (
                  "Sign out"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
