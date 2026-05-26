import { useQuery } from "@tanstack/react-query";
import axios from "axios";

const FetchWasteProfileData = async () => {
  const response = await axios.get("/api/container-profile/waste-profile");
  const data = response.data.wasteProfileData;

  return data;
};

const useWasteProfileQuery = () => {
  const query = useQuery({
    queryKey: ["wasteProfileQueryKey"],
    queryFn: FetchWasteProfileData,
  });

  return query;
};

export default useWasteProfileQuery;
