import { redirect } from "next/navigation";

// Los trámites ahora se revisan junto con las solicitudes en una sola bandeja.
export default function TramitesRedirectPage() {
  redirect("/dashboard/solicitudes");
}
