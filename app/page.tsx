// app/page.tsx
import { redirect } from "next/navigation";

export default function RootPage() {
  // Default UI language
  redirect("/en");
}
