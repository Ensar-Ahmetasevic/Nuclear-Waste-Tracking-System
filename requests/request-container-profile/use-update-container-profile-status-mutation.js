import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { toast } from "react-toastify";

export default function useUpdateContainerProfileStatusMutation() {
  const queryClient = useQueryClient();

  const updateContainerProfileStautsMutations = async (
    containerStatusUpdateData,
  ) => {
    try {
      const response = await axios.patch("/api/container-profile", {
        containerStatusUpdateData,
      });
      return response.data;
    } catch (error) {
      console.error("Failed to UPDATE shipping informations status: ", error);
      toast.error(`Error: ${error.response.data.message}`);
      throw error; // Throw the error to trigger onError callback
    }
  };

  const mutation = useMutation({
    mutationFn: updateContainerProfileStautsMutations,
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({
        queryKey: ["containerProfileQueryKey"],
      });
      queryClient.invalidateQueries({
        queryKey: ["shippingInformationIDQueryKey"],
      });
      queryClient.invalidateQueries({
        queryKey: ["statusShippingInformations"],
      });
      queryClient.invalidateQueries({
        queryKey: ["shippingInformationQueryKey"],
      });
      // Toast a success message
      /*  toast.success("Container Profile Status has been UPDATED successfully.", {
        autoClose: 2000,
      }); */
    },
  });

  return mutation;
}
