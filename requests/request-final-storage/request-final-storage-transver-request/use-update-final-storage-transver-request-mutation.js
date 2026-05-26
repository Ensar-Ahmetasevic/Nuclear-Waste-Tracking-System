import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { toast } from "react-toastify";

export default function useUpdateFinalStorageTransferRequestMutation() {
  const queryClient = useQueryClient();

  const updateFinalStorageTransferRequestMutation = async ({
    operationType,
    data,
  }) => {
    try {
      const response = await axios.put(
        "/api/final-storage-setup/final-storage-transver-request",
        { operationType, data },
      );
      return response.data;
    } catch (error) {
      console.error(
        "Failed to UPDATE FinalStorage Transfer Request informations: ",
        error,
      );
      // Use the server's error message if available
      const errorMessage =
        error.response?.data?.message || "An unknown error occurred";
      toast.error(errorMessage);
      throw error;
    }
  };

  const mutation = useMutation({
    mutationFn: updateFinalStorageTransferRequestMutation,
    onSuccess: (data) => {
      // Invalidate and refetch
      queryClient.invalidateQueries({
        queryKey: ["finalStorageTransferRequestQueryKey"],
        queryKey: ["finalStorageLocationQueryKey"],
      });
      // Use the server's success message
      toast.success(data.message, {
        autoClose: 2000,
      });
    },
  });

  return mutation;
}
