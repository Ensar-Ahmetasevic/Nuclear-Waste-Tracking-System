import { useQuery } from "@tanstack/react-query";
import axios from "axios";

const FetchshippingInformationData = async () => {
  const response = await axios.get("/api/shipping-informations");
  const data = response.data;

  return data;
};

const useShippingInformationQuery = (options = {}) => {
  const query = useQuery({
    queryKey: ["shippingInformationQueryKey"],
    queryFn: () => FetchshippingInformationData(),
    ...options, // Allows passing additional options like refetchInterval, etc.
  });

  return query;
};

export default useShippingInformationQuery;
