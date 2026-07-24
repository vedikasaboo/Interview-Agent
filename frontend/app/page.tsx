import { redirect } from "next/navigation";

// Root sends users into the app; the (protected) guard bounces them to /login
// if they're not authenticated.
export default function Home() {
  redirect("/dashboard");
}
