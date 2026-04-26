import { SchemaView } from "@/components/dashboard/schema/schema-view";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Database Schema — Delix",
};

export default function SchemaPage() {
  return <SchemaView />;
}
