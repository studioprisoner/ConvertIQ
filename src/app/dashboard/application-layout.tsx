"use client";

import { Avatar } from "@/components/avatar";
import { CompanyIcon } from "@/components/company-logo";

// Extended user type to include our custom fields
type ExtendedUser = {
  id: string;
  name: string;
  emailVerified: boolean;
  email: string;
  createdAt: Date;
  updatedAt: Date;
  image?: string | null;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
  onboardingCompleted?: boolean;
};
import {
  Dropdown,
  DropdownButton,
  DropdownDivider,
  DropdownItem,
  DropdownLabel,
  DropdownMenu,
} from "@/components/dropdown";
import {
  Navbar,
  NavbarItem,
  NavbarSection,
  NavbarSpacer,
} from "@/components/navbar";
import {
  Sidebar,
  SidebarBody,
  SidebarFooter,
  SidebarHeader,
  SidebarItem,
  SidebarLabel,
  SidebarSection,
  SidebarSpacer,
} from "@/components/sidebar";
import { SidebarLayout } from "@/components/sidebar-layout";
import { authClient, useSession } from "@/lib/auth-client";
import {
  ArrowRightStartOnRectangleIcon,
  ChevronUpIcon,
  LightBulbIcon,
  ShieldCheckIcon,
  UserCircleIcon,
} from "@heroicons/react/16/solid";
import {
  ChartBarIcon,
  ClockIcon,
  GlobeAltIcon,
  HomeIcon,
  QuestionMarkCircleIcon,
  SparklesIcon,
} from "@heroicons/react/20/solid";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { SupportDialog } from "@/components/support-dialog";
import { useFeatureGate } from "@/hooks/use-feature-gate";

function AccountDropdownMenu({
  anchor,
  onSignOut,
}: {
  anchor: "top start" | "bottom end";
  onSignOut: () => void;
}) {
  return (
    <DropdownMenu className="min-w-64" anchor={anchor}>
      <DropdownItem href="/dashboard/account">
        <UserCircleIcon />
        <DropdownLabel>My account</DropdownLabel>
      </DropdownItem>
      <DropdownDivider />
      <DropdownItem href="#">
        <ShieldCheckIcon />
        <DropdownLabel>Privacy policy</DropdownLabel>
      </DropdownItem>
      <DropdownDivider />
      <DropdownItem onClick={onSignOut}>
        <ArrowRightStartOnRectangleIcon />
        <DropdownLabel>Sign out</DropdownLabel>
      </DropdownItem>
    </DropdownMenu>
  );
}

