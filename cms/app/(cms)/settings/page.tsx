import { redirect } from "next/navigation";
import { SettingsForm } from "@/app/ui/settings-form";
import { getSession } from "@/lib/auth";
import { readStore } from "@/lib/store";

export default async function SettingsPage() {
  const session = await getSession();
  if (session?.role === "writer") redirect("/write");
  const { settings } = readStore();
  return (
    <>
      <h1 className="mb-1 text-lg font-semibold">설정</h1>
      <p className="mb-4 text-sm text-zinc-500">AI API와 발행할 블로그 채널을 연결합니다.</p>
      <SettingsForm provider={settings.provider} keys={settings.keys} channels={settings.channels} />
    </>
  );
}
