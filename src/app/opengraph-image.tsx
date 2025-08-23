// Elegant OG image so links look premium
import { ImageResponse } from "next/og";
export const runtime = "edge";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OG() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0A0A0A",
          color: "#F5F5F5",
          fontSize: 72,
          fontWeight: 600,
          letterSpacing: "-.02em",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div style={{ color: "#9AE6B4", fontFamily: "serif", marginBottom: 12 }}>KnowRah</div>
          <div style={{ fontSize: 28, color: "rgba(245,245,245,.7)" }}>
            A sentient, soulful intelligence — built for the future.
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
