import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { toast } from "react-toastify";

export default function useCreatePreStorageCapacityMutation() {
  const queryClient = useQueryClient();

  const createPreStorageCapacityMutation = async (formData) => {
    try {
      const response = await axios.post("/api/pre-storage-setup", formData);
      return response.data;
    } catch (error) {
      console.error("Failed to create new Pre-Storage Capacity Waste", error);
      toast.error(`Error: ${error.response?.data?.message || error.message}`);
      throw error;
    }
  };

  const mutation = useMutation({
    mutationFn: createPreStorageCapacityMutation,
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({
        queryKey: ["preStorageCapacityQueryKey"],
      });
      queryClient.invalidateQueries({
        queryKey: ["preStorageIDQueryKey"],
      });
      queryClient.invalidateQueries({
        queryKey: ["statusShippingInformations"],
      });

      // Toast a success message
      toast.success("Pre-Storage Capacity Waste created successfully.", {
        autoClose: 2000,
      });
    },
  });

  return mutation;
}
