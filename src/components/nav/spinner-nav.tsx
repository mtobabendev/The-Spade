import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { folderForPath, MAIN_SPINNER, type SpinnerNode } from "@/lib/nav-tree";
import { CardSpinner } from "@/components/nav/card-spinner";
import { cn } from "@/lib/utils";

const IDLE_MS = 5000;

export function SpinnerNav() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [folder, setFolder] = useState<SpinnerNode | null>(null);
  const [leaving, setLeaving] = useState(false);
  const idle = useRef<ReturnType<typeof setTimeout> | null>(null);
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function clearIdle() {
    if (idle.current) clearTimeout(idle.current);
    idle.current = null;
  }

  function closeFolder() {
    clearIdle();
    setLeaving(true);
    if (leaveTimer.current) clearTimeout(leaveTimer.current);
    leaveTimer.current = setTimeout(() => {
      setFolder(null);
      setLeaving(false);
    }, 160);
  }

  function openFolder(node: SpinnerNode) {
    if (leaveTimer.current) clearTimeout(leaveTimer.current);
    setLeaving(false);
    setFolder(node);
    armIdle();
  }

  function armIdle() {
    clearIdle();
    idle.current = setTimeout(() => closeFolder(), IDLE_MS);
  }

  useEffect(() => () => clearIdle(), []);

  useEffect(() => {
    const current = folderForPath(pathname);
    if (current?.children?.length) {
      openFolder(current);
    }
    // Main spinner stays. Nested spinner only lives while you are in a folder.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  function go(node: SpinnerNode) {
    if (node.to) {
      const opts: { to: string; params?: Record<string, string>; search?: Record<string, string> } = {
        to: node.to,
      };
      if (node.params) opts.params = node.params;
      if (node.search) opts.search = node.search;
      void navigate(opts as never);
    }
    const fromMain = MAIN_SPINNER.some((n) => n.id === node.id);
    if (node.children?.length) {
      openFolder(node);
    } else if (fromMain) {
      closeFolder();
    } else {
      armIdle();
    }
  }

  return (
    <div className="spinner-dock" onPointerDown={folder ? armIdle : undefined}>
      {folder?.children?.length ? (
        <div className={cn("spinner-layer--sub", leaving && "is-leaving")}>
          <CardSpinner
            key={folder.id}
            nodes={folder.children}
            sub
            onPick={go}
            onInteract={armIdle}
          />
        </div>
      ) : null}
      <CardSpinner nodes={MAIN_SPINNER} activeId={folder?.id} onPick={go} />
    </div>
  );
}
