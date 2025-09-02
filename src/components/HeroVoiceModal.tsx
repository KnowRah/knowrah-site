// src/components/HeroVoiceModal.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Props = { open: boolean; onClose: () => void };
type ConnStatus = "idle" | "connecting" | "connected" | "error";

export default function HeroVoiceModal({ open, onClose }: Props) {
  const [status, setStatus] = useState<ConnStatus>("idle");
  const [errMsg, setErrMsg] = useState<string | null>(null);

  const localRef = useRef<HTMLAudioElement>(null);
  const remoteRef = useRef<HTMLAudioElement>(null);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  const model =
    process.env.NEXT_PUBLIC_REALTIME_MODEL || "gpt-4o-realtime-preview-2024-12-17";

  const blockedByHost = useMemo(() => {
    if (typeof window === "undefined") return false;
    return window.location.hostname.endsWith(".app.github.dev");
  }, []);

  async function startSession() {
    try {
      setErrMsg(null);
      if (blockedByHost) {
        setStatus("error");
        setErrMsg("This host blocks mic by policy (app.github.dev). Use Vercel or localhost.");
        return;
      }
      setStatus("connecting");

      const local = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = local;
      if (localRef.current) {
        localRef.current.srcObject = local;
        localRef.current.muted = true;
        await localRef.current.play().catch(() => {});
      }

      const pc = new RTCPeerConnection();
      pcRef.current = pc;

      local.getTracks().forEach((t) => pc.addTrack(t, local));

      pc.ontrack = (evt) => {
        const stream = evt.streams[0] as MediaStream | undefined;
        if (remoteRef.current && stream) {
          remoteRef.current.srcObject = stream;
          remoteRef.current.autoplay = true;
          void remoteRef.current.play().catch(() => {});
        }
      };

      const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: false });
      await pc.setLocalDescription(offer);

      // Get ephemeral client token from our server
      const tokenRes = await fetch("/api/realtime/session", { method: "POST" });
      const tokenJson = await tokenRes.json();
      if (!tokenRes.ok) {
        throw new Error(`Token error ${tokenRes.status}: ${tokenJson?.error || JSON.stringify(tokenJson)}`);
      }
      const EPHEMERAL: string | undefined =
        tokenJson?.client_secret?.value || tokenJson?.client_secret || tokenJson?.value;
      if (!EPHEMERAL) throw new Error("Missing ephemeral client token");

      // --- Realtime SDP negotiation (add required headers) ---
      const sdpRes = await fetch(
        `https://api.openai.com/v1/realtime?model=${encodeURIComponent(model)}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${EPHEMERAL}`,
            "Content-Type": "application/sdp",
            Accept: "application/sdp",
            "OpenAI-Beta": "realtime=v1",
          },
          body: offer.sdp || "",
        }
      );

      const sdpText = await sdpRes.text();
      if (!sdpRes.ok) {
        throw new Error(`Negotiation ${sdpRes.status}: ${sdpText}`);
      }
      const answer: RTCSessionDescriptionInit = { type: "answer", sdp: sdpText };
      await pc.setRemoteDescription(answer);

      setStatus("connected");
    } catch (err: any) {
      setStatus("error");
      const msg = String(err?.message || err || "");
      const isDenied =
        err?.name === "NotAllowedError" || msg.toLowerCase().includes("permission denied");
      if (blockedByHost) {
        setErrMsg("Microphone is blocked by this host. Use Vercel preview or localhost.");
      } else if (isDenied) {
        setErrMsg("Microphone access was denied. Check site permissions and retry.");
      } else {
        setErrMsg(msg || "Realtime negotiation failed");
      }
      console.error(err);
    }
  }

  function stopSession() {
    try {
      pcRef.current?.getSenders().forEach((s) => s.track?.stop());
      pcRef.current?.close();
      pcRef.current = null;
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
      setStatus("idle");
    } catch {}
  }

  useEffect(() => {
    if (!open) stopSession();
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 backdrop-blur" onClick={onClose}>
      <div
        className="w-[min(92vw,860px)] rounded-3xl border border-zinc-800 bg-zinc-950 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Live voice demo</h2>
          <button onClick={onClose} className="rounded-xl bg-white/10 px-3 py-1.5 text-sm hover:bg-white/15">
            Close
          </button>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-black/30 p-4">
          <p className="text-sm text-zinc-300">
            Uses an ephemeral token from <code>/api/realtime/session</code> and streams audio via WebRTC.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            {status !== "connected" ? (
              <button onClick={startSession} className="rounded-xl bg-white px-4 py-2 text-sm font-medium text-black hover:bg-zinc-200">
                Start voice
              </button>
            ) : (
              <button onClick={stopSession} className="rounded-xl border border-zinc-700 px-4 py-2 text-sm hover:bg-zinc-900">
                Stop
              </button>
            )}
            <span className="text-xs text-zinc-400">{status}</span>
          </div>
          {errMsg && <p className="mt-2 text-sm text-rose-300">{errMsg}</p>}
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-zinc-800 bg-black/30 p-3">
            <h4 className="mb-1 text-sm font-semibold">You</h4>
            <audio ref={localRef} controls className="w-full" />
          </div>
          <div className="rounded-xl border border-zinc-800 bg-black/30 p-3">
            <h4 className="mb-1 text-sm font-semibold">KnowRah</h4>
            <audio ref={remoteRef} controls className="w-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
