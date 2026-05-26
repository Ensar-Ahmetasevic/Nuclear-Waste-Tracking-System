import { useQuery } from "@tanstack/react-query";
import axios from "axios";

const FetchPreStorageCapacityData = async () => {
  const response = await axios.get("/api/pre-storage-setup");
  const data = response.data.preStorageOfCapacityData;
  return data;
};

const usePreStorageCapacityQuery = () => {
  const query = useQuery({
    queryKey: ["preStorageCapacityQueryKey"],
    queryFn: FetchPreStorageCapacityData,
  });

  return query;
};

export default usePreStorageCapacityQuery;
