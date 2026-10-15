import { Lock, Globe } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function AccessBadge({ access }: { access: "OPEN" | "RESTRICTED" }) {
  return access === "RESTRICTED" ? (
    <Badge variant="outline" className="gap-1"><Lock className="size-3" /> Restricted</Badge>
  ) : (
    <Badge variant="secondary" className="gap-1"><Globe className="size-3" /> Open</Badge>
  );
}
