import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { PreviewHostBridge } from "@/components/preview-host-bridge";
import appCss from "../styles.css?url";
import tarotCss from "../tarot.css?url";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "The Spade | Private Tarot Readings" },
      { name: "description", content: "Private live tarot readings hosted by Penny at The Spade." },
      { name: "theme-color", content: "#100a12" },
    ],
    links: [
      { rel: "icon", type: "image/jpeg", href: "/brand/penny-tarot.jpg" },
      { rel: "stylesheet", href: appCss },
      { rel: "stylesheet", href: tarotCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;700&family=Outfit:wght@400;500;600;700&family=Syne:wght@600;700;800&display=swap" },
    ],
  }),
  component: Root,
});

function Root() {
  return <html lang="en"><head><HeadContent /></head><body><PreviewHostBridge /><Outlet /><Scripts /></body></html>;
}
