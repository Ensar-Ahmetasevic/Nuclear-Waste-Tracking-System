import { useQuery } from "@tanstack/react-query";
import axios from "axios";

const FetchPreStorageEmployeeData = async () => {
  const response = await axios.get(
    "/api/pre-storage-setup/pre-storage-employee",
  );
  const data = response.data.preStorageEmployeeData;

  return data;
};

export default function usePreStorageEmployeeQuery() {
  const query = useQuery({
    queryKey: ["preStorageEmployeeQueryKey"],
    queryFn: FetchPreStorageEmployeeData,
  });

  return query;
}
