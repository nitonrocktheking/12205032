import { useEffect, useRef } from "react";
import { Switch, Route, Router as WouterRouter, useLocation, Redirect } from "wouter";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { ClerkProvider, Show, useClerk, useUser } from "@clerk/react";
import { publishableKeyFromHost } from "@clerk/react/internal";
import { shadcn } from "@clerk/themes";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster as SonnerToaster } from "sonner";
import NotFound from "@/pages/not-found";
import Menu from "./pages/Menu";
import Game from "./pages/Game";
import Lobby from "./pages/Lobby";
import Play from "./pages/Play";
import Results from "./pages/Results";
import SignInPage from "./pages/SignInPage";
import SignUpPage from "./pages/SignUpPage";
import Collection from "./pages/Collection";
import DeckEditor from "./pages/DeckEditor";
import Progression from "./pages/Progression";
import Admin from "./pages/Admin";
import UsernameSetup from "./pages/UsernameSetup";
import Splash from "./pages/Splash";
import { useMe } from "./hooks/useMe";
import { GuestExitHandler, useIsGuest } from "./hooks/useGuest";

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

// Gates a signed-in screen behind the username setup. While /api/me is loading we render
// a tiny placeholder so we don't flicker the inner page or the setup screen.
function RequireUsername({ children }: { children: React.ReactNode }) {
  const { data: me, isLoading, isError } = useMe();
  if (isLoading || (!me && !isError)) {
    return <div className="min-h-screen w-full flex items-center justify-center bg-slate-950 text-slate-500 text-sm">Chargement…</div>;
  }
  if (isError || !me) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-slate-950 text-slate-300 text-sm p-6 text-center">
        Connexion au serveur impossible. Vérifie ta connexion puis recharge la page.
      </div>
    );
  }
  if (!me.profile.displayName) {
    return <UsernameSetup />;
  }
  return <>{children}</>;
}

// Auth gate that accepts both Clerk-signed-in users AND guest-session users.
// Renders the child page only once authed; otherwise redirects to /sign-in.
function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn } = useUser();
  const isGuest = useIsGuest();
  if (!isLoaded) {
    return <div className="min-h-screen w-full flex items-center justify-center bg-slate-950 text-slate-500 text-sm">Chargement…</div>;
  }
  if (!isSignedIn && !isGuest) return <Redirect to="/sign-in" />;
  return <RequireUsername>{children}</RequireUsername>;
}

function HomeRoute() {
  const { isLoaded, isSignedIn } = useUser();
  const isGuest = useIsGuest();
  if (!isLoaded) {
    return <div className="min-h-screen w-full flex items-center justify-center bg-slate-950 text-slate-500 text-sm">Chargement…</div>;
  }
  // Authed (Clerk or guest) → menu behind the username gate.
  // Anonymous → landing-style menu without server fetch.
  if (isSignedIn || isGuest) return <RequireUsername><Menu /></RequireUsername>;
  return <Menu />;
}

function GuardedGame()        { return <RequireAuth><Game /></RequireAuth>; }
function GuardedLobby()       { return <RequireAuth><Lobby /></RequireAuth>; }
function GuardedPlay()        { return <RequireAuth><Play /></RequireAuth>; }
function GuardedCollection()  { return <RequireAuth><Collection /></RequireAuth>; }
function GuardedDeckEditor()  { return <RequireAuth><DeckEditor /></RequireAuth>; }
function GuardedProgression() { return <RequireAuth><Progression /></RequireAuth>; }

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
        <GuestExitHandler />
        <TooltipProvider>
          <Switch>
            <Route path="/"            component={HomeRoute} />
            <Route path="/sign-in/*?"  component={SignInPage} />
            <Route path="/sign-up/*?"  component={SignUpPage} />
            <Route path="/game"        component={GuardedGame} />
            <Route path="/lobby"       component={GuardedLobby} />
            <Route path="/play"        component={GuardedPlay} />
            <Route path="/collection"  component={GuardedCollection} />
            <Route path="/deck"        component={GuardedDeckEditor} />
            <Route path="/progression" component={GuardedProgression} />
            <Route path="/results">
              <RequireAuth><Results /></RequireAuth>
            </Route>
            <Route path="/admin"       component={Admin} />
            <Route path="/splash"      component={Splash} />
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
