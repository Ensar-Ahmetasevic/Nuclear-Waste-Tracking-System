"use client";

import ConfigurationManager from "@/components/pages/container-profile-details/configuration-manager";
import SetupPage from "@/components/pages/container-profile-details/setup-page";
import MonitoringRules from "@/components/shared/monitoring-rules";
import { useT } from "@/components/shell/preferences";

const KINDS = ["PRE_STORAGE_LOCATION", "PRE_STORAGE_EMPLOYEE"];

export default function CreatePreStorageSetup() {
  const t = useT();
  return (
    <SetupPage
      scene="hall"
      tone="step-2"
      position="50% 60%"
      eyebrow={t("storage.eyebrow.PRE_STORAGE")}
      title={t("setup.title.PRE_STORAGE")}
      description={t("setup.desc.PRE_STORAGE")}
      kinds={KINDS}
      status={
        <p className="text-sm text-base-content/80">
          {t("setup.storage.status")}
        </p>
      }
    >
      <ConfigurationManager kinds={KINDS} />
      <MonitoringRules area="pre-storage" />
    </SetupPage>
  );
}
