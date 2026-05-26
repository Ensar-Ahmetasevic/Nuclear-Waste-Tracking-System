import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { toast } from "react-toastify";

export default function useDeleteFinalStorageLocationMutation() {
  const queryClient = useQueryClient();

  const deleteFinalStorageLocationMutation = async (id) => {
    try {
      const response = await axios.delete(
        "/api/final-storage-setup/final-storage-location",
        {
          data: { id },
        },
      );
      return response.data;
    } catch (error) {
      console.error("Failed to DELETE Final-Storage Location: ", error);
      toast.error(`Error: ${error.response.data.message}`);
      throw error; // Throw the error to trigger onError callback
    }
  };

  const mutation = useMutation({
    mutationFn: deleteFinalStorageLocationMutation,
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({
        queryKey: ["finalStorageLocationQueryKey"],
      });
      // Toast a success message
      toast.success("Final-Storage Location DELETED successfully.", {
        autoClose: 2000,
      });
    },
  });

  return mutation;
}
