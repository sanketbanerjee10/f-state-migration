import { useRef, useState } from 'react';
import {
  CheckCircle2,
  Edit2,
  FileImage,
  LoaderCircle,
  Plus,
  ShieldCheck,
  Trash2,
  Upload,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { Field, FormSection } from '../../components/Field';
import { Modal } from '../../components/Dialogs';
import { StepLayout } from '../../components/form/StepLayout';
import { recognizeScreenshot } from '../../lib/ocr';
import { parseMagnitude } from '../../lib/parsers';
import { calculateMigrationScoreFromRaw, TIER_COLORS, useLiveTierThresholds } from '../../lib/migrationScore';
import { MigrationScoreBadge, VerifiedBadge, MigrationScoringGuide } from '../../components/MigrationScoringGuide';
import type { GroupMember } from '../../types/application';
import { useApplicationDraft } from '../../hooks/useApplicationDraft';
import { useWizardNavigation } from '../../hooks/useWizardNavigation';

export function GroupRosterStep() {
  const {
    draft,
    addGroupMember,
    updateGroupMember,
    removeGroupMember,
  } = useApplicationDraft();

  const { nextStep, prevStep } = useWizardNavigation();
  const { thresholds } = useLiveTierThresholds();

  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number; filename: string } | null>(
    null
  );
  const [uploadError, setUploadError] = useState('');
  const [dragging, setDragging] = useState(false);

  // Edit member modal
  const [editingMember, setEditingMember] = useState<GroupMember | null>(null);
  const [editName, setEditName] = useState('');
  const [editKills, setEditKills] = useState('');
  const [editAlliance, setEditAlliance] = useState('');
  const [editError, setEditError] = useState('');

  // Manual add member modal
  const [manualModalOpen, setManualModalOpen] = useState(false);
  const [manualName, setManualName] = useState('');
  const [manualHighestPower, setManualHighestPower] = useState('');
  const [manualStructurePower, setManualStructurePower] = useState('');
  const [manualTechPower, setManualTechPower] = useState('');
  const [manualTroopPower, setManualTroopPower] = useState('');
  const [manualHeroPower, setManualHeroPower] = useState('');
  const [manualModVehiclePower, setManualModVehiclePower] = useState('');
  const [manualKills, setManualKills] = useState('0');
  const [manualAlliance, setManualAlliance] = useState('');
  const [manualError, setManualError] = useState('');

  const multiFileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (files: FileList | File[]) => {
    const validFiles: File[] = [];
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      if (['image/png', 'image/jpeg'].includes(f.type) || /\.(png|jpe?g)$/i.test(f.name)) {
        if (f.size <= 10 * 1024 * 1024) {
          validFiles.push(f);
        }
      }
    }

    if (validFiles.length === 0) {
      setUploadError('Please select valid PNG or JPG screenshots under 10 MB.');
      return;
    }

    setUploadError('');
    setUploading(true);

    const unrecognizedFiles: string[] = [];

    for (let idx = 0; idx < validFiles.length; idx++) {
      const file = validFiles[idx];
      setUploadProgress({ current: idx + 1, total: validFiles.length, filename: file.name });

      try {
        const result = await recognizeScreenshot(file);
        const extracted = result.extracted;

        const requiredFields = [
          extracted.playerName,
          extracted.highestPowerOnRecord,
          extracted.structurePower,
          extracted.techPower,
          extracted.troopPower,
          extracted.heroPower,
          extracted.modVehiclePower,
        ];
        const capturedCount = requiredFields.filter((val) => Boolean(val && val.trim())).length;
        const totalRequired = requiredFields.length;
        const missingCount = totalRequired - capturedCount;

        // Reject if more than 2 or 3 fields cannot be tracked
        if (missingCount >= 3 || capturedCount < 5) {
          unrecognizedFiles.push(file.name);
          continue;
        }

        const newMember: GroupMember = {
          id: crypto.randomUUID(),
          playerName: extracted.playerName || `Member ${draft.groupMembers.length + idx + 1}`,
          highestPowerOnRecord: extracted.highestPowerOnRecord || '0',
          structurePower: extracted.structurePower || '0',
          techPower: extracted.techPower || '0',
          troopPower: extracted.troopPower || '0',
          heroPower: extracted.heroPower || '0',
          modVehiclePower: extracted.modVehiclePower || '0',
          kills: extracted.kills || '0', // kills default to 0 if not extracted
          currentAlliance: draft.currentAlliance || '', // alliance recorded same as Stage 1/2
          screenshotFileName: file.name,
          isScreenshotVerified: true,
        };

        addGroupMember(newMember);
      } catch (err) {
        console.error('Failed to parse member screenshot:', err);
        unrecognizedFiles.push(file.name);
      }
    }

    if (unrecognizedFiles.length > 0) {
      setUploadError(
        `Invalid image for: ${unrecognizedFiles.join(', ')}. None of the player stats could be captured. Please use the manual entry method or upload clearer Player Details screenshots.`
      );
    }

    setUploading(false);
    setUploadProgress(null);
    if (multiFileInputRef.current) multiFileInputRef.current.value = '';
  };

  const openEditModal = (member: GroupMember) => {
    setEditingMember(member);
    setEditName(member.playerName);
    setEditKills(member.kills);
    setEditAlliance(member.currentAlliance);
    setEditError('');
  };

  const saveEditModal = () => {
    if (!editingMember) return;
    if (!editName.trim()) {
      setEditError('Player name cannot be empty.');
      return;
    }

    updateGroupMember(editingMember.id, {
      playerName: editName.trim(),
      kills: editKills.trim() || '0',
      currentAlliance: editAlliance.trim(),
    });

    setEditingMember(null);
  };

  const openManualModal = () => {
    setManualName('');
    setManualHighestPower('');
    setManualStructurePower('');
    setManualTechPower('');
    setManualTroopPower('');
    setManualHeroPower('');
    setManualModVehiclePower('');
    setManualKills('0');
    setManualAlliance(draft.currentAlliance || '');
    setManualError('');
    setManualModalOpen(true);
  };

  const saveManualMember = () => {
    if (!manualName.trim()) {
      setManualError('Player name is required.');
      return;
    }
    if (!manualHighestPower.trim()) {
      setManualError('Highest Power on Record is required.');
      return;
    }

    const newMember: GroupMember = {
      id: crypto.randomUUID(),
      playerName: manualName.trim(),
      highestPowerOnRecord: manualHighestPower.trim(),
      structurePower: manualStructurePower.trim() || '0',
      techPower: manualTechPower.trim() || '0',
      troopPower: manualTroopPower.trim() || '0',
      heroPower: manualHeroPower.trim() || '0',
      modVehiclePower: manualModVehiclePower.trim() || '0',
      kills: manualKills.trim() || '0',
      currentAlliance: manualAlliance.trim() || draft.currentAlliance || '',
      isScreenshotVerified: false, // manually added member does not get the verified badge
    };

    addGroupMember(newMember);
    setManualModalOpen(false);
  };

  return (
    <StepLayout
      navigationProps={{
        onContinue: nextStep,
        onBack: prevStep,
        continueLabel: 'Continue to Review',
        backLabel: 'Back to Preferences',
        disabled: uploading,
      }}
    >
      <FormSection number="04" title="Group member roster (bulk import or manual)">
        <div className="group-upload-info-card">
          <div className="group-upload-header">
            <Users size={20} className="group-icon" />
            <div>
              <h3 className="group-upload-title">Group Player Roster</h3>
              <p className="hint">
                Upload profile/details screenshots of all the players migrating in your group to extract and verify their stats,
                or add members manually. Kills default to 0 and alliance matches Stage 1/2.
              </p>
            </div>
          </div>
        </div>

        {/* Hidden multi-file input */}
        <input
          ref={multiFileInputRef}
          hidden
          type="file"
          multiple
          accept="image/png,image/jpeg,.jpg,.jpeg,.png"
          aria-label="Bulk upload player screenshots"
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              handleFiles(e.target.files);
            }
          }}
          data-testid="group-roster-file-input"
        />

        {/* Upload Dropzone */}
        {!uploading && (
          <div
            className={`upload-zone compact-upload-zone ${dragging ? 'is-dragging' : ''}`}
            onClick={() => multiFileInputRef.current?.click()}
            role="button"
            tabIndex={0}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              const files = e.dataTransfer.files;
              if (files && files.length > 0) {
                handleFiles(files);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                multiFileInputRef.current?.click();
              }
            }}
            data-testid="group-roster-dropzone"
          >
            <div className="upload-icon">
              <Upload size={20} />
            </div>
            <div className="upload-copy">
              <strong>Select or drop member profile screenshots</strong>
              <span>Select multiple PNG or JPG files at once (up to 10 MB each) — or add members manually below</span>
            </div>
            <button
              type="button"
              className="button button-quiet"
              onClick={(e) => {
                e.stopPropagation();
                multiFileInputRef.current?.click();
              }}
              data-testid="choose-group-roster-files"
            >
              <FileImage size={14} /> Browse images
            </button>
          </div>
        )}

        {/* Uploading progress indicator */}
        {uploading && uploadProgress && (
          <div className="ocr-processing-card" style={{ marginTop: 14 }}>
            <div className="ocr-processing-header">
              <div className="ocr-waiting-message">
                <LoaderCircle size={16} className="spin" />
                <span>
                  Processing screenshot {uploadProgress.current} of {uploadProgress.total}:{' '}
                  <strong>{uploadProgress.filename}</strong>
                </span>
              </div>
            </div>
          </div>
        )}

        {uploadError && (
          <div className="ocr-feedback-banner ocr-feedback-error" role="alert" style={{ marginTop: 12 }}>
            <div className="feedback-content">
              <strong>Invalid Image / Recognition Error</strong>
              <p>{uploadError}</p>
            </div>
          </div>
        )}

        {/* Member Roster List */}
        <div style={{ marginTop: 22 }}>
          <div className="panel-heading" style={{ marginBottom: 12 }}>
            <div>
              <span className="panel-kicker">ROSTER ({draft.groupMembers.length} MEMBERS)</span>
              <h4 style={{ margin: '3px 0 0', fontSize: 15, color: '#f1f5f9' }}>Group Members</h4>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                className="button button-quiet button-sm"
                onClick={openManualModal}
                disabled={uploading}
                data-testid="add-manual-member-btn"
              >
                <UserPlus size={14} /> Add member manually
              </button>
              <button
                type="button"
                className="button button-quiet button-sm"
                onClick={() => multiFileInputRef.current?.click()}
                disabled={uploading}
                data-testid="add-more-members-btn"
              >
                <Plus size={14} /> Upload screenshots
              </button>
            </div>
          </div>

          {draft.groupMembers.length === 0 ? (
            <div className="empty-state compact-empty" style={{ margin: '12px 0 20px' }}>
              <Users size={24} />
              <strong>No group members added yet</strong>
              <span>Upload profile screenshots above or add members manually to populate your group roster.</span>
            </div>
          ) : (
            <div className="group-members-grid" data-testid="group-members-list">
              {draft.groupMembers.map((member, idx) => {
                const mStruct = parseMagnitude(member.structurePower) || 0;
                const mTech = parseMagnitude(member.techPower) || 0;
                const mHero = parseMagnitude(member.heroPower) || 0;
                const mVeh = parseMagnitude(member.modVehiclePower) || 0;
                const mScore = calculateMigrationScoreFromRaw(mStruct, mTech, mHero, mVeh, thresholds);

                return (
                <div key={member.id} className="group-member-card" data-testid={`group-member-item-${idx}`}>
                  <div className="group-member-top">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <strong className="group-member-name">{member.playerName}</strong>
                      {member.isScreenshotVerified ? (
                        <VerifiedBadge />
                      ) : (
                        <span
                          style={{
                            fontSize: 10,
                            color: '#94a3b8',
                            background: 'rgba(255, 255, 255, 0.06)',
                            padding: '2px 6px',
                            borderRadius: 4,
                          }}
                        >
                          Manual
                        </span>
                      )}
                      {mScore && (
                        <MigrationScoreBadge scoreResult={mScore} playerName={member.playerName} size="sm" />
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      <button
                        type="button"
                        className="button button-quiet button-sm"
                        onClick={() => openEditModal(member)}
                        title="Edit name and kills"
                        data-testid={`edit-member-${idx}`}
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        type="button"
                        className="button button-quiet button-sm button-danger-text"
                        onClick={() => removeGroupMember(member.id)}
                        title="Remove member"
                        data-testid={`remove-member-${idx}`}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  <div className="group-member-stats">
                    <div>
                      <span>Highest Power:</span>
                      <strong>{member.highestPowerOnRecord}</strong>
                    </div>
                    <div>
                      <span>Kills:</span>
                      <strong>{member.kills}</strong>
                    </div>
                    <div>
                      <span>Alliance:</span>
                      <strong>{member.currentAlliance || draft.currentAlliance || '—'}</strong>
                    </div>
                  </div>

                  <div className="group-member-breakdown">
                    <span>
                      Struct: <strong>{member.structurePower}</strong>
                    </span>
                    <span>
                      Tech: <strong>{member.techPower}</strong>
                    </span>
                    <span>
                      Troop: <strong>{member.troopPower}</strong>
                    </span>
                    <span>
                      Hero: <strong>{member.heroPower}</strong>
                    </span>
                    <span>
                      Vehicle: <strong>{member.modVehiclePower}</strong>
                    </span>
                  </div>
                </div>
              );
            })}
            </div>
          )}
        </div>

        {/* Informative Migration Scoring Guide */}
        <MigrationScoringGuide
          thresholds={thresholds}
        />
      </FormSection>

      {/* Edit Member Modal */}
      {editingMember && (
        <Modal
          title={`Edit Member: ${editingMember.playerName}`}
          onClose={() => setEditingMember(null)}
          actions={
            <>
              <button
                type="button"
                className="button button-quiet"
                onClick={() => setEditingMember(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="button button-primary"
                onClick={saveEditModal}
                data-testid="save-member-edit"
              >
                Save changes
              </button>
            </>
          }
        >
          <p className="hint" style={{ marginBottom: 14 }}>
            You can update the in-game name and kill count for this member.
            {editingMember.isScreenshotVerified && ' Power stats are verified from screenshot and locked.'}
          </p>

          <Field id="edit-player-name" label="Player name" required error={editError}>
            <input
              className="control"
              id="edit-player-name"
              value={editName}
              maxLength={40}
              onChange={(e) => {
                setEditName(e.target.value);
                setEditError('');
              }}
              data-testid="edit-member-name-input"
            />
          </Field>

          <Field id="edit-player-kills" label="Kills" hint="Kill count (defaults to 0 or OCR value)">
            <input
              className="control"
              id="edit-player-kills"
              value={editKills}
              placeholder="e.g. 5,453,196 or 0"
              onChange={(e) => setEditKills(e.target.value)}
              data-testid="edit-member-kills-input"
            />
          </Field>

          <Field id="edit-player-alliance" label="Current alliance">
            <input
              className="control"
              id="edit-player-alliance"
              value={editAlliance}
              maxLength={24}
              onChange={(e) => setEditAlliance(e.target.value)}
              data-testid="edit-member-alliance-input"
            />
          </Field>

          <div style={{ marginTop: 14, padding: 12, background: 'rgba(255,255,255,0.03)', borderRadius: 6 }}>
            <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 6, fontWeight: 600 }}>
              POWER STATS {editingMember.isScreenshotVerified ? '(LOCKED FROM SCREENSHOT)' : '(MANUAL)'}:
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6, fontSize: 12 }}>
              <div>Highest Power: <strong>{editingMember.highestPowerOnRecord}</strong></div>
              <div>Structure Power: <strong>{editingMember.structurePower}</strong></div>
              <div>Tech Power: <strong>{editingMember.techPower}</strong></div>
              <div>Troop Power: <strong>{editingMember.troopPower}</strong></div>
              <div>Hero Power: <strong>{editingMember.heroPower}</strong></div>
              <div>Vehicle Power: <strong>{editingMember.modVehiclePower}</strong></div>
            </div>
          </div>
        </Modal>
      )}

      {/* Add Manual Member Modal */}
      {manualModalOpen && (
        <Modal
          title="Add Group Member Manually"
          onClose={() => setManualModalOpen(false)}
          actions={
            <>
              <button
                type="button"
                className="button button-quiet"
                onClick={() => setManualModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="button button-primary"
                onClick={saveManualMember}
                data-testid="save-manual-member"
              >
                Add Member
              </button>
            </>
          }
        >
          <p className="hint" style={{ marginBottom: 14 }}>
            Manually enter a member's details without a screenshot. Note: Manually entered members will not receive the verified badge.
          </p>

          {manualError && (
            <p className="error-text" role="alert" style={{ marginBottom: 12 }}>
              {manualError}
            </p>
          )}

          {/* Row 1: Player name (full width) */}
          <Field id="manual-name" label="Player name" required>
            <input
              className="control"
              id="manual-name"
              value={manualName}
              maxLength={40}
              placeholder="e.g. PlayerTwo"
              onChange={(e) => setManualName(e.target.value)}
              data-testid="manual-member-name-input"
            />
          </Field>

          {/* Row 2: Highest Power + Kills */}
          <div className="row-3" style={{ marginTop: 12, gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
            <Field id="manual-highest-power" label="Highest Power on Record" required>
              <input
                className="control"
                id="manual-highest-power"
                value={manualHighestPower}
                placeholder="e.g. 210,000,000"
                onChange={(e) => setManualHighestPower(e.target.value)}
                data-testid="manual-member-power-input"
              />
            </Field>

            <Field id="manual-kills" label="Kills">
              <input
                className="control"
                id="manual-kills"
                value={manualKills}
                placeholder="0"
                onChange={(e) => setManualKills(e.target.value)}
                data-testid="manual-member-kills-input"
              />
            </Field>
          </div>

          {/* Row 3: Structure + Tech */}
          <div className="row-3" style={{ marginTop: 12, gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
            <Field id="manual-struct" label="Structure Power">
              <input
                className="control"
                id="manual-struct"
                value={manualStructurePower}
                placeholder="e.g. 70,000,000"
                onChange={(e) => setManualStructurePower(e.target.value)}
              />
            </Field>

            <Field id="manual-tech" label="Tech Power">
              <input
                className="control"
                id="manual-tech"
                value={manualTechPower}
                placeholder="e.g. 15,000,000"
                onChange={(e) => setManualTechPower(e.target.value)}
              />
            </Field>
          </div>

          {/* Row 4: Troop + Hero */}
          <div className="row-3" style={{ marginTop: 12, gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
            <Field id="manual-troop" label="Troop Power">
              <input
                className="control"
                id="manual-troop"
                value={manualTroopPower}
                placeholder="e.g. 50,000,000"
                onChange={(e) => setManualTroopPower(e.target.value)}
              />
            </Field>

            <Field id="manual-hero" label="Hero Power">
              <input
                className="control"
                id="manual-hero"
                value={manualHeroPower}
                placeholder="e.g. 45,000,000"
                onChange={(e) => setManualHeroPower(e.target.value)}
              />
            </Field>
          </div>

          {/* Row 5: Mod Vehicle + Alliance */}
          <div className="row-3" style={{ marginTop: 12, gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
            <Field id="manual-vehicle" label="Mod Vehicle Power">
              <input
                className="control"
                id="manual-vehicle"
                value={manualModVehiclePower}
                placeholder="e.g. 8,000,000"
                onChange={(e) => setManualModVehiclePower(e.target.value)}
              />
            </Field>

            <Field id="manual-alliance" label="Current alliance">
              <input
                className="control"
                id="manual-alliance"
                value={manualAlliance}
                placeholder={draft.currentAlliance || 'Alliance tag/name'}
                onChange={(e) => setManualAlliance(e.target.value)}
              />
            </Field>
          </div>
        </Modal>
      )}
    </StepLayout>
  );
}
