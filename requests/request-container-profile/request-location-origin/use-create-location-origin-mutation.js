import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { toast } from "react-toastify";

function useCreateLocationOriginMutation() {
  const queryClient = useQueryClient();

  const createLocationOriginMutation = async ({ formData }) => {
    try {
      const response = await axios.post(
        "/api/container-profile/location-origin",
        formData,
      );

      return response;
    } catch (error) {
      console.error("Failed to create new Shipping Informations data", error);
      toast.error(`Error: ${error}`);
      throw error;
    }
  };

  const mutation = useMutation({
    mutationFn: createLocationOriginMutation,
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({
        queryKey: ["locationOriginQueryKey"],
      });
      // Toast a success message
      toast.success("Location Origin data created successfully.", {
        autoClose: 2000,
      });
    },
  });

  return mutation;
}

export default useCreateLocationOriginMutation;
