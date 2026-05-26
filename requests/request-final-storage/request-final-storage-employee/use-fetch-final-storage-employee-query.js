import { useQuery } from "@tanstack/react-query";
import axios from "axios";

const FetchFinalStorageEmployeeData = async () => {
  const response = await axios.get(
    "/api/final-storage-setup/final-storage-employee",
  );
  const data = response.data.finalStorageEmployeeData;

  return data;
};

export default function useFinalStorageEmployeeQuery() {
  const query = useQuery({
    queryKey: ["finalStorageEmployeeQueryKey"],
    queryFn: FetchFinalStorageEmployeeData,
  });

  return query;
}
