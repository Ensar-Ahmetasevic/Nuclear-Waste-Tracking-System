import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { toast } from "react-toastify";

export default function useCreateFinalStorageEmployeeMutation() {
  const queryClient = useQueryClient();

  const createFinalStorageEmployeeMutation = async ({ formData }) => {
    try {
      const response = await axios.post(
        "/api/final-storage-setup/final-storage-employee",
        formData,
      );

      return response;
    } catch (error) {
      console.error("Failed to create new Final-Storage Employee", error);
      toast.error(`Error: ${error.response.data.message}`);
      throw error;
    }
  };

  const mutation = useMutation({
    mutationFn: createFinalStorageEmployeeMutation,
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({
        queryKey: ["finalStorageEmployeeQueryKey"],
      });
      // Toast a success message
      toast.success("Final-Storage Employee created successfully.", {
        autoClose: 2000,
      });
    },
  });

  return mutation;
}
