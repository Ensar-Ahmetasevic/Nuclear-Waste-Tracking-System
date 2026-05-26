import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { toast } from "react-toastify";

export default function useCreatePreStorageConditionsMutation() {
  const queryClient = useQueryClient();

  const createPreStorageConditionsMutation = async (formData) => {
    try {
      const response = await axios.post(
        "/api/pre-storage-setup/pre-storage-conditions",
        formData,
      );
      return response.data;
    } catch (error) {
      console.error("Failed to create new Pre-Storage Conditions", error);
      toast.error(`Error: ${error.response?.data?.message || error.message}`);
      throw error;
    }
  };

  const mutation = useMutation({
    mutationFn: createPreStorageConditionsMutation,
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({
        queryKey: ["preStorageConditionsQueryKey"],
      });
      queryClient.invalidateQueries({
        queryKey: ["preStorageIDQueryKey"],
      });

      // Toast a success message
      toast.success("Pre-Storage Conditions created successfully.", {
        autoClose: 2000,
      });
    },
  });

  return mutation;
}
