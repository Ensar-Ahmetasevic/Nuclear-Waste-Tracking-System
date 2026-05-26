import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { toast } from "react-toastify";

export default function useDeleteWasteProfileMutation() {
  const queryClient = useQueryClient();

  const deleteWasteProfileMutation = async (id) => {
    try {
      const response = await axios.delete(
        "/api/container-profile/waste-profile",
        {
          data: { id },
        },
      );
      return response.data;
    } catch (error) {
      console.error("Failed to DELETE Waste Profile data: ", error);
      toast.error(`Error: ${error.response.data.message}`);
      throw error; // Throw the error to trigger onError callback
    }
  };

  const mutation = useMutation({
    mutationFn: deleteWasteProfileMutation,
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({
        queryKey: ["wasteProfileQueryKey"],
      });
      // Toast a success message
      toast.success("Waste Profile data DELETED successfully.", {
        autoClose: 2000,
      });
    },
  });

  return mutation;
}
