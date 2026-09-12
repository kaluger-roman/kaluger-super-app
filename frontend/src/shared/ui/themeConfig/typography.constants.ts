export const typography = {
  fontFamily: [
    '"Roboto"',
    '"Inter"',
    "-apple-system",
    "BlinkMacSystemFont",
    '"Segoe UI"',
    '"Helvetica Neue"',
    "Arial",
    "sans-serif",
  ].join(","),
  h1: {
    fontWeight: 700,
    fontSize: "clamp(1.875rem, 4vw, 2.75rem)",
    lineHeight: 1.2,
    color: "#1B4332",
  },
  h2: {
    fontWeight: 600,
    fontSize: "clamp(1.5rem, 3.5vw, 2.25rem)",
    lineHeight: 1.3,
    color: "#1B4332",
  },
  h3: {
    fontWeight: 600,
    fontSize: "clamp(1.25rem, 3vw, 1.875rem)",
    lineHeight: 1.3,
    color: "#1B4332",
  },
  h4: {
    fontWeight: 600,
    fontSize: "clamp(1.125rem, 2.5vw, 1.5rem)",
    lineHeight: 1.4,
    color: "#1B4332",
  },
  h5: {
    fontWeight: 600,
    fontSize: "clamp(1rem, 2vw, 1.25rem)",
    lineHeight: 1.4,
    color: "#1B4332",
  },
  h6: {
    fontWeight: 600,
    fontSize: "clamp(0.875rem, 1.5vw, 1.125rem)",
    lineHeight: 1.4,
    color: "#1B4332",
  },
  body1: {
    fontSize: "clamp(0.875rem, 1.2vw, 1rem)",
    lineHeight: 1.6,
    color: "#2D5A3D",
  },
  body2: {
    fontSize: "clamp(0.75rem, 1vw, 0.875rem)",
    lineHeight: 1.6,
    color: "#2D5A3D",
  },
  button: {
    fontWeight: 600,
    textTransform: "none" as const,
    fontSize: "clamp(0.875rem, 1.2vw, 1rem)",
  },
};
