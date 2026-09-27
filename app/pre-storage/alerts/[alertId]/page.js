"use client";
import { useParams } from "next/navigation";
import AlertFocus from "../../../../components/pages/alerts/alert-focus";

export default function AlertFocusPage() {
  const { alertId } = useParams();
  return <AlertFocus area="pre-storage" alertId={Number(alertId)} />;
}
