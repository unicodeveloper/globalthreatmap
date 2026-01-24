import { ImageResponse } from "next/og";

export const size = {
  width: 180,
  height: 180,
};
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 24,
          background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "32px",
        }}
      >
        <svg
          width="140"
          height="140"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Globe */}
          <circle
            cx="12"
            cy="12"
            r="9"
            stroke="#60a5fa"
            strokeWidth="1.5"
            fill="none"
          />
          {/* Longitude lines */}
          <ellipse
            cx="12"
            cy="12"
            rx="4"
            ry="9"
            stroke="#60a5fa"
            strokeWidth="1"
            fill="none"
          />
          {/* Latitude line */}
          <line
            x1="3"
            y1="12"
            x2="21"
            y2="12"
            stroke="#60a5fa"
            strokeWidth="1"
          />
          {/* Threat indicator dot */}
          <circle cx="18" cy="6" r="4" fill="#ef4444" />
          <circle cx="18" cy="6" r="2" fill="#fca5a5" />
        </svg>
      </div>
    ),
    {
      ...size,
    }
  );
}
