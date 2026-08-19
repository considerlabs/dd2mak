import { AccountForm } from "@/app/ui/account-form";

export default function AccountPage() {
  return (
    <>
      <div className="mb-6">
        <h1 className="page-title">내 정보</h1>
        <p className="page-desc">비밀번호 변경과 로그아웃을 관리합니다.</p>
      </div>
      <AccountForm />
    </>
  );
}
