import { motion, useAnimationControls } from "framer-motion";
import { memo, useEffect, useRef } from "react";
import { Faction, Unit } from "../game/types";

interface Props {
  unit: Unit;
  displayX: number;
  displayY: number;
  // Primitive snapshots so React.memo can detect changes
  // (engine mutates unit objects in place; passing primitives gives us
  // distinct prev/next values at render time).
  hp: number;
  faction: Faction;
  isConverted: boolean;
  transformedAsInvoice: boolean;
  // Increments each time the unit lands an attack — used to trigger the lunge animation.
  lastAttackTime: number;
  localFaction?: Faction;
}

function UnitComponent({
  unit, displayX, displayY, hp, faction,
  isConverted, transformedAsInvoice, lastAttackTime,
  localFaction = "player",
}: Props) {
  const hpPct  = Math.max(0, (hp / unit.maxHp) * 100);
  const size   = unit.radius * 2;

  // URSSAF transformation: render the unit as a crumpled unpaid invoice instead.
  if (transformedAsInvoice) {
    const paperSize = Math.max(22, size * 1.1);
    return (
      <motion.div
        className="absolute z-20"
        style={{
          width: paperSize, height: paperSize * 1.25,
          left: `${displayX}%`,
          top:  `${displayY}%`,
          marginLeft: -paperSize / 2,
          marginTop:  -paperSize * 0.6,
        }}
        initial={false}
        animate={{ left: `${displayX}%`, top: `${displayY}%` }}
        transition={{ type: "tween", duration: 0.08, ease: "linear" }}
      >
        <div
          className="absolute left-1/2 -translate-x-1/2 rounded-full bg-black/55 blur-[2px] pointer-events-none"
          style={{ bottom: 0, width: paperSize * 0.9, height: paperSize * 0.18 }}
        />
        <div
          className="absolute left-1/2 -translate-x-1/2 h-1.5 bg-black/70 rounded-full overflow-hidden border border-black/40"
          style={{ top: -4, width: Math.max(paperSize, 28) }}
        >
          <div className="h-full rounded-full bg-rose-400" style={{ width: `${hpPct}%` }} />
        </div>
        <div
          className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center"
          style={{
            bottom: paperSize * 0.05,
            width: paperSize,
            height: paperSize * 1.15,
            transform: "translateX(-50%) rotate(-6deg)",
            background: "linear-gradient(to bottom, #fef3c7 0%, #fde68a 50%, #fbbf24 100%)",
            border: "2px solid #78350f",
            boxShadow: "0 3px 4px rgba(0,0,0,0.5), inset 0 -2px 0 rgba(120,53,15,0.4)",
            color: "#7f1d1d",
            fontWeight: 900,
            fontSize: Math.max(5, paperSize * 0.18),
            lineHeight: 1,
            textAlign: "center",
            padding: 2,
          }}
        >
          <div>
            <div style={{ fontSize: Math.max(4, paperSize * 0.13), opacity: 0.7 }}>URSSAF</div>
            <div style={{ fontSize: Math.max(6, paperSize * 0.22), letterSpacing: -0.5 }}>NON</div>
            <div style={{ fontSize: Math.max(6, paperSize * 0.22), letterSpacing: -0.5 }}>PAYÉE</div>
          </div>
        </div>
      </motion.div>
    );
  }

  const isMine = faction === localFaction;

  // Color palette
  const ringTop    = isConverted ? "#c4b5fd" : isMine ? "#93c5fd" : "#fca5a5";
  const ringMid    = isConverted ? "#a78bfa" : isMine ? "#3b82f6" : "#ef4444";
  const ringBottom = isConverted ? "#6d28d9" : isMine ? "#1e3a8a" : "#7f1d1d";
  const rimGlow    = isConverted ? "rgba(196,181,253,0.55)" : isMine ? "rgba(96,165,250,0.55)" : "rgba(248,113,113,0.55)";
  const barColor   = isMine ? "#60a5fa" : "#f87171";

  // 3D-ish proportions: a tall character body sitting on a flat ellipse pedestal.
  // The whole unit takes roughly 2× the unit radius in width, 2.4× in height.
  const bodyW   = size * 1.0;
  const bodyH   = size * 1.4;
  const pedW    = size * 1.05;
  const pedH    = pedW * 0.32;
  const totalH  = bodyH + pedH * 0.6;
  const barWidth = Math.max(size * 1.1, 30);

  // Attack lunge animation. We detect *any* change of lastAttackTime (the engine
  // stamps the current timeRemaining each time the unit lands a hit) and run a
  // short scale + translate burst. Mine units lunge toward the enemy side, which
  // is "up" on the local viewport when isMine and "down" when it's an opponent.
  const lungeDirY = isMine ? -1 : 1; // -1 = up (toward enemy in local view)
  const controls = useAnimationControls();
  const prevAttackRef = useRef<number>(lastAttackTime);
  useEffect(() => {
    if (lastAttackTime !== prevAttackRef.current && Number.isFinite(lastAttackTime)) {
      prevAttackRef.current = lastAttackTime;
      // Quick wind-up + strike + recover. Keep it short so it can fire every
      // attackSpeed seconds without stacking weirdly.
      controls.start({
        y:     [0, 2, lungeDirY * 6, lungeDirY * 2, 0],
        scale: [1, 0.95, 1.12, 1.02, 1],
        rotate:[0, isMine ? -4 : 4, isMine ? 6 : -6, 0, 0],
        transition: { duration: 0.28, ease: "easeOut", times: [0, 0.2, 0.5, 0.75, 1] },
      });
    } else {
      prevAttackRef.current = lastAttackTime;
    }
  }, [lastAttackTime, lungeDirY, isMine, controls]);

  return (
    <motion.div
      className="absolute z-20"
      style={{
        width: bodyW, height: totalH,
        left: `${displayX}%`,
        top:  `${displayY}%`,
        marginLeft: -bodyW / 2,
        marginTop:  -totalH * 0.78,
      }}
      initial={false}
      animate={{ left: `${displayX}%`, top: `${displayY}%` }}
      transition={{ type: "tween", duration: 0.08, ease: "linear" }}
    >
      {/* Ground shadow (oval, sits under the pedestal) */}
      <div
        className="absolute left-1/2 -translate-x-1/2 rounded-full bg-black/60 blur-[3px] pointer-events-none"
        style={{
          bottom: -pedH * 0.15,
          width: pedW * 1.05,
          height: pedH * 0.55,
        }}
      />

      {/* HP bar (above the figure) */}
      <div
        className="absolute left-1/2 -translate-x-1/2 h-1.5 bg-black/70 rounded-full overflow-hidden border border-black/40 z-30"
        style={{ top: -4, width: barWidth }}
      >
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${hpPct}%`, backgroundColor: barColor }}
        />
      </div>

      {/* Flat ellipse pedestal on the ground (perspective view) */}
      <div
        className="absolute left-1/2 -translate-x-1/2"
        style={{
          bottom: 0,
          width: pedW,
          height: pedH,
          borderRadius: "50%",
          background: `radial-gradient(ellipse at 50% 30%, ${ringTop} 0%, ${ringMid} 55%, ${ringBottom} 100%)`,
          border: "2px solid rgba(0,0,0,0.55)",
          boxShadow: `
            inset 0 2px 0 rgba(255,255,255,0.45),
            inset 0 -2px 3px rgba(0,0,0,0.55),
            0 0 10px ${rimGlow}
          `,
        }}
      >
        {/* Rim highlight on the upper edge to sell the "ground disc" look */}
        <div
          className="absolute inset-x-1 top-[2px] rounded-full pointer-events-none"
          style={{
            height: "35%",
            background: "linear-gradient(to bottom, rgba(255,255,255,0.55), transparent)",
            filter: "blur(1px)",
          }}
        />
      </div>

      {/* Character body — stands on the pedestal. This is the element that
          animates on attack. Tilted slightly so the silhouette reads as 3D. */}
      <motion.div
        animate={controls}
        initial={false}
        style={{
          position: "absolute",
          left: "50%",
          bottom: pedH * 0.45,
          width: bodyW,
          height: bodyH,
          transformOrigin: "50% 100%",
          marginLeft: -bodyW / 2,
        }}
      >
        <div
          className="relative w-full h-full"
          style={{
            // Subtle rounded-rect "card" body, slightly narrower at the top
            // gives the impression of perspective foreshortening.
            background: `linear-gradient(to bottom, ${ringTop}33 0%, ${ringMid}1f 60%, transparent 100%)`,
            borderRadius: "45% 45% 38% 38% / 55% 55% 22% 22%",
            overflow: "hidden",
            boxShadow: `
              inset 0 2px 0 rgba(255,255,255,0.25),
              0 4px 5px rgba(0,0,0,0.35)
            `,
            border: "1.5px solid rgba(0,0,0,0.45)",
          }}
        >
          {unit.imagePath ? (
            <img
              src={unit.imagePath}
              alt={unit.label}
              className="w-full h-full object-cover object-top select-none"
              draggable={false}
              style={{
                // Slight color burn on the enemy side to read at a glance.
                filter: isMine
                  ? "drop-shadow(0 1px 0 rgba(0,0,0,0.4)) saturate(1.05)"
                  : "drop-shadow(0 1px 0 rgba(0,0,0,0.4)) saturate(1.05) hue-rotate(-3deg)",
              }}
            />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center font-black text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)] select-none"
              style={{ fontSize: Math.max(9, unit.radius * 0.6) }}
            >
              {unit.label}
            </div>
          )}

          {/* Faint top-light highlight to give a 3D sheen on the head */}
          <div
            className="absolute inset-x-[12%] top-[2%] rounded-full pointer-events-none"
            style={{
              height: "30%",
              background: "linear-gradient(to bottom, rgba(255,255,255,0.30), transparent)",
              filter: "blur(2px)",
            }}
          />
        </div>
      </motion.div>

      {/* Converted indicator */}
      {isConverted && (
        <div
          className="absolute rounded-full bg-violet-400 border-2 border-white animate-pulse z-30"
          style={{ right: -2, bottom: pedH * 0.5, width: 10, height: 10 }}
        />
      )}
    </motion.div>
  );
}

export default memo(UnitComponent, (prev, next) =>
  prev.hp === next.hp &&
  prev.faction === next.faction &&
  prev.isConverted === next.isConverted &&
  prev.transformedAsInvoice === next.transformedAsInvoice &&
  prev.displayX === next.displayX &&
  prev.displayY === next.displayY &&
  prev.lastAttackTime === next.lastAttackTime &&
  prev.localFaction === next.localFaction
);
