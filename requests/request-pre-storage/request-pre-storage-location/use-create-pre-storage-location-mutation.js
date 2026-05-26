import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { toast } from "react-toastify";

export default function useCreatePreStorageLocationMutation() {
  const queryClient = useQueryClient();

  const createPreStorageLocationMutation = async ({ formData }) => {
    try {
      const response = await axios.post(
        "/api/pre-storage-setup/pre-storage-location",
        formData,
      );
      return response;
    } catch (error) {
      console.error("Failed to create new Pre-Storage Location data", error);
      toast.error(`Error: ${error}`);
      throw error;
    }
  };

  const mutation = useMutation({
    mutationFn: createPreStorageLocationMutation,
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({
        queryKey: ["preStorageLocationQueryKey"],
      });
      // Toast a success message
      toast.success("Pre-Storage Location created successfully.", {
        autoClose: 2000,
      });
    },
  });

  return mutation;
}
