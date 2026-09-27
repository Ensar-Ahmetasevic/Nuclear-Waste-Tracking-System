import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { manualRefreshOptions } from "@/components/shared/data-freshness";

const FetchWasteProfileData = async () => {
  const response = await axios.get("/api/container-profile/waste-profile", { timeout: 20000 });
  const data = response.data.wasteProfileData;

  return data;
};

const useWasteProfileQuery = () => {
  const query = useQuery({
    queryKey: ["wasteProfileQueryKey"],
    queryFn: FetchWasteProfileData,
    ...manualRefreshOptions,
  });

  return query;
};

export default useWasteProfileQuery;
