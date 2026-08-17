import AppShell from "@/app/ui/shell";

export default function CmsLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
