import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { toast } from "react-toastify";

export default function useUpdateContainerTypeMutation() {
  const queryClient = useQueryClient();

  const updateContainerTypeMutation = async (preparedData) => {
    try {
      const response = await axios.put(
        "/api/container-profile/container-type",
        {
          preparedData,
        },
      );
      return response.data;
    } catch (error) {
      console.error("Failed to UPDATE Container Type informations: ", error);
      toast.error(`Error: ${error.response.data.message}`);
      throw error; // Throw the error to trigger onError callback
    }
  };

  const mutation = useMutation({
    mutationFn: updateContainerTypeMutation,
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({
        queryKey: ["containerTypeQueryKey"],
      });
      // Toast a success message
      toast.success("Container Type UPDATED successfully.", {
        autoClose: 2000,
      });
    },
  });

  return mutation;
}
