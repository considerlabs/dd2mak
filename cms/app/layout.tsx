import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({ subsets: ["latin"] });

export const metadata = {
  title: "블로그 관리",
  description: "블로그 글 작성·검수·워드프레스 자동 발행",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className={`${geist.className} h-full`}>
      <body className="min-h-full bg-zinc-100 text-zinc-900">{children}</body>
    </html>
  );
}
