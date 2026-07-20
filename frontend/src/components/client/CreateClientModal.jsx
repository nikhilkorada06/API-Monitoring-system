import { X } from "lucide-react";
import { useState } from "react";
import { Button } from "../ui";
import styles from "../../styles/modules/client/CreateClientModal.module.scss";
import { useCreateClientMutation } from "../../hooks/useCreateClientMutation";

export function CreateClientModal({ isOpen, onClose }) {

    const [formData, setFormData] = useState({
        name: "",
        email: "",
        website: "",
        description: ""
    });

    const createClientMutation = useCreateClientMutation({
        onSuccess: () => {
            alert("Client created successfully!");

            setFormData({
                name: "",
                email: "",
                website: "",
                description: "",
            });

            onClose();
        },

        onError: (error) => {
            alert(
                error?.response?.data?.message || "Failed to create client"
            );
        },
    });

    const handleChange = (e) => {
        const { name, value } = e.target;

        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        if (!formData.name.trim()) {
            alert("Client name is required");
            return;
        }

        if (!formData.email.trim()) {
            alert("Client email is required");
            return;
        }

        if (!formData.website.trim()) {
            alert("Client website is required");
            return;
        }

        createClientMutation.mutate(formData);
    };

    if (!isOpen) return null;

    return (
        <div className={styles.overlay}>
            <div className={styles.modal}>
                <div className={styles.header}>
                    <h2>Create New Client</h2>

                    <button
                        className={styles.closeButton}
                        onClick={onClose}
                    >
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className={styles.body}>
                        <div className={styles.formGroup}>
                            <label>Client Name</label>
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                placeholder="Enter client name"
                            />
                        </div>

                        <div className={styles.formGroup}>
                            <label>Email</label>
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                placeholder="client@example.com"
                            />
                        </div>

                        <div className={styles.formGroup}>
                            <label>Website</label>
                            <input
                                type="text"
                                name="website"
                                value={formData.website}
                                onChange={handleChange}
                                placeholder="https://example.com"
                            />
                        </div>

                        <div className={styles.formGroup}>
                            <label>Description</label>
                            <textarea
                                name="description"
                                value={formData.description}
                                onChange={handleChange}
                                rows={4}
                                placeholder="Optional description"
                            />
                        </div>
                    </div>

                    <div className={styles.footer}>
                        <Button
                            type="button"
                            className={styles.cancelButton}
                            onClick={onClose}
                        >
                            Cancel
                        </Button>

                        <Button
                            type="submit"
                            className={styles.createButton}
                            disabled={createClientMutation.isPending}
                        >
                            {createClientMutation.isPending ? "Creating..." : "Create Client"}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}