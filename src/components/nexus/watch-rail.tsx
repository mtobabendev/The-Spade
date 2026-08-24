import { Link } from "@tanstack/react-router";
import { NEXUS_ROOMS } from "@/lib/nexus";
import { cn } from "@/lib/utils";

export function WatchRail({ current }: { current: string }) {
  return (
    <nav className="watch-rail" aria-label="Nexus rooms">
      {NEXUS_ROOMS.map((room) => (
        <Link
          key={room.id}
          to={room.to}
          className={cn("watch-chip", current === room.id && "is-current")}
        >
          <span className="font-mono text-[10px] tracking-widest text-pink">{room.rank}</span>
          {room.label}
        </Link>
      ))}
    </nav>
  );
}

export function RepoLink({ href, children }: { href: string; children: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex min-h-11 items-center text-sm text-blue hover:underline"
    >
      {children}
    </a>
  );
}
