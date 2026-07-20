import { Building2, CalendarDays, CircleCheck, CircleX } from "lucide-react";
import { Card, CardContent, Badge } from "../ui";
import styles from "../../styles/modules/client/ClientCard.module.scss";

export function ClientCard({ client }) {
    return (
        <Card className={styles.card}>
            <CardContent className={styles.content}>

                <div className={styles.header}>

                    <div className={styles.titleSection}>
                        <Building2 size={22} />

                        <div>
                            <h3>{client.name}</h3>
                            <p>{client.slug}</p>
                        </div>
                    </div>

                    <Badge
                        variant={client.isActive ? "success" : "destructive"}
                    >
                        {client.isActive ? (
                            <>
                                <CircleCheck size={14} />
                                Active
                            </>
                        ) : (
                            <>
                                <CircleX size={14} />
                                Inactive
                            </>
                        )}
                    </Badge>

                </div>

                <div className={styles.footer}>

                    <div className={styles.date}>
                        <CalendarDays size={15} />
                        {new Date(client.createdAt).toLocaleDateString()}
                    </div>

                </div>

            </CardContent>
        </Card>
    );
}