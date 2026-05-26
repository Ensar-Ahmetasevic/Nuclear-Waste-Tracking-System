import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { toast } from "react-toastify";

export default function useUpdateFinalStorageLocationMutation() {
  const queryClient = useQueryClient();

  const updateFinalStorageLocationMutation = async (dataForUpdate) => {
    try {
      const response = await axios.put(
        "/api/final-storage-setup/final-storage-location",
        {
          dataForUpdate,
        },
      );
      return response.data;
    } catch (error) {
      console.error(
        "Failed to UPDATE FinalStorage Location informations: ",
        error,
      );
      toast.error(`Error: ${error.response.data.message}`);
      throw error; // Throw the error to trigger onError callback
    }
  };

  const mutation = useMutation({
    mutationFn: updateFinalStorageLocationMutation,
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({
        queryKey: ["finalStorageLocationQueryKey"],
      });
      // Toast a success message
      toast.success("FinalStorage Location UPDATED successfully.", {
        autoClose: 2000,
      });
    },
  });

  return mutation;
}
