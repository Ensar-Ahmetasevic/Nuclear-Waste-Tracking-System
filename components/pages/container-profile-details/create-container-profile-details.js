"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import useLocationOriginQuery from "../../../requests/request-container-profile/request-location-origin/use-fetch-location-origin-query";
import useWasteProfileQuery from "../../../requests/request-container-profile/request-waste-profile/use-fetch-waste-profile-query";
import useContainerTypeQuery from "../../../requests/request-container-profile/request-container-type/use-fetch-container-type-query";
import { useT } from "../../shell/preferences";
import ConfigurationManager from "./configuration-manager";
import SetupPage from "./setup-page";

const KINDS = ["LOCATION_ORIGIN", "WASTE_PROFILE", "CONTAINER_TYPE"];

export default function CreateContainerProfileDetails() {
  const t = useT();
  const { data: session } = useSession();
  const canManage = session?.user?.role === "ADMINISTRATOR";
  const origins = useLocationOriginQuery();
  const waste = useWasteProfileQuery();
  const types = useContainerTypeQuery();
  const loading = origins.isLoading || waste.isLoading || types.isLoading;
  const failed = origins.isError || waste.isError || types.isError;
  // Archived definitions remain on existing records but cannot be chosen for new profiles.
  const ready =
    origins.data?.some((origin) => !origin.archivedAt) &&
    waste.data?.some(
      (profile) =>
        !profile.archivedAt &&
        types.data?.some(
          (type) => type.id === profile.containerTypeId && !type.archivedAt,
        ),
    );
  return (
    <SetupPage
      scene="scan"
      tone="step-1"
      position="50% 40%"
      eyebrow={t("nav.section.administration")}
      title={t("nav.definitions")}
      description={t("setup.definitions.desc")}
      kinds={KINDS}
      status={
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p role="status" className="text-sm text-base-content/80">
            {loading
              ? t("setup.definitions.checking")
              : failed
                ? t("setup.definitions.failed")
                : ready
                  ? t("setup.definitions.ready")
                  : canManage
                    ? t("setup.definitions.missingAdmin")
                    : t("setup.definitions.missing")}
          </p>
          {!loading && !failed && ready && (
            <Link
              className="btn min-h-11 btn-primary"
              href="/shipping-informations"
            >
              {t("home.open.SHIPPING")}
            </Link>
          )}
        </div>
      }
    >
      {canManage ? (
        <ConfigurationManager kinds={KINDS} />
      ) : (
        <p className="text-sm text-base-content/70">
          {t("setup.definitions.adminOnly")}
        </p>
      )}
    </SetupPage>
  );
}
