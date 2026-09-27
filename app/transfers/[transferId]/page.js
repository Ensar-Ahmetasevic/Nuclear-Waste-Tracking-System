"use client";
import { useParams } from "next/navigation";
import TransferDetail from "../../../components/pages/transfers/transfer-detail";

export default function TransferPage() {
  const { transferId } = useParams();
  return <TransferDetail transferId={Number(transferId)} />;
}
