import { useQuery } from "@tanstack/react-query";
import { clientApi } from "../api/api";

export const CLIENTS_QUERY_KEY = ["clients"];

export function useClientsQuery(skip = 0, options = {}) {
    return useQuery({
        queryKey: [...CLIENTS_QUERY_KEY, skip],
        queryFn: () => clientApi.getClients(skip),
        ...options,
    });
}