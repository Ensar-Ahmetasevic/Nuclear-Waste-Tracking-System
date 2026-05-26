import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { toast } from "react-toastify";

export default function useCreateFinalStorageLocationMutation() {
  const queryClient = useQueryClient();

  const createFinalStorageLocationMutation = async ({ formData }) => {
    try {
      const response = await axios.post(
        "/api/final-storage-setup/final-storage-location",
        formData,
      );
      return response;
    } catch (error) {
      console.error("Failed to create new Final-Storage Location data", error);
      toast.error(`Error: ${error.response.data.message}`);
      throw error;
    }
  };

  const mutation = useMutation({
    mutationFn: createFinalStorageLocationMutation,
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({
        queryKey: ["finalStorageLocationQueryKey"],
      });
      // Toast a success message
      toast.success("Final-Storage Location created successfully.", {
        autoClose: 2000,
      });
    },
  });

  return mutation;
}
