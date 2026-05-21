import { memo, useEffect, useRef, useState } from "react";
import { motion, useAnimationControls, AnimatePresence } from "framer-motion";
import { Faction, Tower } from "../game/types";

interface Props {
  tower: Tower;
  displayX: number;
  displayY: number;
  hp: number;
  lastAttackTime: number;
  localFaction?: Faction;
}

function TowerComponent({
  tower, displayX, displayY, hp, lastAttackTime, localFaction = "player",
}: Props) {
  const isKing = tower.type === "king";
  const size = isKing ? 64 : 48;
  const hpPct = Math.max(0, (hp / tower.maxHp) * 100);
  const isDead = hp <= 0;
  const isMine = tower.faction === localFaction;

  // Neutral stone palette
  const stoneLight = "#f5f5f4";
  const stoneMid   = "#a8a29e";
  const stoneDark  = "#57534e";

  // Faction accents (banner, roof)
  const accentLight = isMine ? "#93c5fd" : "#fca5a5";
  const accentMid   = isMine ? "#3b82f6" : "#ef4444";
  const accentDark  = isMine ? "#1e3a8a" : "#7f1d1d";
  const barColor    = isMine ? "#60a5fa" : "#f87171";

  const merlons = isKing ? 5 : 4;

  // Attack animation: muzzle flash + slight recoil
  const muzzleControls = useAnimationControls();
  const bodyControls = useAnimationControls();
  const prevAttack = useRef(lastAttackTime);
  useEffect(() => {
    if (lastAttackTime !== prevAttack.current && lastAttackTime > 0 && !isDead) {
      muzzleControls.start({
        opacity: [0, 1, 0],
        scale: [0.4, 1.5, 0.7],
        transition: { duration: 0.32, ease: "easeOut" },
      });
      bodyControls.start({
        y: [0, 2, 0],
        scale: [1, 0.98, 1],
        transition: { duration: 0.22, ease: "easeOut" },
      });
    }
    prevAttack.current = lastAttackTime;
  }, [lastAttackTime, isDead, muzzleControls, bodyControls]);

  // Hit flash when HP drops
  const hitControls = useAnimationControls();
  const prevHp = useRef(hp);
  useEffect(() => {
    if (hp < prevHp.current && !isDead) {
      hitControls.start({
        opacity: [0, 0.8, 0],
        transition: { duration: 0.22, ease: "easeOut" },
      });
    }
    prevHp.current = hp;
  }, [hp, isDead, hitControls]);

  // Death animation: tilt + smoke puffs once
  const wasDead = useRef(isDead);
  const [deathAnimating, setDeathAnimating] = useState(false);
  useEffect(() => {
    if (isDead && !wasDead.current) {
      setDeathAnimating(true);
      wasDead.current = true;
      const t = setTimeout(() => setDeathAnimating(false), 900);
      return () => clearTimeout(t);
    }
    if (!isDead) wasDead.current = false;
    return undefined;
  }, [isDead]);

  return (
    <motion.div
      className="absolute z-10"
      style={{
        width: size,
        height: size * 1.7,
        left: `${displayX}%`,
        top:  `${displayY}%`,
        marginLeft: -size / 2,
        marginTop:  -size * 1.20,
        transformOrigin: "50% 100%",
        pointerEvents: "none",
        filter: "drop-shadow(0 6px 5px rgba(0,0,0,0.55))",
      }}
      animate={isDead
        ? { rotate: 7, y: 5, opacity: 0.55, scale: 0.94 }
        : { rotate: 0, y: 0, opacity: 1, scale: 1 }}
      transition={{ duration: 0.7, ease: "easeOut" }}
    >
      {/* Ground shadow (perspective oval) */}
      <div
        className="absolute left-1/2 -translate-x-1/2"
        style={{
          bottom: -4,
          width: size * 1.5,
          height: size * 0.34,
          borderRadius: "50%",
          background:
            "radial-gradient(ellipse at center, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.4) 45%, rgba(0,0,0,0) 75%)",
        }}
      />

      <motion.div className="absolute inset-0" animate={bodyControls}>
        {/* Stone pedestal (wide, flat) */}
        <div
          className="absolute left-1/2 -translate-x-1/2"
          style={{
            bottom: 0,
            width: size * 1.20,
            height: size * 0.22,
            borderRadius: "8px",
            background: `linear-gradient(to bottom, ${stoneLight} 0%, ${stoneMid} 55%, ${stoneDark} 100%)`,
            border: "2px solid rgba(0,0,0,0.55)",
            boxShadow:
              "inset 0 3px 0 rgba(255,255,255,0.45), inset 0 -3px 0 rgba(0,0,0,0.35)",
          }}
        />

        {/* Stone column (tower body) */}
        <div
          className="absolute left-1/2 -translate-x-1/2 overflow-hidden"
          style={{
            bottom: size * 0.17,
            width: size * 0.90,
            height: size * (isKing ? 1.00 : 0.80),
            borderRadius: "6px 6px 4px 4px",
            background: `linear-gradient(to right, ${stoneDark} 0%, ${stoneMid} 22%, ${stoneLight} 50%, ${stoneMid} 78%, ${stoneDark} 100%)`,
            border: "2px solid rgba(0,0,0,0.55)",
            boxShadow: `
              inset 0 4px 0 rgba(255,255,255,0.35),
              inset 0 -4px 6px rgba(0,0,0,0.55)
            `,
          }}
        >
          {/* Brick lines (horizontal bands) */}
          <div
            className="absolute inset-0 opacity-40 pointer-events-none"
            style={{
              background: `repeating-linear-gradient(
                to bottom,
                transparent 0,
                transparent ${size * 0.20}px,
                rgba(0,0,0,0.45) ${size * 0.20}px,
                rgba(0,0,0,0.45) ${size * 0.20 + 1}px
              )`,
            }}
          />

          {/* Arched wooden door */}
          <div
            className="absolute left-1/2 -translate-x-1/2"
            style={{
              bottom: 2,
              width: size * 0.30,
              height: size * 0.34,
              borderRadius: `${size * 0.15}px ${size * 0.15}px 2px 2px`,
              background: "linear-gradient(to bottom, #78350f, #451a03)",
              border: "1.5px solid rgba(0,0,0,0.65)",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.18)",
            }}
          />

          {/* Faction banner draped on tower */}
          <div
            className="absolute left-1/2 -translate-x-1/2"
            style={{
              top: size * 0.20,
              width: size * 0.36,
              height: size * 0.40,
              background: `linear-gradient(to bottom, ${accentLight} 0%, ${accentMid} 60%, ${accentDark} 100%)`,
              clipPath: "polygon(0 0, 100% 0, 100% 85%, 50% 100%, 0 85%)",
              border: "1.5px solid rgba(0,0,0,0.5)",
              boxShadow: "inset 0 2px 0 rgba(255,255,255,0.3)",
            }}
          />
        </div>

        {/* Crenellations */}
        <div
          className="absolute left-1/2 -translate-x-1/2 flex justify-between items-end"
          style={{
            bottom: size * (isKing ? 1.15 : 0.95),
            width: size * 0.95,
            height: size * 0.18,
          }}
        >
          {Array.from({ length: merlons }).map((_, i) => (
            <div
              key={i}
              style={{
                width: `${100 / (merlons * 2 - 1)}%`,
                height: "100%",
                background: `linear-gradient(to bottom, ${stoneLight} 0%, ${stoneMid} 100%)`,
                border: "1.5px solid rgba(0,0,0,0.55)",
                borderRadius: "2px 2px 0 0",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.4)",
              }}
            />
          ))}
        </div>

        {/* King roof cone */}
        {isKing && (
          <div
            className="absolute left-1/2 -translate-x-1/2"
            style={{
              bottom: size * 1.32,
              width: size * 0.95,
              height: size * 0.34,
              background: `linear-gradient(to bottom, ${accentLight} 0%, ${accentMid} 70%, ${accentDark} 100%)`,
              clipPath: "polygon(0 100%, 50% 0, 100% 100%)",
              filter: "drop-shadow(0 2px 1px rgba(0,0,0,0.4))",
            }}
          />
        )}

        {/* Flag pole + flag (waving) */}
        {!isDead && (
          <>
            <div
              className="absolute left-1/2"
              style={{
                bottom: size * (isKing ? 1.65 : 1.12),
                width: 2,
                height: size * 0.32,
                background: "#44403c",
                marginLeft: -1,
              }}
            />
            <motion.div
              className="absolute left-1/2"
              style={{
                bottom: size * (isKing ? 1.85 : 1.32),
                marginLeft: 1,
                width: size * 0.32,
                height: size * 0.18,
                background: `linear-gradient(to bottom, ${accentLight}, ${accentMid})`,
                clipPath: "polygon(0 0, 100% 0, 75% 50%, 100% 100%, 0 100%)",
                boxShadow: "0 2px 2px rgba(0,0,0,0.5)",
                transformOrigin: "left center",
              }}
              animate={{ skewY: [0, -3, 2, -2, 0] }}
              transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
            />
          </>
        )}

        {/* Muzzle flash on attack */}
        <motion.div
          className="absolute left-1/2 -translate-x-1/2 rounded-full pointer-events-none"
          style={{
            bottom: size * (isKing ? 1.08 : 0.88),
            width: size * 0.55,
            height: size * 0.55,
            marginLeft: 0,
            background:
              "radial-gradient(circle, #fffbeb 0%, #fde68a 25%, #fbbf24 45%, #f97316 65%, rgba(0,0,0,0) 80%)",
            opacity: 0,
            filter: "blur(1px)",
          }}
          animate={muzzleControls}
        />

        {/* Hit flash overlay (red wash) */}
        <motion.div
          className="absolute left-1/2 -translate-x-1/2 pointer-events-none"
          style={{
            bottom: size * 0.17,
            width: size * 0.90,
            height: size * (isKing ? 1.00 : 0.80),
            borderRadius: "6px 6px 4px 4px",
            background:
              "radial-gradient(circle, rgba(255,80,80,0.85) 0%, rgba(255,80,80,0) 75%)",
            opacity: 0,
          }}
          animate={hitControls}
        />
      </motion.div>

      {/* Smoke puffs on destruction */}
      <AnimatePresence>
        {deathAnimating && (
          <>
            {[0, 1, 2, 3, 4].map((i) => (
              <motion.div
                key={i}
                className="absolute left-1/2 rounded-full pointer-events-none"
                style={{
                  bottom: size * 0.4,
                  marginLeft: -size * 0.2 + (i - 2) * size * 0.22,
                  width: size * 0.45,
                  height: size * 0.45,
                  background:
                    "radial-gradient(circle, rgba(220,220,220,0.9) 0%, rgba(160,160,160,0.45) 50%, rgba(0,0,0,0) 80%)",
                }}
                initial={{ opacity: 0, scale: 0.3, y: 0 }}
                animate={{
                  opacity: [0, 0.9, 0],
                  scale: [0.3, 1.6, 2.1],
                  y: -size * 0.7,
                }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.9, delay: i * 0.05, ease: "easeOut" }}
              />
            ))}
          </>
        )}
      </AnimatePresence>

      {/* HP bar */}
      {!isDead && (
        <div
          className="absolute left-1/2 -translate-x-1/2 h-2 bg-black/70 rounded-full overflow-hidden border border-black/40"
          style={{ top: -2, width: Math.max(size * 1.1, 42) }}
        >
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${hpPct}%`, backgroundColor: barColor }}
          />
        </div>
      )}
    </motion.div>
  );
}

export default memo(
  TowerComponent,
  (prev, next) =>
    prev.hp === next.hp &&
    prev.lastAttackTime === next.lastAttackTime &&
    prev.displayX === next.displayX &&
    prev.displayY === next.displayY &&
    prev.localFaction === next.localFaction
);
