import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { toast } from "react-toastify";

export default function useUpdateFinalStorageEmployeeMutation() {
  const queryClient = useQueryClient();

  const updateFinalStorageEmployeeMutation = async (dataForUpdate) => {
    try {
      const response = await axios.put(
        "/api/final-storage-setup/final-storage-employee",
        {
          dataForUpdate,
        },
      );
      return response.data;
    } catch (error) {
      console.error(
        "Failed to UPDATE FinalStorage Employee informations: ",
        error,
      );
      toast.error(`Error: ${error.response.data.message}`);
      throw error; // Throw the error to trigger onError callback
    }
  };

  const mutation = useMutation({
    mutationFn: updateFinalStorageEmployeeMutation,
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({
        queryKey: ["finalStorageEmployeeQueryKey"],
      });
      // Toast a success message
      toast.success("FinalStorage Employee UPDATED successfully.", {
        autoClose: 2000,
      });
    },
  });

  return mutation;
}
