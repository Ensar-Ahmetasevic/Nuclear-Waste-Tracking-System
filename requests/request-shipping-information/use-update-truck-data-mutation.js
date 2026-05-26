import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { toast } from "react-toastify";

export default function useUpdateTruckDataMutation() {
  const queryClient = useQueryClient();

  const updateTruckDataMutations = async (updatedTruckData) => {
    try {
      const response = await axios.put("/api/shipping-informations", {
        updatedTruckData,
      });
      return response.data;
    } catch (error) {
      console.error("Failed to UPDATE Truck Data informations: ", error);
      toast.error(`Error: ${error.response.data.message}`);
      throw error; // Throw the error to trigger onError callback
    }
  };

  const mutation = useMutation({
    mutationFn: updateTruckDataMutations,
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({
        queryKey: ["shippingInformationQueryKey"],
      });
      queryClient.invalidateQueries({
        queryKey: ["shippingInformationIDQueryKey"],
      });
      // Toast a success message
      toast.success("Truck Data UPDATED successfully.", {
        autoClose: 2000,
      });
    },
  });

  return mutation;
}
