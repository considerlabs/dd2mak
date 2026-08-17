import { redirect } from "next/navigation";

export default function PublishedPage() {
  redirect("/posts?status=publish");
}
