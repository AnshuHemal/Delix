import type { Metadata } from "next";
import { OnboardingView } from "@/components/onboarding/onboarding-view";

export const metadata: Metadata = {
  title: "Create your workspace — Delix",
  description: "Set up your Delix workspace to get started",
};

export default function OnboardingPage() {
  return <OnboardingView />;
}
