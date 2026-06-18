import { redirect } from "next/navigation";

// /integrations is no longer a landing page — every service has its own
// sidebar entry under the INTEGRATIONS section. Redirect to the first service.
export default function IntegrationsRedirect() {
  redirect("/integrations/meta");
}
