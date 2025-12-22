import { useParams } from 'react-router-dom';
import { Card } from '../../../components/common/Card';

export const VisitDetailPage = () => {
  const { visitId } = useParams();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <h2 style={{ margin: 0 }}>Visit Detail</h2>
      <Card>
        <strong>Visit #{visitId}</strong>
        <p style={{ color: '#475467' }}>Offline logging and timeline UI coming soon.</p>
      </Card>
    </div>
  );
};
