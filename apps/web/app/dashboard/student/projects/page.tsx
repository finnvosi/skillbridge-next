import { redirect } from "next/navigation";

// Retired: the editorial Discover page is now the single source of truth
// for browsing opportunities. Redirect any legacy link/bookmark here.
export default function StudentProjectsIndex() {
  redirect("/dashboard/student/discover");
}
