import type { ReactNode } from "react";
import { Badge } from "@/ui/badge";
import { Spinner } from "@/ui/spinner";

// Spinner plus label for a pane that is still loading.
export function LoadingBadge({ children }: { children: ReactNode }) {
    return (
        <Badge variant="outline">
            <Spinner className="text-primary" />
            {children}
        </Badge>
    );
}
