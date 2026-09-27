import { useQuery } from "@tanstack/react-query";
import axios from "axios";

const FetchFinalStorageEmployeeData = async () => {
  const response = await axios.get(
    "/api/final-storage-setup/final-storage-employee",
  );
  const data = response.data.finalStorageEmployeeData;

  return data;
};

export default function useFinalStorageEmployeeQuery({ activeOnly = false } = {}) {
  const query = useQuery({
    queryKey: ["finalStorageEmployeeQueryKey"],
    queryFn: FetchFinalStorageEmployeeData,
    // Deactivated people stay in the list for history but are not offered for new records.
    select: activeOnly ? rows => rows.filter(row => !row.archivedAt) : undefined,
  });

  return query;
}
