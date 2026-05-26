import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { toast } from "react-toastify";

function useDeleteShippingInformationsMutations() {
  const queryClient = useQueryClient();

  const deleteShippingInformationsMutation = async (id) => {
    try {
      const response = await axios.delete("/api/shipping-informations", {
        data: { id },
      });
      return response.data;
    } catch (error) {
      console.error("Failed to DELETE shipping informations: ", error);
      toast.error(`Error: ${error.response.data.message}`);
      throw error; // Throw the error to trigger onError callback
    }
  };

  const mutation = useMutation({
    mutationFn: deleteShippingInformationsMutation,
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({
        queryKey: ["shippingInformationQueryKey"],
      });
      queryClient.invalidateQueries({
        queryKey: ["shippingInformationIDQueryKey"],
      });
      // Toast a success message
      toast.success("Shipping Information data DELETED successfully.", {
        autoClose: 2000,
      });
    },
  });

  return mutation;
}

export default useDeleteShippingInformationsMutations;
