import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { manualRefreshOptions } from "@/components/shared/data-freshness";

const FetchContaierTypeData = async () => {
  const response = await axios.get("/api/container-profile/container-type", { timeout: 20000 });
  const data = response.data.containerTypeData;

  return data;
};

const useContainerTypeQuery = ({ enabled = true } = {}) => {
  const query = useQuery({
    queryKey: ["containerTypeQueryKey"],
    queryFn: FetchContaierTypeData,
    enabled,
    ...manualRefreshOptions,
  });

  return query;
};

export default useContainerTypeQuery;
