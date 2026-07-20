import { ClientCard } from "./ClientCard";
import styles from "../../styles/modules/client/ClientCard.module.scss";

export function ClientGrid({ clients }) {

    if (!clients.length) {
        return (
            <div className={styles.empty}>
                No clients found.
            </div>
        );
    }

    return (
        <div className={styles.grid}>
            {clients.map(client => (
                <ClientCard
                    key={client._id}
                    client={client}
                />
            ))}
        </div>
    );
}