import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { toast } from "react-toastify";

export default function useUpdateContainerProfileMutation() {
  const queryClient = useQueryClient();

  const updateContainerProfileMutations = async (preparedData) => {
    try {
      const response = await axios.put("/api/container-profile", {
        preparedData,
      });
      return response.data;
    } catch (error) {
      console.error("Failed to UPDATE shipping informations: ", error);
      toast.error(`Error: ${error.response.data.message}`);
      throw error; // Throw the error to trigger onError callback
    }
  };

  const mutation = useMutation({
    mutationFn: updateContainerProfileMutations,
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({
        queryKey: ["containerProfileQueryKey"],
      });
      queryClient.invalidateQueries({
        queryKey: ["shippingInformationIDQueryKey"],
      });
      queryClient.invalidateQueries({
        queryKey: ["shippingInformationQueryKey"],
      });
      // Toast a success message
      toast.success("Container Profile data UPDATED successfully.", {
        autoClose: 2000,
      });
    },
  });

  return mutation;
}
