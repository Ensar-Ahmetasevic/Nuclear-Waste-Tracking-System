import { useQuery } from "@tanstack/react-query";
import axios from "axios";

const FetchPreStorageLocationData = async () => {
  const response = await axios.get(
    "/api/pre-storage-setup/pre-storage-location",
  );
  const data = response.data.preStorageLocationData;

  return data;
};

const usePreStorageLocationQuery = () => {
  const query = useQuery({
    queryKey: ["preStorageLocationQueryKey"],
    queryFn: FetchPreStorageLocationData,
  });

  return query;
};

export default usePreStorageLocationQuery;
