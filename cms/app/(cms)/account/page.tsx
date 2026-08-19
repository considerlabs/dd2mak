import { AccountForm } from "@/app/ui/account-form";

export default function AccountPage() {
  return (
    <>
      <div className="mb-6">
        <h1 className="page-title">계정</h1>
        <p className="page-desc">로그인 비밀번호를 관리합니다.</p>
      </div>
      <AccountForm />
    </>
  );
}
