import React from "react";

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  className?: string;
  variant?: "text" | "circular" | "rectangular";
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width,
  height,
  borderRadius,
  className = "",
  variant = "rectangular",
}) => {
  const style: React.CSSProperties = {
    width: width || "100%",
    height: height || "1rem",
    borderRadius: borderRadius || (variant === "circular" ? "50%" : variant === "text" ? "4px" : "8px"),
  };

  return (
    <div className={`skeleton ${variant} ${className}`} style={style}>
      <style jsx>{`
        .skeleton {
          background: linear-gradient(
            90deg,
            var(--bg-input) 25%,
            var(--bg-card-hover) 50%,
            var(--bg-input) 75%
          );
          background-size: 200% 100%;
          animation: skeleton-loading 1.5s infinite linear;
        }

        @keyframes skeleton-loading {
          0% {
            background-position: 200% 0;
          }
          100% {
            background-position: -200% 0;
          }
        }

        .text {
          margin-bottom: 0.5rem;
        }
      `}</style>
    </div>
  );
};

export const SkeletonCard = () => (
  <div className="card" style={{ marginBottom: "1rem" }}>
    <Skeleton variant="text" width="60%" height="1.2rem" />
    <Skeleton variant="text" width="40%" height="0.8rem" />
    <div style={{ marginTop: "1rem", display: "flex", gap: "8px" }}>
      <Skeleton variant="rectangular" width="30%" height="2rem" />
      <Skeleton variant="rectangular" width="30%" height="2rem" />
    </div>
  </div>
);
