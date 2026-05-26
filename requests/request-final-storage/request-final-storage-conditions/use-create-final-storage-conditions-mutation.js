import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { toast } from "react-toastify";

export default function useCreateFinalStorageConditionsMutation() {
  const queryClient = useQueryClient();

  const createFinalStorageConditionsMutation = async (formData) => {
    try {
      const response = await axios.post(
        "/api/final-storage-setup/final-storage-conditions",
        formData,
      );
      return response.data;
    } catch (error) {
      console.error("Failed to create new Final-Storage Conditions", error);
      toast.error(`Error: ${error.response?.data?.message || error.message}`);
      throw error;
    }
  };

  const mutation = useMutation({
    mutationFn: createFinalStorageConditionsMutation,
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({
        queryKey: ["finalStorageConditionsQueryKey"],
      });
      queryClient.invalidateQueries({
        queryKey: ["finalStorageIDQueryKey"],
      });

      // Toast a success message
      toast.success("Final-Storage Conditions created successfully.", {
        autoClose: 2000,
      });
    },
  });

  return mutation;
}
