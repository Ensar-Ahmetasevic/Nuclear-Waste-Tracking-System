import { useQuery } from "@tanstack/react-query";
import axios from "axios";

const FetchContaierTypeData = async () => {
  const response = await axios.get("/api/container-profile/container-type");
  const data = response.data.containerTypeData;

  return data;
};

const useContainerTypeQuery = () => {
  const query = useQuery({
    queryKey: ["containerTypeQueryKey"],
    queryFn: FetchContaierTypeData,
  });

  return query;
};

export default useContainerTypeQuery;
