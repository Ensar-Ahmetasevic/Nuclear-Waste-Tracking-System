import { useQuery } from "@tanstack/react-query";
import axios from "axios";

const FetchLocationOriginData = async () => {
  const response = await axios.get("/api/container-profile/location-origin");

  const data = response.data.locationOriginData;

  return data;
};

const useLocationOriginQuery = () => {
  const query = useQuery({
    queryKey: ["locationOriginQueryKey"],
    queryFn: FetchLocationOriginData,
  });

  return query;
};

export default useLocationOriginQuery;
