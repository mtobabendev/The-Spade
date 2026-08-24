import { createFileRoute, Outlet, useRouterState } from "@tanstack/react-router";
import { NEXUS_ROOMS } from "@/lib/nexus";
import { WatchRail } from "@/components/nexus/watch-rail";

export const Route = createFileRoute("/_table/nexus")({ component: NexusLayout });

function NexusLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const current = NEXUS_ROOMS.find((room) => room.to === pathname)?.id ?? "hub";
  return (
    <div className="space-y-6">
      <WatchRail current={current} />
      <Outlet />
    </div>
  );
}
