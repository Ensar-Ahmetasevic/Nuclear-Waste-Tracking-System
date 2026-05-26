import { useQuery } from "@tanstack/react-query";
import axios from "axios";

const fetchFinalStorageById = async (finalStorageID) => {
  const response = await axios.get(
    `/api/final-storage-setup/${finalStorageID}`,
  );
  const data = response.data;

  return data;
};

export default function useFinalStorageByIdQuery(finalStorageID, options = {}) {
  const query = useQuery({
    queryKey: ["finalStorageIDQueryKey"],
    queryFn: () => fetchFinalStorageById(finalStorageID),
    enabled: !!finalStorageID, // Ensures the query only runs if shippingID is provided
    ...options, // Allows passing additional options like refetchInterval, etc.
  });

  return query;
}
