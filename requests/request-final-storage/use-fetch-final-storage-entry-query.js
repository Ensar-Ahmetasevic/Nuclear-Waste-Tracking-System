import { useQuery } from "@tanstack/react-query";
import axios from "axios";

const FetchFinalStorageEntryData = async () => {
  const response = await axios.get("/api/final-storage-setup");
  const data = response.data.finalStorageEntryData;
  return data;
};

const useFinalStorageEntryQuery = () => {
  const query = useQuery({
    queryKey: ["finalStorageEntryQueryKey"],
    queryFn: FetchFinalStorageEntryData,
  });

  return query;
};

export default useFinalStorageEntryQuery;
