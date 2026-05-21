import { useEffect, useRef } from "react";
import { Switch, Route, Router as WouterRouter, useLocation, Redirect } from "wouter";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { ClerkProvider, Show, useClerk } from "@clerk/react";
import { publishableKeyFromHost } from "@clerk/react/internal";
import { shadcn } from "@clerk/themes";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster as SonnerToaster } from "sonner";
import NotFound from "@/pages/not-found";
import Menu from "./pages/Menu";
import Game from "./pages/Game";
import Lobby from "./pages/Lobby";
import Results from "./pages/Results";
import SignInPage from "./pages/SignInPage";
import SignUpPage from "./pages/SignUpPage";
import Collection from "./pages/Collection";
import DeckEditor from "./pages/DeckEditor";

const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

if (!clerkPubKey) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY");
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: "clerk",
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: "#3b82f6",
    colorForeground: "#f8fafc",
    colorMutedForeground: "#94a3b8",
    colorDanger: "#ef4444",
    colorBackground: "#0f172a",
    colorInput: "#1e293b",
    colorInputForeground: "#f8fafc",
    colorNeutral: "#334155",
    fontFamily: "Inter, system-ui, sans-serif",
    borderRadius: "0.75rem",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox: "bg-slate-900 border border-slate-700 rounded-2xl w-[440px] max-w-full overflow-hidden shadow-[0_8px_0_rgba(0,0,0,0.4)]",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: "text-slate-50 font-black",
    headerSubtitle: "text-slate-400",
    socialButtonsBlockButton: "bg-slate-800 border border-slate-700 hover:bg-slate-700",
    socialButtonsBlockButtonText: "text-slate-100 font-semibold",
    formFieldLabel: "text-slate-300 font-semibold",
    formFieldInput: "bg-slate-800 border-slate-700 text-slate-100",
    formButtonPrimary: "bg-blue-600 hover:bg-blue-700 font-bold shadow-[0_4px_0_rgba(0,0,0,0.4)]",
    footerActionLink: "text-blue-400 hover:text-blue-300 font-semibold",
    footerActionText: "text-slate-400",
    dividerText: "text-slate-400",
    dividerLine: "bg-slate-700",
    logoImage: "h-10 mx-auto",
    logoBox: "py-2",
    identityPreviewEditButton: "text-blue-400",
    formFieldSuccessText: "text-emerald-400",
    alertText: "text-slate-100",
    alert: "bg-slate-800 border-slate-700",
    otpCodeFieldInput: "bg-slate-800 border-slate-700 text-slate-100",
    main: "px-6 py-4",
  },
};

const queryClient = new QueryClient();

function HomeRoute() {
  return (
    <>
      <Show when="signed-in"><Menu /></Show>
      <Show when="signed-out"><Menu /></Show>
    </>
  );
}

function GuardedGame() {
  return (
    <>
      <Show when="signed-in"><Game /></Show>
      <Show when="signed-out"><Redirect to="/sign-in" /></Show>
    </>
  );
}
function GuardedLobby() {
  return (
    <>
      <Show when="signed-in"><Lobby /></Show>
      <Show when="signed-out"><Redirect to="/sign-in" /></Show>
    </>
  );
}
function GuardedCollection() {
  return (
    <>
      <Show when="signed-in"><Collection /></Show>
      <Show when="signed-out"><Redirect to="/sign-in" /></Show>
    </>
  );
}
function GuardedDeckEditor() {
  return (
    <>
      <Show when="signed-in"><DeckEditor /></Show>
      <Show when="signed-out"><Redirect to="/sign-in" /></Show>
    </>
  );
}

function ClerkCacheInvalidator() {
  const { addListener } = useClerk();
  const qc = useQueryClient();
  const prev = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    const off = addListener(({ user }) => {
      const id = user?.id ?? null;
      if (prev.current !== undefined && prev.current !== id) qc.clear();
      prev.current = id;
    });
    return off;
  }, [addListener, qc]);
  return null;
}

function ClerkRouter() {
  const [, setLocation] = useLocation();
  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      localization={{
        signIn: { start: { title: "Bon retour !", subtitle: "Connectez-vous à France Royal" } },
        signUp: { start: { title: "Rejoins l'Arène", subtitle: "Crée ton compte France Royal" } },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkCacheInvalidator />
        <TooltipProvider>
          <Switch>
            <Route path="/"            component={HomeRoute} />
            <Route path="/sign-in/*?"  component={SignInPage} />
            <Route path="/sign-up/*?"  component={SignUpPage} />
            <Route path="/game"        component={GuardedGame} />
            <Route path="/lobby"       component={GuardedLobby} />
            <Route path="/collection"  component={GuardedCollection} />
            <Route path="/deck"        component={GuardedDeckEditor} />
            <Route path="/results"     component={Results} />
            <Route component={NotFound} />
          </Switch>
          <Toaster />
          <SonnerToaster theme="dark" position="top-center" />
        </TooltipProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <ClerkRouter />
    </WouterRouter>
  );
}

export default App;
