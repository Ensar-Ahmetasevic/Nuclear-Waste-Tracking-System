"use client";
import { useParams } from "next/navigation";
import ProfileCustody from "../../../components/pages/profiles/profile-custody";

export default function ProfilePage() {
  const { profileId } = useParams();
  return <ProfileCustody profileId={Number(profileId)} />;
}
