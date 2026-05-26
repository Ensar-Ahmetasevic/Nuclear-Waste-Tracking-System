import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { toast } from "react-toastify";

function useCreateShippingInformationsMutation() {
  const queryClient = useQueryClient();

  const createShippingInformationsMutation = async ({ formData }) => {
    try {
      const response = await axios.post("/api/shipping-informations", formData);
      return response;
    } catch (error) {
      console.error("Failed to create new Shipping Informations data", error);
      toast.error(`Error: ${error.response?.data?.message || error.message}`);
      throw error;
    }
  };

  const mutation = useMutation({
    mutationFn: createShippingInformationsMutation,
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({
        queryKey: ["shippingInformationQueryKey"],
      });
      queryClient.invalidateQueries({
        queryKey: ["shippingInformationIDQueryKey"],
      });
      // Toast a success message
      toast.success("Shipping Information data created successfully.", {
        autoClose: 2000,
      });
    },
  });

  return mutation;
}

export default useCreateShippingInformationsMutation;
