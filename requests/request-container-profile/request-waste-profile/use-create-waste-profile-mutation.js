import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { toast } from "react-toastify";

function useCreateWasteProfileMutation() {
  const queryClient = useQueryClient();

  const createWasteProfileMutation = async ({ formData }) => {
    try {
      const response = await axios.post(
        "/api/container-profile/waste-profile",
        formData,
      );
      return response;
    } catch (error) {
      console.error("Failed to create new Waste Profile data", error);
      toast.error(`Error: ${error}`);
      throw error;
    }
  };

  const mutation = useMutation({
    mutationFn: createWasteProfileMutation,
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({
        queryKey: ["wasteProfileQueryKey"],
      });
      // Toast a success message
      toast.success("Waste Profile data created successfully.", {
        autoClose: 2000,
      });
    },
  });

  return mutation;
}

export default useCreateWasteProfileMutation;
