import { Link } from 'react-router-dom';
import { Card } from '../../../components/common/Card';

const mockAssets = [
  { id: 'asset-1', tag: 'GEN-22', type: 'Generator', status: 'Active' },
  { id: 'asset-2', tag: 'PWR-08', type: 'Battery Bank', status: 'Needs Service' }
];

export const AssetsListPage = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
    <h2 style={{ margin: 0 }}>Assets</h2>
    {mockAssets.map((asset) => (
      <Link key={asset.id} to={`/assets/${asset.id}`} style={{ textDecoration: 'none' }}>
        <Card>
          <strong>{asset.tag}</strong>
          <p style={{ margin: 0 }}>{asset.type}</p>
          <span style={{ color: '#12b76a' }}>{asset.status}</span>
        </Card>
      </Link>
    ))}
  </div>
);
