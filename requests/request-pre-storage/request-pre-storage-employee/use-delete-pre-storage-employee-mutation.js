import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { toast } from "react-toastify";

export default function useDeletePreStorageEmployeeMutation() {
  const queryClient = useQueryClient();

  const deletePreStorageEmployeeMutation = async (id) => {
    try {
      const response = await axios.delete(
        "/api/pre-storage-setup/pre-storage-employee",
        {
          data: { id },
        },
      );
      return response.data;
    } catch (error) {
      console.error("Failed to DELETE Pre-Storage Employee: ", error);
      toast.error(`Error: ${error.response.data.message}`);
      throw error; // Throw the error to trigger onError callback
    }
  };

  const mutation = useMutation({
    mutationFn: deletePreStorageEmployeeMutation,
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({
        queryKey: ["preStorageEmployeeQueryKey"],
      });
      // Toast a success message
      toast.success("Pre-Storage Employee DELETED successfully.", {
        autoClose: 2000,
      });
    },
  });

  return mutation;
}
