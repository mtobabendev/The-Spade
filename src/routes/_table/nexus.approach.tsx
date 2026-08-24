import { createFileRoute, Link } from "@tanstack/react-router";
import { Group, Panel, Separator } from "react-resizable-panels";
import { LIVE, REPOS } from "@/lib/nexus";
import { RepoLink } from "@/components/nexus/watch-rail";

export const Route = createFileRoute("/_table/nexus/approach")({ component: ApproachSplit });

const PATH = [
  { id: "Entry", note: "Show up. Bed. Rules. No speech." },
  { id: "A", note: "Habits. Check-ins. Keep the bed." },
  { id: "B", note: "Work starts counting." },
  { id: "C", note: "More keys. More responsibility." },
  { id: "D", note: "Almost out. Don't blow it." },
  { id: "Out", note: "Independent living. The point." },
];

const HELP = ["Job support", "Education", "Credit rebuild", "Rides", "Food pantry", "Gym", "Staff who answer"];

function ApproachSplit() {
  return (
    <div className="space-y-4">
      <header className="space-y-2">
        <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-pink">Different Approach</p>
        <h1 className="font-display text-3xl font-semibold tracking-tight">ChatGPT's site. Grok's rebuild.</h1>
        <p className="max-w-xl text-sm text-muted">
          The Mark I repo is still 404. The archive is not. Left pane is the actual ChatGPT landing
          frozen April 22, 2026 — Inter, desktop nav, eight links that do not fit a watch. Right pane
          is the Grok cut: phone and watch first, no invented headcount. Drag the seam. Same tab on
          a phone.
        </p>
        <div className="flex flex-wrap gap-x-4">
          <RepoLink href={REPOS.approachArchive}>Reference archive</RepoLink>
          <a
            href={LIVE.da}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-11 items-center text-sm text-blue hover:underline"
          >
            differentapproachomaha.org
          </a>
        </div>
      </header>

      <Group orientation="horizontal" className="split-stage" defaultLayout={{ gpt: 50, grok: 50 }}>
        <Panel id="gpt" minSize={28} className="split-pane">
          <p className="pane-stamp">ChatGPT · archived Apr 22 2026</p>
          <iframe
            title="ChatGPT Different Approach archive"
            src="/mark-i/index.html"
            className="mark-i-frame"
          />
        </Panel>
        <Separator className="split-seam" />
        <Panel id="grok" minSize={28} className="split-pane">
          <GrokDa />
        </Panel>
      </Group>
    </div>
  );
}

function GrokDa() {
  return (
    <div className="da-grok">
      <p className="da-kicker">Grok rebuild · watch first</p>
      <h2>A bed. A path. Then a key.</h2>
      <p>
        Different Approach Omaha is structured reentry housing — Entry through D into independent
        living. Not a campaign. Built by people who know what rebuilding actually takes.
      </p>
      <ol className="da-path">
        {PATH.map((step) => (
          <li key={step.id}>
            <span>{step.id}</span>
            <em>{step.note}</em>
          </li>
        ))}
      </ol>
      <h3>What you can actually get</h3>
      <ul className="da-help">
        {HELP.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <p>
        Real reentry support requires more than a bed. It requires a process, expectations, and
        forward motion one stage at a time.
      </p>
      <div className="da-actions">
        <a href="mailto:info@differentapproachomaha.org">Apply / ask — email</a>
        <Link to="/nexus/office">WildCard Office</Link>
      </div>
      <p className="da-fine">info@differentapproachomaha.org · Omaha · no fake headcount</p>
    </div>
  );
}
