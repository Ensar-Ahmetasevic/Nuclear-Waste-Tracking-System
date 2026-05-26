import { useQuery } from "@tanstack/react-query";
import axios from "axios";

const fetchPreStorageById = async (preStorageID) => {
  const response = await axios.get(`/api/pre-storage-setup/${preStorageID}`);
  const data = response.data;
  return data;
};

export default function usePreStorageByIdQuery(preStorageID, options = {}) {
  const query = useQuery({
    queryKey: ["preStorageIDQueryKey"],
    queryFn: () => fetchPreStorageById(preStorageID),
    enabled: !!preStorageID, // Ensures the query only runs if shippingID is provided
    ...options, // Allows passing additional options like refetchInterval, etc.
  });

  return query;
}
