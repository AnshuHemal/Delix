import type { Metadata } from "next";
import { RealtimeView } from "@/components/dashboard/realtime/realtime-view";

export const metadata: Metadata = {
  title: "Real-time Engine — Delix",
};

export default function RealtimePage() {
  return <RealtimeView />;
}