export function ApplicationLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const redirectTimeoutRef = useRef<NodeJS.Timeout>();
  const [onboardingCheck, setOnboardingCheck] = useState<{
    completed?: boolean;
    checked: boolean;
  }>({ checked: false });
  const [isSupportDialogOpen, setIsSupportDialogOpen] = useState(false);
  const multipleWebsitesGate = useFeatureGate("multiple_websites");

  // Check onboarding status directly from database
  useEffect(() => {
    if (!isPending && session && !onboardingCheck.checked) {
      const checkOnboardingStatus = async () => {
        try {
          console.log("🔍 Checking onboarding status from database...");
          const response = await fetch("/api/auth/check-onboarding", {
            credentials: "include",
          });

          if (response.ok) {
            const result = await response.json();
            console.log("📋 Database onboarding check result:", result);

            setOnboardingCheck({
              completed: result.onboardingCompleted,
              checked: true,
            });

            // Redirect if needed
            if (!result.onboardingCompleted && pathname !== "/onboarding") {
              console.log("🎯 Redirecting to onboarding - not completed");
              router.push("/onboarding");
            } else if (result.onboardingCompleted) {
              console.log("✅ Onboarding is completed, staying on dashboard");
            }
          } else {
            console.error("❌ Failed to check onboarding status");
            setOnboardingCheck({ checked: true });
          }
        } catch (error) {
          console.error("❌ Error checking onboarding status:", error);
          setOnboardingCheck({ checked: true });
        }
      };

      checkOnboardingStatus();
    }
  }, [session, isPending, pathname, router, onboardingCheck.checked]);

  useEffect(() => {
    // Clear any existing timeout
    if (redirectTimeoutRef.current) {
      clearTimeout(redirectTimeoutRef.current);
    }

    if (!isPending && !session) {
      // Add a small delay to allow for session establishment during registration flow
      redirectTimeoutRef.current = setTimeout(() => {
        console.log("🚪 Redirecting to login - no session found after delay");
        router.push("/login");
      }, 1000); // 1 second delay
    }

    // Cleanup timeout on unmount or session change
    return () => {
      if (redirectTimeoutRef.current) {
        clearTimeout(redirectTimeoutRef.current);
      }
    };
  }, [session, isPending, router]);

  const handleSignOut = async () => {
    try {
      await authClient.signOut();
      router.push("/login");
    } catch (error) {
      console.error("Sign out failed:", error);
    }
  };

  if (isPending || (!session && redirectTimeoutRef.current)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="space-y-4 text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900 dark:border-white mx-auto"></div>
          <p className="text-gray-600 dark:text-gray-400">
            {isPending ? "Loading..." : "Establishing session..."}
          </p>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  const user = session.user as ExtendedUser;

  return (
    <SidebarLayout
      navbar={
        <Navbar>
          <NavbarSpacer />
          <NavbarSection>
            <Dropdown>
              <DropdownButton as={NavbarItem}>
                <Avatar
                  src={user?.avatarUrl || user?.image || undefined}
                  initials={
                    user?.name
                      ? user.name
                          .split(" ")
                          .map((n: string) => n[0])
                          .join("")
                          .toUpperCase()
                      : "U"
                  }
                  square
                />
              </DropdownButton>
              <AccountDropdownMenu
                anchor="bottom end"
                onSignOut={handleSignOut}
              />
            </Dropdown>
          </NavbarSection>
        </Navbar>
      }
      sidebar={
        <Sidebar>
          <SidebarHeader>
            <div className="flex items-center gap-3 px-4 py-3">
              <CompanyIcon width={36} height={36} className="flex-shrink-0" />
              <SidebarLabel className="text-xl font-bold font-mono dark:text-white text-black">
                ConvertIQ
              </SidebarLabel>
            </div>
          </SidebarHeader>

          <SidebarBody>
            <SidebarSection>
              <SidebarItem
                href="/dashboard/scan"
                current={
                  pathname === "/dashboard/scan" || pathname === "/dashboard"
                }
              >
                <HomeIcon />
                <SidebarLabel>Dashboard</SidebarLabel>
              </SidebarItem>
              <SidebarItem
                href="/dashboard/reports"
                current={pathname.startsWith("/dashboard/reports")}
              >
                <ChartBarIcon />
                <SidebarLabel>Reports</SidebarLabel>
              </SidebarItem>
              <SidebarItem
                href="/dashboard/history"
                current={pathname.startsWith("/dashboard/history")}
              >
                <ClockIcon />
                <SidebarLabel>History</SidebarLabel>
              </SidebarItem>
              {multipleWebsitesGate.hasAccess && (
                <SidebarItem
                  href="/dashboard/domains"
                  current={pathname.startsWith("/dashboard/domains")}
                >
                  <GlobeAltIcon />
                  <SidebarLabel>Domains</SidebarLabel>
                </SidebarItem>
              )}
            </SidebarSection>

            <SidebarSpacer />

            <SidebarSection>
              <SidebarItem onClick={() => setIsSupportDialogOpen(true)}>
                <QuestionMarkCircleIcon />
                <SidebarLabel>Support</SidebarLabel>
              </SidebarItem>
              <SidebarItem 
                href="/changelog"
                current={pathname === "/changelog"}
              >
                <SparklesIcon />
                <SidebarLabel>Changelog</SidebarLabel>
              </SidebarItem>
            </SidebarSection>
          </SidebarBody>

          <SidebarFooter className="max-lg:hidden">
            <Dropdown>
              <DropdownButton as={SidebarItem}>
                <span className="flex min-w-0 items-center gap-3">
                  <Avatar
                    src={user?.avatarUrl || user?.image || undefined}
                    initials={
                      user?.name
                        ? user.name
                            .split(" ")
                            .map((n: string) => n[0])
                            .join("")
                            .toUpperCase()
                        : "U"
                    }
                    className="size-10"
                    square
                    alt=""
                  />
                  <span className="min-w-0">
                    <span className="block truncate text-sm/5 font-medium text-zinc-950 dark:text-white">
                      {user?.name || "User"}
                    </span>
                    <span className="block truncate text-xs/5 font-normal text-zinc-500 dark:text-zinc-400">
                      {user?.email || ""}
                    </span>
                  </span>
                </span>
                <ChevronUpIcon />
              </DropdownButton>
              <AccountDropdownMenu
                anchor="top start"
                onSignOut={handleSignOut}
              />
            </Dropdown>
          </SidebarFooter>
        </Sidebar>
      }
    >
      {children}
      <SupportDialog
        isOpen={isSupportDialogOpen}
        onClose={() => setIsSupportDialogOpen(false)}
      />
    </SidebarLayout>
  );
}
