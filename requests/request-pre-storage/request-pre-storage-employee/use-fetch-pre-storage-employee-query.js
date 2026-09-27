import { useQuery } from "@tanstack/react-query";
import axios from "axios";

const FetchPreStorageEmployeeData = async () => {
  const response = await axios.get(
    "/api/pre-storage-setup/pre-storage-employee",
  );
  const data = response.data.preStorageEmployeeData;

  return data;
};

export default function usePreStorageEmployeeQuery({ activeOnly = false } = {}) {
  const query = useQuery({
    queryKey: ["preStorageEmployeeQueryKey"],
    queryFn: FetchPreStorageEmployeeData,
    // Deactivated people stay in the list for history but are not offered for new records.
    select: activeOnly ? rows => rows.filter(row => !row.archivedAt) : undefined,
  });

  return query;
}
