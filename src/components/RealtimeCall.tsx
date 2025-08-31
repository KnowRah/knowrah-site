// src/components/RealtimeCall.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import AvatarPlayer from "./AvatarPlayer";

export default function RealtimeCall() {
  const [ready, setReady] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    setReady(typeof navigator !== "undefined" && !!navigator.mediaDevices);
  }, []);

  async function start() {
    setConnecting(true);
    setError(null);
    try {
      // 1) Ephemeral token
      const r = await fetch("/api/realtime/token");
      const j = await r.json();
      if (!r.ok || !j?.client_secret?.value) throw new Error(j?.error || "No ephemeral token");
      const EPHEMERAL = j.client_secret.value as string;

      // 2) Mic
      const mic = await navigator.mediaDevices.getUserMedia({ audio: true });

      // 3) RTCPeerConnection
      const pc = new RTCPeerConnection();
      pcRef.current = pc;

      // Remote audio stream
      const remoteStream = new MediaStream();
      pc.ontrack = (e) => {
        const first = e.streams && e.streams.length > 0 ? e.streams[0] : undefined;
        if (first) {
          first.getAudioTracks().forEach((t) => remoteStream.addTrack(t));
        }
        const el = remoteAudioRef.current;
        if (el) {
          el.srcObject = remoteStream;
          // Browser autoplay can reject the promise; swallow it.
          el.play().catch(() => {});
        }
      };

      // Send mic
      mic.getTracks().forEach((t) => pc.addTrack(t, mic));
      // Ask to receive audio
      pc.addTransceiver("audio", { direction: "recvonly" });

      const offer = await pc.createOffer({ offerToReceiveAudio: true });
      await pc.setLocalDescription(offer);

      // 4) SDP exchange with OpenAI Realtime
      const model =
        process.env.NEXT_PUBLIC_REALTIME_MODEL ||
        process.env.OPENAI_REALTIME_MODEL ||
        "gpt-4o-realtime-preview-2024-12-17";

      const resp = await fetch(
        `https://api.openai.com/v1/realtime?model=${encodeURIComponent(model)}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${EPHEMERAL}`,
            "Content-Type": "application/sdp",
          },
          body: offer.sdp!,
        }
      );
      if (!resp.ok) throw new Error(await resp.text());
      const answerSDP = await resp.text();
      await pc.setRemoteDescription({ type: "answer", sdp: answerSDP });

      setConnected(true);
    } catch (e: any) {
      setError(e?.message || "Failed to connect");
    } finally {
      setConnecting(false);
    }
  }

  function stop() {
    setConnected(false);
    const pc = pcRef.current;
    pc?.getSenders().forEach((s) => s.track?.stop());
    pc?.close();
    pcRef.current = null;
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="rounded-2xl border border-zinc-800 p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Realtime Web Call</h3>
          {!connected ? (
            <button
              onClick={start}
              disabled={!ready || connecting}
              className="rounded-xl bg-white px-4 py-2 text-sm font-medium text-black disabled:opacity-50"
            >
              {connecting ? "Connecting…" : "Start call"}
            </button>
          ) : (
            <button
              onClick={stop}
              className="rounded-xl border border-zinc-700 px-4 py-2 text-sm hover:bg-zinc-900"
            >
              End call
            </button>
          )}
        </div>
        <p className="mt-2 text-sm text-zinc-400">
          Click “Start call”, speak, pause briefly, listen. Low-latency voice both ways.
        </p>
        <audio ref={remoteAudioRef} className="hidden" />
      </div>

      <div className="rounded-2xl border border-zinc-800 p-4">
        <AvatarPlayer remoteAudioRef={remoteAudioRef} />
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  );
}
