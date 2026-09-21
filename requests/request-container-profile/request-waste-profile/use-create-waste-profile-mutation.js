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
      toast.error(error.response?.data?.message || "Unable to create waste profile");
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
