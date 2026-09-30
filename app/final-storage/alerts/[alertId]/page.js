"use client";
import { useParams } from "next/navigation";
import HallAlert from "../../../../components/pages/alerts/hall-alert";

export default function HallAlertPage() {
  const { alertId } = useParams();
  return <HallAlert area="final-storage" alertId={Number(alertId)} />;
}
