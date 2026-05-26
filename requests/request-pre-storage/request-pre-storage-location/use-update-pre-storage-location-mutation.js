import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { toast } from "react-toastify";

export default function useUpdatePreStorageLocationMutation() {
  const queryClient = useQueryClient();

  const updatePreStorageLocationMutation = async (dataForUpdate) => {
    try {
      const response = await axios.put(
        "/api/pre-storage-setup/pre-storage-location",
        {
          dataForUpdate,
        },
      );
      return response.data;
    } catch (error) {
      console.error(
        "Failed to UPDATE PreStorage Location informations: ",
        error,
      );
      toast.error(`Error: ${error.response.data.message}`);
      throw error; // Throw the error to trigger onError callback
    }
  };

  const mutation = useMutation({
    mutationFn: updatePreStorageLocationMutation,
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({
        queryKey: ["preStorageLocationQueryKey"],
      });
      // Toast a success message
      toast.success("PreStorage Location UPDATED successfully.", {
        autoClose: 2000,
      });
    },
  });

  return mutation;
}
