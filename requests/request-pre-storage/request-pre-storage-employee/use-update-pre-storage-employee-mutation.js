import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { toast } from "react-toastify";

export default function useUpdatePreStorageEmployeeMutation() {
  const queryClient = useQueryClient();

  const updatePreStorageEmployeeMutation = async (dataForUpdate) => {
    try {
      const response = await axios.put(
        "/api/pre-storage-setup/pre-storage-employee",
        {
          dataForUpdate,
        },
      );
      return response.data;
    } catch (error) {
      console.error(
        "Failed to UPDATE PreStorage Employee informations: ",
        error,
      );
      toast.error(`Error: ${error.response.data.message}`);
      throw error; // Throw the error to trigger onError callback
    }
  };

  const mutation = useMutation({
    mutationFn: updatePreStorageEmployeeMutation,
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({
        queryKey: ["preStorageEmployeeQueryKey"],
      });
      // Toast a success message
      toast.success("PreStorage Employee UPDATED successfully.", {
        autoClose: 2000,
      });
    },
  });

  return mutation;
}
