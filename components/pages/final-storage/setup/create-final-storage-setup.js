"use client";

import ConfigurationManager from "@/components/pages/container-profile-details/configuration-manager";
import SetupPage from "@/components/pages/container-profile-details/setup-page";
import MonitoringRules from "@/components/shared/monitoring-rules";
import { useT } from "@/components/shell/preferences";

const KINDS = ["FINAL_STORAGE_LOCATION", "FINAL_STORAGE_EMPLOYEE"];

export default function CreateFinalStorageSetup() {
  const t = useT();
  return (
    <SetupPage
      scene="finalStorage"
      tone="step-3"
      position="50% 45%"
      eyebrow={t("storage.eyebrow.FINAL_STORAGE")}
      title={t("setup.title.FINAL_STORAGE")}
      description={t("setup.desc.FINAL_STORAGE")}
      kinds={KINDS}
      status={
        <p className="text-sm text-base-content/80">
          {t("setup.storage.status")}
        </p>
      }
    >
      <ConfigurationManager kinds={KINDS} />
      <MonitoringRules area="final-storage" />
    </SetupPage>
  );
}
