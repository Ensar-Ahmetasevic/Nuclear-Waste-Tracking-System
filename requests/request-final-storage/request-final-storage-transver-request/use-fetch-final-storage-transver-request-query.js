import { useQuery } from "@tanstack/react-query";
import axios from "axios";

const FetchFinalStorageTransferRequestData = async () => {
  const response = await axios.get(
    "/api/final-storage-setup/final-storage-transver-request",
  );
  const data = response.data.finalStorageTransferRequestData;

  return data;
};

const useFinalStorageTransferRequestQuery = () => {
  const query = useQuery({
    queryKey: ["finalStorageTransferRequestQueryKey"],
    queryFn: FetchFinalStorageTransferRequestData,
  });

  return query;
};

export default useFinalStorageTransferRequestQuery;
