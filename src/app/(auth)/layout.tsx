import { AuthLayout } from "@/components/layouts/auth-layout";

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthLayout>{children}</AuthLayout>;
}
