import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { toast } from "react-toastify";

function useCreateContainerTypeMutation() {
  const queryClient = useQueryClient();

  const createContainerTypeMutation = async ({ formData }) => {
    try {
      const response = await axios.post(
        "/api/container-profile/container-type",
        formData,
      );

      return response;
    } catch (error) {
      console.error("Failed to create new Container Type data", error);
      toast.error(`Error: ${error}`);
      throw error;
    }
  };

  const mutation = useMutation({
    mutationFn: createContainerTypeMutation,
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({
        queryKey: ["containerTypeQueryKey"],
      });
      // Toast a success message
      toast.success("Container Type data created successfully.", {
        autoClose: 2000,
      });
    },
  });

  return mutation;
}

export default useCreateContainerTypeMutation;
