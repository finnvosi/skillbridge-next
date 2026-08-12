"use client";

import { useEffect, useRef, useState } from "react";
import {
  motion,
  useMotionValue,
  useSpring,
  useReducedMotion,
} from "framer-motion";

const INTERACTIVE =
  "a, button, input, textarea, select, [data-cursor='hover'], [data-cursor-magnetic]";

/**
 * Custom agency cursor:
 *  - a tiny precise dot that tracks the pointer 1:1
 *  - a larger ring that trails with spring lag
 *  - on hover over interactive elements the ring MAGNETICALLY eases toward the
 *    element's center and expands, while the dot hides
 *  - mix-blend-difference so it reads on both light and dark sections
 *
 * Disabled on touch devices and when prefers-reduced-motion is set.
 */
export function CustomCursor() {
  const reduce = useReducedMotion();
  const [enabled, setEnabled] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [visible, setVisible] = useState(false);

  const x = useMotionValue(-100);
  const y = useMotionValue(-100);
  const targetX = useMotionValue(-100);
  const targetY = useMotionValue(-100);
  const ringX = useSpring(targetX, { stiffness: 260, damping: 26, mass: 0.5 });
  const ringY = useSpring(targetY, { stiffness: 260, damping: 26, mass: 0.5 });

  // Refs avoid re-subscribing the listeners on every state change.
  const hoveringRef = useRef(false);
  const visibleRef = useRef(false);

  useEffect(() => {
    if (reduce) return;
    if (typeof window === "undefined") return;
    if (!window.matchMedia("(pointer: fine)").matches) return;

    setEnabled(true);
    document.documentElement.classList.add("has-custom-cursor");

    let frame = 0;
    let pendingX = -100;
    let pendingY = -100;

    const apply = () => {
      frame = 0;
      x.set(pendingX);
      y.set(pendingY);
      if (!hoveringRef.current) {
        targetX.set(pendingX);
        targetY.set(pendingY);
      }
    };

    const onMove = (e: PointerEvent) => {
      pendingX = e.clientX;
      pendingY = e.clientY;

      const el = (e.target as HTMLElement | null)?.closest(
        INTERACTIVE,
      ) as HTMLElement | null;

      if (el) {
        if (!hoveringRef.current) {
          hoveringRef.current = true;
          setHovering(true);
        }
        const r = el.getBoundingClientRect();
        targetX.set(r.left + r.width / 2);
        targetY.set(r.top + r.height / 2);
      } else if (hoveringRef.current) {
        hoveringRef.current = false;
        setHovering(false);
        targetX.set(pendingX);
        targetY.set(pendingY);
      }

      if (!visibleRef.current) {
        visibleRef.current = true;
        setVisible(true);
      }

      if (!frame) frame = requestAnimationFrame(apply);
    };

    const onLeave = () => {
      visibleRef.current = false;
      setVisible(false);
    };

    // Reset hover state on navigation so the ring never sticks across routes.
    const onRoute = () => {
      hoveringRef.current = false;
      setHovering(false);
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerleave", onLeave);
    window.addEventListener("popstate", onRoute);

    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("popstate", onRoute);
      document.documentElement.classList.remove("has-custom-cursor");
    };
  }, [reduce, x, y, targetX, targetY]);

  if (!enabled) return null;

  return (
    <>
      {/* Trailing ring — magnetically pulled toward hovered CTAs */}
      <motion.div
        aria-hidden
        className="pointer-events-none fixed left-0 top-0 z-[100] mix-blend-difference"
        style={{ x: ringX, y: ringY }}
      >
        <motion.div
          className="-translate-x-1/2 -translate-y-1/2 rounded-full border border-white"
          animate={{
            width: hovering ? 64 : 34,
            height: hovering ? 64 : 34,
            opacity: visible ? 1 : 0,
          }}
          transition={{ type: "spring", stiffness: 300, damping: 24 }}
        />
      </motion.div>

      {/* Precise dot — only when not hovering */}
      <motion.div
        aria-hidden
        className="pointer-events-none fixed left-0 top-0 z-[100] mix-blend-difference"
        style={{ x, y }}
      >
        <motion.div
          className="-translate-x-1/2 -translate-y-1/2 rounded-full bg-white"
          animate={{
            width: hovering ? 0 : 7,
            height: hovering ? 0 : 7,
            opacity: visible ? 1 : 0,
          }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
        />
      </motion.div>
    </>
  );
}
