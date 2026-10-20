import "./globals.css";

export const metadata = {
  title: "Paper Wrap Newspaper",
  description: "Scroll-triggered paper wrap newspaper transition.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
