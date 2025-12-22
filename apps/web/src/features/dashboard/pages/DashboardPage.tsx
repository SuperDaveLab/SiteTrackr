import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card } from '../../../components/common/Card';
import { Button } from '../../../components/common/Button';
import { listTickets, TicketStatus } from '../../tickets/api/ticketsApi';

const statusColors: Record<TicketStatus, string> = {
  OPEN: '#3b82f6',
  IN_PROGRESS: '#f59e0b',
  COMPLETED: '#10b981',
  CANCELLED: '#6b7280'
};

const priorityColors: Record<string, string> = {
  LOW: '#6b7280',
  NORMAL: '#3b82f6',
  HIGH: '#f59e0b',
  URGENT: '#dc2626'
};

export const DashboardPage = () => {
  const { data: openTicketsData } = useQuery({
    queryKey: ['tickets', 1, 5, 'OPEN'],
    queryFn: () => listTickets({ page: 1, pageSize: 5, status: 'OPEN' })
  });

  const { data: inProgressData } = useQuery({
    queryKey: ['tickets', 1, 5, 'IN_PROGRESS'],
    queryFn: () => listTickets({ page: 1, pageSize: 5, status: 'IN_PROGRESS' })
  });

  const openTickets = openTicketsData?.data || [];
  const inProgressTickets = inProgressData?.data || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <h2 style={{ margin: 0 }}>Dashboard</h2>
        <p style={{ marginTop: '0.25rem', color: '#475467' }}>Morning glance for crews on the go.</p>
      </div>

      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <h3 style={{ margin: 0 }}>Open Tickets</h3>
          <Link to="/tickets?status=OPEN" style={{ textDecoration: 'none' }}>
            <Button style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}>View All</Button>
          </Link>
        </div>
        {openTickets.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {openTickets.map((ticket) => (
              <Link key={ticket.id} to={`/tickets/${ticket.id}`} style={{ textDecoration: 'none' }}>
                <Card>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.35rem' }}>
                    <strong>{ticket.summary}</strong>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <span
                        style={{
                          padding: '0.2rem 0.6rem',
                          borderRadius: '9999px',
                          fontSize: '0.7rem',
                          fontWeight: 600,
                          color: 'white',
                          background: statusColors[ticket.status]
                        }}
                      >
                        {ticket.status}
                      </span>
                      <span
                        style={{
                          padding: '0.2rem 0.6rem',
                          borderRadius: '9999px',
                          fontSize: '0.7rem',
                          fontWeight: 600,
                          color: 'white',
                          background: priorityColors[ticket.priority]
                        }}
                      >
                        {ticket.priority}
                      </span>
                    </div>
                  </div>
                  <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                    {ticket.site.name}
                    {ticket.site.code && ` (${ticket.site.code})`}
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <Card>
            <p style={{ margin: 0, color: '#6b7280' }}>No open tickets</p>
          </Card>
        )}
      </div>

      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <h3 style={{ margin: 0 }}>In Progress</h3>
          <Link to="/tickets?status=IN_PROGRESS" style={{ textDecoration: 'none' }}>
            <Button style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}>View All</Button>
          </Link>
        </div>
        {inProgressTickets.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {inProgressTickets.map((ticket) => (
              <Link key={ticket.id} to={`/tickets/${ticket.id}`} style={{ textDecoration: 'none' }}>
                <Card>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.35rem' }}>
                    <strong>{ticket.summary}</strong>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <span
                        style={{
                          padding: '0.2rem 0.6rem',
                          borderRadius: '9999px',
                          fontSize: '0.7rem',
                          fontWeight: 600,
                          color: 'white',
                          background: statusColors[ticket.status]
                        }}
                      >
                        {ticket.status.replace('_', ' ')}
                      </span>
                      <span
                        style={{
                          padding: '0.2rem 0.6rem',
                          borderRadius: '9999px',
                          fontSize: '0.7rem',
                          fontWeight: 600,
                          color: 'white',
                          background: priorityColors[ticket.priority]
                        }}
                      >
                        {ticket.priority}
                      </span>
                    </div>
                  </div>
                  <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                    {ticket.site.name}
                    {ticket.site.code && ` (${ticket.site.code})`}
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <Card>
            <p style={{ margin: 0, color: '#6b7280' }}>No tickets in progress</p>
          </Card>
        )}
      </div>
    </div>
  );
};
