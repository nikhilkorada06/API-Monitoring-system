import { useMemo, useState } from 'react';
import { Sidebar } from './Sidebar';
import { Bell, Menu, Search, Settings2, X, RefreshCw } from 'lucide-react';
import { useQueryClient, useIsFetching } from '@tanstack/react-query';
import { useDashboardQuery } from '../../hooks/useDashboardQuery';
import { QUERY_KEYS } from '../../constants';
import styles from '../../styles/modules/layout/DashboardLayout.module.scss';

export function DashboardLayout({ children, onLogout }) {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const queryClient = useQueryClient();
    const isFetching = useIsFetching({ queryKey: QUERY_KEYS.DASHBOARD }) > 0;
    const { dataUpdatedAt } = useDashboardQuery({ notifyOnChangeProps: ['dataUpdatedAt'] });

    const lastUpdated = useMemo(() => {
        if (!dataUpdatedAt) return '--';
        return new Date(dataUpdatedAt).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
        });
    }, [dataUpdatedAt]);

    const handleRefresh = () => {
        queryClient.invalidateQueries({ 
            queryKey: QUERY_KEYS.DASHBOARD 
        });
    };

    return (
        <div className={styles.container}>
            <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
            <div className={styles.mainContent}>
                <header className={styles.header}>
                    <div className={styles.headerContent}>
                        <button
                            className={styles.mobileMenuButton}
                            onClick={() => setSidebarOpen(!sidebarOpen)}
                            aria-label={sidebarOpen ? 'Close menu' : 'Open menu'}
                        >
                            {sidebarOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
                        </button>
                        <div className={styles.brandBlock}>
                            <div className={styles.brandMark} aria-hidden="true"> 
                                <span />
                            </div>
                            <div>
                                <h1>Hello 🙋🏻‍♂️!!!</h1>
                                <p>Explore information and activity about your property</p>
                            </div>
                        </div>
                        <div className={styles.searchShell}>
                            <Search aria-hidden="true" />
                            <input aria-label="Search" placeholder="Search..." type="search" />
                        </div>
                        <div className={styles.actionButtons}>
                            <button className={styles.iconButton} type="button" aria-label="Notifications">
                                <Bell aria-hidden="true" />
                                <span className={styles.notificationDot} />
                            </button>
                            <button className={styles.iconButton} type="button" aria-label="Quick settings">
                                <Settings2 aria-hidden="true" />
                            </button>
                            <button
                                className={styles.refreshButton}
                                onClick={handleRefresh}
                                disabled={isFetching}
                                aria-label="Refresh data"
                            >
                                <RefreshCw
                                    className={isFetching ? styles.spinning : ''}
                                    aria-hidden="true"
                                />
                            </button>
                            <button className={styles.profileButton} onClick={onLogout} aria-label="Log out" type="button">
                                <span aria-hidden="true">👋🏻</span>
                            </button>
                        </div>
                    </div>
                </header>
                <main className={styles.pageContent}>
                    <div className={styles.contentShell}>
                        <div className={styles.contentInner}>
                            <div className={styles.statusRow}>
                                <span>Last updated {lastUpdated}</span>
                                <span>{isFetching ? 'Syncing live data' : 'Live dashboard'}</span>
                            </div>
                    {children}
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
