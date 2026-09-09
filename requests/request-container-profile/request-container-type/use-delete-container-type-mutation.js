import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { toast } from "react-toastify";

export default function useDeleteContainerTypeMutation() {
  const queryClient = useQueryClient();

  const deleteContainerTypeMutation = async (id) => {
    try {
      const response = await axios.delete(
        "/api/container-profile/container-type",
        {
          data: { id },
        },
      );
      return response.data;
    } catch (error) {
      console.error("Failed to DELETE Container Type data: ", error);
      toast.error(`Error: ${error.response.data.message}`);
      throw error; // Throw the error to trigger onError callback
    }
  };

  const mutation = useMutation({
    mutationFn: deleteContainerTypeMutation,
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({
        queryKey: ["containerTypeQueryKey"],
      });
      // Toast a success message
      toast.success("Container Type data DELETED successfully.", {
        autoClose: 2000,
      });
    },
  });

  return mutation;
}
