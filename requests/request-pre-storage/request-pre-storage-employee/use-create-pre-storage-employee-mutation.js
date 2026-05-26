import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { toast } from "react-toastify";

export default function useCreatePreStorageEmployeeMutation() {
  const queryClient = useQueryClient();

  const createPreStorageEmployeeMutation = async ({ formData }) => {
    try {
      const response = await axios.post(
        "/api/pre-storage-setup/pre-storage-employee",
        formData,
      );

      return response;
    } catch (error) {
      console.error("Failed to create new Pre-Storage Employee", error);
      toast.error(`Error: ${error}`);
      throw error;
    }
  };

  const mutation = useMutation({
    mutationFn: createPreStorageEmployeeMutation,
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({
        queryKey: ["preStorageEmployeeQueryKey"],
      });
      // Toast a success message
      toast.success("Pre-Storage Employee created successfully.", {
        autoClose: 2000,
      });
    },
  });

  return mutation;
}
