import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { toast } from "react-toastify";

export default function useDeleteFinalStorageEmployeeMutation() {
  const queryClient = useQueryClient();

  const deleteFinalStorageEmployeeMutation = async (id) => {
    try {
      const response = await axios.delete(
        "/api/final-storage-setup/final-storage-employee",
        {
          data: { id },
        },
      );
      return response.data;
    } catch (error) {
      console.error("Failed to DELETE Final-Storage Employee: ", error);
      toast.error(`Error: ${error.response.data.message}`);
      throw error; // Throw the error to trigger onError callback
    }
  };

  const mutation = useMutation({
    mutationFn: deleteFinalStorageEmployeeMutation,
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({
        queryKey: ["finalStorageEmployeeQueryKey"],
      });
      // Toast a success message
      toast.success("Final-Storage Employee DELETED successfully.", {
        autoClose: 2000,
      });
    },
  });

  return mutation;
}
