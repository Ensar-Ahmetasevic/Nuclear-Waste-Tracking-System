import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { toast } from "react-toastify";

export default function useUpdateLocationOriginMutation() {
  const queryClient = useQueryClient();

  const updateLocationOriginMutation = async (dataForUpdate) => {
    try {
      const response = await axios.put(
        "/api/container-profile/location-origin",
        {
          dataForUpdate,
        },
      );
      return response.data;
    } catch (error) {
      console.error("Failed to UPDATE Location Origin informations: ", error);
      toast.error(`Error: ${error.response.data.message}`);
      throw error; // Throw the error to trigger onError callback
    }
  };

  const mutation = useMutation({
    mutationFn: updateLocationOriginMutation,
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({
        queryKey: ["locationOriginQueryKey"],
      });
      // Toast a success message
      toast.success("Location Origin UPDATED successfully.", {
        autoClose: 2000,
      });
    },
  });

  return mutation;
}
