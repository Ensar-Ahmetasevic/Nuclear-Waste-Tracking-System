import { useQuery } from "@tanstack/react-query";
import axios from "axios";

const fetchShippingInformationsStatus = async () => {
  const response = await axios.get(`/api/shipping-informations/pending`);
  return response.data.pendingShippingInformations;
};

const useShippingInformationsStautsQuery = (options = {}) => {
  const query = useQuery({
    queryKey: ["statusShippingInformations"],
    queryFn: () => fetchShippingInformationsStatus(),

    ...options,
  });

  return query;
};

export default useShippingInformationsStautsQuery;
