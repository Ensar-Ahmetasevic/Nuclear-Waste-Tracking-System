import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { manualRefreshOptions } from "@/components/shared/data-freshness";

const FetchLocationOriginData = async () => {
  const response = await axios.get("/api/container-profile/location-origin", { timeout: 20000 });

  const data = response.data.locationOriginData;

  return data;
};

const useLocationOriginQuery = () => {
  const query = useQuery({
    queryKey: ["locationOriginQueryKey"],
    queryFn: FetchLocationOriginData,
    ...manualRefreshOptions,
  });

  return query;
};

export default useLocationOriginQuery;
