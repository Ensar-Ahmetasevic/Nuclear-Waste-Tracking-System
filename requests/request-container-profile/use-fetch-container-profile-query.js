import { useQuery } from "@tanstack/react-query";
import axios from "axios";

const FetchContainerProfileData = async () => {
  const response = await axios.get("/api/container-profile");

  const data = response.data;

  return data;
};

const useContainerProfileQuery = () => {
  const query = useQuery({
    queryKey: ["containerProfileQueryKey"],
    queryFn: FetchContainerProfileData,
  });

  return query;
};

export default useContainerProfileQuery;
