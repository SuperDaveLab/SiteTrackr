import { useParams } from 'react-router-dom';
import { Card } from '../../../components/common/Card';

export const AssetDetailPage = () => {
  const { assetId } = useParams();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <h2 style={{ margin: 0 }}>Asset Detail</h2>
      <Card>
        <strong>Asset #{assetId}</strong>
        <p style={{ color: '#475467' }}>Telemetry, maintenance history, and health metrics coming soon.</p>
      </Card>
    </div>
  );
};
