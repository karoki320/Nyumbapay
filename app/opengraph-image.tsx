import { ImageResponse } from "next/og";

export const alt = "NyumbaPay — rent that reconciles itself";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OG() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between",
        background: "#0f5132", color: "#fff", padding: 72, fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18, fontSize: 40, fontWeight: 700 }}>
          <div style={{ width: 64, height: 64, borderRadius: 16, background: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="40" height="40" viewBox="0 0 64 64"><path d="M14 34 32 18l18 16v14a2 2 0 0 1-2 2H36V38h-8v12H16a2 2 0 0 1-2-2z" fill="#0f5132" /></svg>
          </div>
          NyumbaPay
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 84, fontWeight: 800, letterSpacing: -3, lineHeight: 1.05 }}>Rent that reconciles itself.</div>
          <div style={{ fontSize: 32, color: "#cfe6d8", marginTop: 20 }}>M-Pesa rent collection for Kenyan landlords · KSh 5,000 / year</div>
        </div>
      </div>
    ),
    size,
  );
}
