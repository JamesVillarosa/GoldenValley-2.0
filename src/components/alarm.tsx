"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { toast } from "sonner";
import { BellRinging } from "@phosphor-icons/react/dist/ssr";
import { getAlarmFacts } from "@/lib/actions/alarm";
import { markChecked } from "@/lib/actions/client";
import { ALARM_TEXT, alarmFor, type Alarm } from "@/lib/alarm";
import { isClosed, manilaToday } from "@/lib/dates";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";

const manilaClock = () =>
  new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Manila", hour: "2-digit", minute: "2-digit" }).format(new Date());

/** Rings until the day's job is done. Anywhere else in the app it covers the
 * whole screen; on the screen where the job is done it shrinks to a banner so
 * the work can be finished. Sound and vibration need one tap first: phones
 * never let a page make noise before the user touches it. */
export function AlarmGate() {
  const pathname = usePathname();
  const [alarm, setAlarm] = useState<Alarm>(null);
  const [asking, setAsking] = useState(false);
  const audio = useRef<AudioContext | null>(null);

  const check = useCallback(async () => {
    try {
      const facts = await getAlarmFacts();
      setAlarm(alarmFor(manilaClock(), isClosed(manilaToday()), facts.hasSales, facts.checked));
    } catch {
      // Locked or offline: no alarm rather than a broken screen.
    }
  }, []);

  useEffect(() => {
    if (pathname === "/login") return;
    const first = setTimeout(check, 0);
    const timer = setInterval(check, 10_000);
    const onShow = () => document.visibilityState === "visible" && check();
    document.addEventListener("visibilitychange", onShow);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onShow);
    };
  }, [check, pathname]);

  // Beep and buzz every second while ringing.
  useEffect(() => {
    if (!alarm) return;
    const unlock = () => {
      audio.current ??= new AudioContext();
      void audio.current.resume();
    };
    document.addEventListener("pointerdown", unlock);
    const ring = setInterval(() => {
      navigator.vibrate?.([600, 200, 600]);
      const ctx = audio.current;
      if (!ctx || ctx.state !== "running") return;
      const tone = ctx.createOscillator();
      const gain = ctx.createGain();
      tone.type = "square";
      tone.frequency.value = 880;
      gain.gain.setValueAtTime(0.4, ctx.currentTime);
      gain.gain.setValueAtTime(0, ctx.currentTime + 0.5);
      tone.connect(gain).connect(ctx.destination);
      tone.start();
      tone.stop(ctx.currentTime + 0.5);
    }, 1000);
    return () => {
      clearInterval(ring);
      document.removeEventListener("pointerdown", unlock);
      navigator.vibrate?.(0);
    };
  }, [alarm]);

  if (!alarm || pathname === "/login") return null;
  const text = ALARM_TEXT[alarm];
  const onTaskScreen = pathname === text.url;

  async function confirmChecked() {
    setAsking(false);
    try {
      await markChecked();
      setAlarm(null);
      toast.success("Checked for today");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save.");
    }
  }

  const checkedButton = alarm === "evening" && (
    <Button onClick={() => setAsking(true)} className="h-12 w-full bg-white text-danger-ink">
      Paid and unpaid checked
    </Button>
  );

  return (
    <>
      {onTaskScreen ? (
        <div role="alert" className="sticky top-0 z-40 bg-danger-ink px-4 py-3 text-white">
          <p className="flex items-center gap-2 font-display font-semibold">
            <BellRinging size={20} weight="fill" />
            {text.title}
          </p>
          <p className="mt-0.5 text-sm text-white/90">
            {alarm === "lunch" ? "Save a sale to stop the alarm." : "When the list is right, tap the button."}
          </p>
          {checkedButton && <div className="mt-2">{checkedButton}</div>}
        </div>
      ) : (
        <div role="alertdialog" aria-labelledby="alarm-title" className="fixed inset-0 z-[70] flex flex-col items-center justify-center gap-5 bg-danger-ink px-6 text-center text-white">
          <BellRinging size={72} weight="fill" className="animate-pulse" />
          <h2 id="alarm-title" className="font-display text-2xl font-semibold">
            {text.title}
          </h2>
          <p className="max-w-xs text-white/90">{text.body}</p>
          <Link
            href={text.url}
            className="press flex h-14 w-full max-w-xs items-center justify-center rounded-pill bg-white font-display font-semibold text-danger-ink"
          >
            {alarm === "lunch" ? "Log customers now" : "Open today's list"}
          </Link>
        </div>
      )}
      <ConfirmDialog
        open={asking}
        title="Paid and unpaid checked?"
        description="Every sale today is marked right. This stops tonight's alarm."
        confirmLabel="Yes, checked"
        onConfirm={confirmChecked}
        onCancel={() => setAsking(false)}
      />
    </>
  );
}
