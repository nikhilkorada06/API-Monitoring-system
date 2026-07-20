import { useMutation, useQueryClient } from "@tanstack/react-query";
import { clientApi } from "../api/api";
import { CLIENTS_QUERY_KEY } from "./useClientsQuery";

export function useCreateClientMutation(options = {}) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: clientApi.createClient,

        onSuccess: (...args) => {
            queryClient.invalidateQueries({
                queryKey: CLIENTS_QUERY_KEY,
            });

            options.onSuccess?.(...args);
        },

        onError: (...args) => {
            options.onError?.(...args);
        },
    });
}