import { Plus } from "lucide-react";
import { Button, PageStatus } from "../components/ui";
import { useClientsQuery } from "../hooks/useClientsQuery";
import styles from "../styles/modules/client/ClientManagement.module.scss";
import { ClientGrid } from "../components/client/ClientGrid";
import { useState } from "react";
import { CreateClientModal } from "../components/client/CreateClientModal";

export function ClientManagementPage() {

    console.log("🔥 ClientManagementPage rendered");

    const [isModalOpen, setIsModalOpen] = useState(false);
    
    const {
        data,
        isLoading,
        error,
        refetch
    } = useClientsQuery();

    const clients = data?.data ?? [];

    if (isLoading || error) {
        return (
            <PageStatus
                isLoading={isLoading}
                error={error}
                onRetry={refetch}
                loadingText="Loading clients..."
                errorText="Unable to fetch clients"
            />
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div>
                    <h1>Client Management</h1>
                    <p>
                        Manage all onboarded clients.
                    </p>
                </div>

                <Button onClick={() => setIsModalOpen(true)}>
                    <Plus size={18} />
                    Create Client
                </Button>
            </div>

            <div className={styles.stats}>
                <span>Total Clients</span>
                <h2>{clients.length}</h2>
            </div>

            <div className={styles.content}>
                <ClientGrid clients={clients} />
            </div>

            <CreateClientModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
            />
        </div>
    );
}