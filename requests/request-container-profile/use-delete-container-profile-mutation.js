import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { toast } from "react-toastify";

function useDeleteContainerProfileMutations() {
  const queryClient = useQueryClient();

  const deleteContainerProfileMutations = async (id) => {
    try {
      const response = await axios.delete("/api/container-profile", {
        data: { id },
      });
      return response.data;
    } catch (error) {
      console.error("Failed to DELETE shipping data: ", error);
      toast.error(`Error: ${error.response.data.message}`);
      throw error; // Throw the error to trigger onError callback
    }
  };

  const mutation = useMutation({
    mutationFn: deleteContainerProfileMutations,
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
      toast.success("Container Profile data DELETED successfully.", {
        autoClose: 2000,
      });
    },
  });

  return mutation;
}

export default useDeleteContainerProfileMutations;
