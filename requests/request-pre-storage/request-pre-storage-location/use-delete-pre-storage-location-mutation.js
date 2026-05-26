import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { toast } from "react-toastify";

export default function useDeletePreStorageLocationMutation() {
  const queryClient = useQueryClient();

  const deletePreStorageLocationMutation = async (id) => {
    try {
      const response = await axios.delete(
        "/api/pre-storage-setup/pre-storage-location",
        {
          data: { id },
        },
      );
      return response.data;
    } catch (error) {
      console.error("Failed to DELETE Pre-Storage Location: ", error);
      toast.error(`Error: ${error.response.data.message}`);
      throw error; // Throw the error to trigger onError callback
    }
  };

  const mutation = useMutation({
    mutationFn: deletePreStorageLocationMutation,
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({
        queryKey: ["preStorageLocationQueryKey"],
      });
      // Toast a success message
      toast.success("Pre-Storage Location DELETED successfully.", {
        autoClose: 2000,
      });
    },
  });

  return mutation;
}
