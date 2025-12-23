import { FormEvent, useEffect, useState } from 'react';
import { Card } from '../../components/common/Card';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { useTheme } from '../../theme/ThemeProvider';
import { updateBrandingSettings, type ThemeMode } from '../../lib/companyBrandingApi';
import { themePresets, THEME_PRESET_NAMES, type ThemePresetName } from '../../theme/presets';
import './BrandingPage.css';

export const BrandingPage = () => {
  const { branding, setBranding } = useTheme();
  const [primaryColor, setPrimaryColor] = useState(branding.primaryColor);
  const [logoUrl, setLogoUrl] = useState(branding.logoUrl ?? '');
  const [mode, setMode] = useState<ThemeMode>(branding.mode);
  const [themePreset, setThemePreset] = useState<ThemePresetName>(branding.themePreset);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPrimaryColor(branding.primaryColor);
    setLogoUrl(branding.logoUrl ?? '');
    setMode(branding.mode);
    setThemePreset(branding.themePreset);
  }, [branding.primaryColor, branding.logoUrl, branding.mode, branding.themePreset]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setFeedback(null);
    setError(null);

    try {
      const payload = {
        primaryColor,
        logoUrl: logoUrl.trim() ? logoUrl.trim() : null,
        mode,
        themePreset
      };
      const updated = await updateBrandingSettings(payload);
      setBranding(updated);
      setFeedback('Branding updated successfully.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update branding');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setPrimaryColor('#0f766e');
    setLogoUrl('');
    setMode('light');
    setThemePreset(THEME_PRESET_NAMES[0]);
  };

  const presetMeta = themePresets[themePreset];
  const previewTokens = presetMeta.tokens[mode];

  return (
    <div className="branding-page">
      <Card>
        <form className="branding-form" onSubmit={handleSubmit}>
          <div>
            <h2 style={{ margin: 0 }}>Branding</h2>
            <p style={{ margin: '0.25rem 0 0', color: 'var(--color-muted)' }}>
              Customize the primary color and navigation logo shown across SiteTrackr.
            </p>
          </div>

          <div className="branding-grid">
            <div className="branding-control">
              <label className="branding-label">Theme mode</label>
              <div className="branding-segmented">
                {(['light', 'dark'] as ThemeMode[]).map((option) => (
                  <button
                    key={option}
                    type="button"
                    className={option === mode ? 'active' : ''}
                    onClick={() => setMode(option)}
                  >
                    {option === 'light' ? 'Light' : 'Dark'}
                  </button>
                ))}
              </div>
            </div>

            <div className="branding-control">
              <label className="branding-label" htmlFor="theme-preset">Theme preset</label>
              <select
                id="theme-preset"
                className="branding-select"
                value={themePreset}
                onChange={(event) => setThemePreset(event.target.value as ThemePresetName)}
              >
                {THEME_PRESET_NAMES.map((name) => (
                  <option key={name} value={name}>
                    {themePresets[name].label}
                  </option>
                ))}
              </select>
              <p className="branding-hint">{presetMeta.description}</p>
            </div>
          </div>

          <Input
            label="Primary color"
            type="color"
            value={primaryColor}
            onChange={(event) => setPrimaryColor(event.target.value)}
            className="branding-color-input"
          />

          <Input
            label="Logo URL"
            type="url"
            placeholder="https://..."
            value={logoUrl}
            onChange={(event) => setLogoUrl(event.target.value)}
          />

          {(feedback || error) && (
            <div className={`branding-alert${error ? ' error' : ''}`}>
              {error ?? feedback}
            </div>
          )}

          <div className="branding-actions">
            <Button type="submit" disabled={saving} fullWidth={false}>
              {saving ? 'Saving…' : 'Save changes'}
            </Button>
            <Button
              type="button"
              onClick={handleReset}
              fullWidth={false}
              variant="ghost"
            >
              Reset to default
            </Button>
          </div>
        </form>
      </Card>

      <Card className="branding-preview-card">
        <div className="branding-preview">
          <h3 style={{ margin: 0 }}>Live preview</h3>
          <div
            className="branding-preview-header"
            style={{ background: primaryColor }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {logoUrl ? (
                <img src={logoUrl} alt="Preview logo" className="branding-preview-logo" />
              ) : (
                <span className="branding-preview-title" style={{ color: '#fff' }}>
                  SiteTrackr
                </span>
              )}
            </div>
            <span style={{ fontWeight: 600 }}>Button</span>
          </div>
          <div
            className="branding-preview-surface"
            style={{ background: previewTokens.surface, color: previewTokens.text }}
          >
            <div className="branding-preview-body" style={{ color: previewTokens.muted }}>
              <span>Background preview</span>
              <span style={{ fontWeight: 600, color: previewTokens.text }}>Cards use this tone</span>
            </div>
          </div>
          <p style={{ margin: 0, color: 'var(--color-muted)' }}>
            Preset + mode update surfaces, borders, and typography tokens.
          </p>
        </div>
      </Card>
    </div>
  );
};

export default BrandingPage;
