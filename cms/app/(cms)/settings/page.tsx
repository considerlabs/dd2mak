import { redirect } from "next/navigation";
import { SettingsForm } from "@/app/ui/settings-form";
import { getSession } from "@/lib/auth";
import { readStore } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await getSession();
  if (session?.role === "writer") redirect("/write");
  const { settings } = readStore();
  return (
    <>
      <div className="mb-6">
        <h1 className="page-title">설정</h1>
        <p className="page-desc">AI API, 발행 채널, 분석 API, Copilot AI를 연결합니다.</p>
      </div>
      <SettingsForm
        provider={settings.provider}
        keys={settings.keys}
        channels={settings.channels}
        analyze={settings.analyze || { naverClientId: "", naverClientSecret: "" }}
        copilot={
          settings.copilot || {
            enabled: true,
            tenantId: "",
            clientId: "",
            clientSecret: "",
            apiBaseUrl: "",
            siteName: "",
            siteUrl: "",
            categories: "",
            audience: "",
            notes: "",
          }
        }
      />
    </>
  );
}
