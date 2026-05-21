import { useState, useCallback, useRef } from "react";
import { useLocation, Link } from "wouter";
import { useMultiplayer, MPMessage } from "../hooks/useMultiplayer";
import { Button } from "@/components/ui/button";

// ─── Connected session (mounted only when a mode is chosen) ──────────────────
function LobbySession({
  mode,
  joinCode,
  onBack,
}: {
  mode: "create" | "join";
  joinCode: string;
  onBack: () => void;
}) {
  const [, setLocation] = useLocation();
  const [phase, setPhase] = useState<"connecting" | "creating" | "waiting" | "error">("connecting");
  const [roomCode, setRoomCode] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const seedRef = useRef(0);
  const codeRef = useRef("");

  const handleMessage = useCallback(
    (msg: MPMessage) => {
      if (msg.type === "room_created") {
        seedRef.current = msg.seed;
        codeRef.current = msg.code;
        setRoomCode(msg.code);
        setPhase("creating");
      } else if (msg.type === "opponent_joined") {
        // Host: opponent connected → start game (pass code so we can rejoin the room)
        setLocation(`/game?seed=${seedRef.current}&faction=player&code=${codeRef.current}`);
      } else if (msg.type === "room_joined") {
        // Guest: we joined → navigate (pass code so we can rejoin the room)
        setLocation(`/game?seed=${msg.seed}&faction=enemy&code=${msg.code}`);
      } else if (msg.type === "opponent_left") {
        setPhase("error");
        setErrorMsg("L'adversaire a quitté la salle.");
      } else if (msg.type === "error") {
        setPhase("error");
        setErrorMsg(msg.message);
      }
    },
    [setLocation]
  );

  const { createRoom, joinRoom } = useMultiplayer({
    onMessage: handleMessage,
    onOpen: () => {
      if (mode === "create") createRoom();
      else joinRoom(joinCode);
    },
    onClose: () => {
      setPhase("error");
      setErrorMsg("Connexion perdue. Veuillez réessayer.");
    },
  });

  return (
    <div className="space-y-5 text-center">
      {phase === "connecting" && (
        <p className="text-slate-400 animate-pulse">Connexion au serveur...</p>
      )}

      {phase === "creating" && (
        <>
          <p className="text-slate-400 text-sm">Partagez ce code avec votre adversaire :</p>
          <div className="text-5xl font-black tracking-[0.3em] text-white bg-slate-800 rounded-2xl py-6 border border-slate-600 select-all">
            {roomCode}
          </div>
          <p className="text-slate-500 text-sm animate-pulse">
            En attente d&apos;un adversaire...
          </p>
        </>
      )}

      {phase === "error" && (
        <div className="space-y-3">
          <p className="text-red-400 font-bold">{errorMsg}</p>
          <Button
            variant="outline"
            className="w-full border-slate-600 text-white hover:bg-slate-800"
            onClick={onBack}
          >
            Retour
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Main lobby ───────────────────────────────────────────────────────────────
type Mode = null | "create" | { type: "join_input" } | { type: "join_session"; code: string };

export default function Lobby() {
  const [mode, setMode]       = useState<Mode>(null);
  const [joinCode, setJoinCode] = useState("");

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-slate-950 text-white px-4 relative overflow-hidden">
      <div className="absolute top-4 left-4 z-20">
        <Link href="/">
          <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white">
            ← Retour
          </Button>
        </Link>
      </div>
      <div className="absolute top-[-15%] left-[-15%] w-96 h-96 bg-fuchsia-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-15%] right-[-15%] w-96 h-96 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-sm space-y-5 z-10">
        <div className="text-center">
          <div className="text-[10px] uppercase tracking-[0.4em] text-fuchsia-300 font-bold mb-1">Multijoueur</div>
          <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-white to-red-400 drop-shadow-[0_4px_0_rgba(0,0,0,0.5)]">
            1 vs 1
          </h1>
          <p className="text-slate-500 text-xs mt-2 font-medium">Affrontez un ami avec un code à 4 lettres.</p>
        </div>

        {/* Mode selection */}
        {mode === null && (
          <div className="space-y-3">
            <Button
              className="w-full h-14 bg-blue-600 hover:bg-blue-700 font-black uppercase tracking-wide text-base shadow-[0_6px_0_rgba(0,0,0,0.4)] active:translate-y-[3px] active:shadow-[0_3px_0_rgba(0,0,0,0.4)]"
              data-testid="button-create-room"
              onClick={() => setMode("create")}
            >
              Créer une salle
            </Button>
            <Button
              className="w-full h-14 bg-fuchsia-600 hover:bg-fuchsia-700 font-black uppercase tracking-wide text-base shadow-[0_6px_0_rgba(0,0,0,0.4)] active:translate-y-[3px] active:shadow-[0_3px_0_rgba(0,0,0,0.4)]"
              data-testid="button-join-room"
              onClick={() => setMode({ type: "join_input" })}
            >
              Rejoindre une salle
            </Button>
          </div>
        )}

        {/* Join: code input */}
        {mode !== null && typeof mode === "object" && mode.type === "join_input" && (
          <div className="space-y-3">
            <p className="text-slate-400 text-sm text-center">Entrez le code de la salle :</p>
            <input
              autoFocus
              className="w-full h-14 rounded-xl bg-slate-800 border border-slate-600 text-white text-center text-3xl font-black tracking-[0.4em] uppercase placeholder-slate-700 focus:outline-none focus:border-blue-500 transition"
              placeholder="XXXX"
              maxLength={4}
              value={joinCode}
              onChange={e => setJoinCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
              data-testid="input-join-code"
            />
            <Button
              className="w-full h-12 bg-green-600 hover:bg-green-700 font-bold text-lg"
              disabled={joinCode.length !== 4}
              data-testid="button-confirm-join"
              onClick={() => setMode({ type: "join_session", code: joinCode })}
            >
              Rejoindre
            </Button>
            <Button
              variant="ghost"
              className="w-full text-slate-400 hover:text-white"
              onClick={() => setMode(null)}
            >
              Annuler
            </Button>
          </div>
        )}

        {/* Active session */}
        {(mode === "create" || (mode !== null && typeof mode === "object" && mode.type === "join_session")) && (
          <LobbySession
            mode={mode === "create" ? "create" : "join"}
            joinCode={mode !== null && typeof mode === "object" && mode.type === "join_session" ? mode.code : ""}
            onBack={() => setMode(null)}
          />
        )}
      </div>
    </div>
  );
}
