import { redirect } from "next/navigation";

// The Insights dashboard was merged into the main dashboard home. Redirect any
// old links/bookmarks to /dashboard, which now hosts the insights overview.
export default function InsightsRedirect() {
  redirect("/dashboard");
}
