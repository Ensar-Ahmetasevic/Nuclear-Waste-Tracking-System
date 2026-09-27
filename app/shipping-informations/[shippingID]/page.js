"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import DetailsShippingData from "../../../components/pages/shipping-informations/details-shipping-data";
import useShippingInformationByIdQuery from "./../../../requests/request-shipping-information/use-fetch-shipping-information-by-id-query";
import { useT } from "../../../components/shell/preferences";
import Skeleton from "../../../components/ui/skeleton";
import { LoadingWatch } from "../../../components/loading/loaders";

export default function ShippingDetails() {
  const t = useT();
  const { shippingID } = useParams();
  const { data, isLoading, error } =
    useShippingInformationByIdQuery(shippingID);
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {isLoading ? (
        <div
          className="space-y-6"
          role="status"
          aria-label={t("common.loading")}
        >
          <LoadingWatch />
          <Skeleton className="h-20" />
          <Skeleton className="h-44" />
          <Skeleton className="h-72" />
        </div>
      ) : !data?.shippingData || error ? (
        <div
          role="alert"
          className="space-y-3 rounded-box border border-error/40 bg-error/10 p-5"
        >
          <p>{t("ship.loadError")}</p>
          <Link
            href="/shipping-informations"
            className="btn min-h-11 btn-ghost"
          >
            {t("ship.title")}
          </Link>
        </div>
      ) : (
        <DetailsShippingData data={data} />
      )}
    </main>
  );
}
