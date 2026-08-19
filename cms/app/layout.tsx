import "./globals.css";

export const metadata = {
  title: "블로그 스튜디오",
  description: "블로그 글 작성·검수·워드프레스 자동 발행",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="h-full">
      <body className="min-h-full bg-background text-foreground antialiased">{children}</body>
    </html>
  );
}
