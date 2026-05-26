import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { toast } from "react-toastify";

export default function useDeleteLocationOriginMutation() {
  const queryClient = useQueryClient();

  const deleteLocationOriginMutation = async (id) => {
    try {
      const response = await axios.delete(
        "/api/container-profile/location-origin",
        {
          data: { id },
        },
      );
      return response.data;
    } catch (error) {
      console.error("Failed to DELETE Location Origin data: ", error);
      toast.error("Failed to delete location origin.");
      throw error;
    }
  };

  const mutation = useMutation({
    mutationFn: deleteLocationOriginMutation,
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({
        queryKey: ["locationOriginQueryKey"],
      });
      // Toast a success message
      toast.success("Location Origin data DELETED successfully.", {
        autoClose: 2000,
      });
    },
  });

  return mutation;
}
