import { useQuery } from "@tanstack/react-query";
import axios from "axios";

const fetchShippingInformationById = async (shippingID) => {
  const response = await axios.get(`/api/shipping-informations/${shippingID}`);
  const data = response.data;

  return data;
};

const useShippingInformationByIdQuery = (shippingID, options = {}) => {
  const query = useQuery({
    queryKey: ["shippingInformationIDQueryKey"],
    queryFn: () => fetchShippingInformationById(shippingID),
    enabled: !!shippingID, // Ensures the query only runs if shippingID is provided
    ...options, // Allows passing additional options like refetchInterval, etc.
  });

  return query;
};

export default useShippingInformationByIdQuery;
