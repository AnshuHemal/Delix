import type { Metadata } from "next";
import { NotFoundView } from "@/components/not-found/not-found-view";

export const metadata: Metadata = {
  title: "404 — Page not found",
  description: "The page you are looking for doesn't exist or has been moved.",
};

export default function NotFound() {
  return <NotFoundView />;
}
