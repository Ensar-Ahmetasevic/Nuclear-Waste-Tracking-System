import { useQuery } from "@tanstack/react-query";
import axios from "axios";

const FetchFinalStorageLocationData = async () => {
  const response = await axios.get(
    "/api/final-storage-setup/final-storage-location",
  );
  const data = response.data.finalStorageLocationData;

  return data;
};

const useFinalStorageLocationQuery = () => {
  const query = useQuery({
    queryKey: ["finalStorageLocationQueryKey"],
    queryFn: FetchFinalStorageLocationData,
  });

  return query;
};

export default useFinalStorageLocationQuery;
