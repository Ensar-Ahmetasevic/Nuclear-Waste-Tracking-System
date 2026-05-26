import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { toast } from "react-toastify";

export default function useUpdateWasteProfileMutation() {
  const queryClient = useQueryClient();

  const updateWasteProfileMutation = async (dataForUpdate) => {
    try {
      const response = await axios.put("/api/container-profile/waste-profile", {
        dataForUpdate,
      });
     
      return response.data;
    } catch (error) {
      toast.error(`Error: ${error.response.data.message}`);
      throw error; // Throw the error to trigger onError callback
    }
  };

  const mutation = useMutation({
    mutationFn: updateWasteProfileMutation,
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({
        queryKey: ["wasteProfileQueryKey"],
      });
      // Toast a success message
      toast.success("Waste Profile UPDATED successfully.", {
        autoClose: 2000,
      });
    },
  });

  return mutation;
}
