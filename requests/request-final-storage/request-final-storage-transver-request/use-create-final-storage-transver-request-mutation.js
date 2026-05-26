import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { toast } from "react-toastify";

export default function useCreateFinalStorageTransverRequestMutation() {
  const queryClient = useQueryClient();

  const createFinalStorageTransverRequestMutation = async (formData) => {
    try {
      const response = await axios.post(
        "/api/final-storage-setup/final-storage-transver-request",
        formData,
      );
      return response;
    } catch (error) {
      console.error("Failed to create new request to pre-storage", error);
      toast.error(`Error: ${error.response.data.message}`);
      throw error;
    }
  };

  const mutation = useMutation({
    mutationFn: createFinalStorageTransverRequestMutation,
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({
        queryKey: ["finalStorageTransverRequestQueryKey"],
      });
      // Toast a success message
      toast.success("New request to pre-storage created successfully.", {
        autoClose: 2000,
      });
    },
  });

  return mutation;
}
