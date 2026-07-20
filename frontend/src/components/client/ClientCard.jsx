import {
    Building2,
    CircleCheck,
    CircleX
} from "lucide-react";

import { Card, CardContent, Badge } from "../ui";
import styles from "../../styles/modules/client/ClientCard.module.scss";

const MONTHS = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December"
];

const formatDate = (date) => {
    return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
};

export function ClientCard({ client }) {

    const website = client.website.startsWith("http")
        ? client.website
        : `https://${client.website}`;

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

                <div className={styles.info}>

                    <div className={styles.row}>
                        <span>Client ID</span>
                        <span>{client._id}</span>
                    </div>

                    <div className={styles.row}>
                        <span>Email</span>
                        <span>{client.email}</span>
                    </div>

                    <div className={styles.row}>
                        <span>Website</span>

                        <a
                            href={website}
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            🌐 {client.website}
                        </a>
                    </div>

                    <div className={styles.row}>
                        <span>Slug</span>
                        <span>{client.slug}</span>
                    </div>

                    <div className={styles.row}>
                        <span>Created</span>

                        <span>
                            {formatDate(new Date(client.createdAt))}
                        </span>
                    </div>

                    <div className={styles.row}>
                        <span>Updated</span>

                        <span>
                            {formatDate(new Date(client.updatedAt))}
                        </span>
                    </div>

                </div>

                <div className={styles.description}>

                    <h4>📝 Description</h4>

                    <p>
                        {client.description || "No description provided."}
                    </p>

                </div>

            </CardContent>
        </Card>
    );
}