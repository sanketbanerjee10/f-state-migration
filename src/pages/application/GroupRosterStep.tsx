import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import {
  Edit2,
  FileImage,
  ImagePlus,
  LoaderCircle,
  Plus,
  Trash2,
  Upload,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { Field, FormSection } from '../../components/Field';
import { Modal } from '../../components/Dialogs';
import { CommaFormattedNumberInput } from '../../components/form/CommaFormattedNumberInput';
import { StepLayout } from '../../components/form/StepLayout';
import { recognizeScreenshot } from '../../lib/ocr';
import { parseMagnitude, parseStateNumber } from '../../lib/parsers';
import { calculateMigrationScoreFromRaw, TIER_COLORS, useLiveTierThresholds } from '../../lib/migrationScore';
import { MigrationScoreBadge, VerifiedBadge, MigrationScoringGuide } from '../../components/MigrationScoringGuide';
import { OcrWaitingMessage } from '../../components/ocr/OcrWaitingMessage';
import { DismissibleToast } from '../../components/DismissibleToast';
import type { GroupMember } from '../../types/application';
import { useApplicationDraft } from '../../hooks/useApplicationDraft';
import { useWizardNavigation } from '../../hooks/useWizardNavigation';

const OCR_CONCURRENCY = 2;
const INITIAL_SECONDS_PER_BATCH = 20;
const MAX_GROUP_MEMBERS = 99;

type UploadProgress = {
  completed: number;
  total: number;
  estimatedEndAt: number;
};

function formatDuration(seconds: number, t: TFunction): string {
  if (seconds < 60) return t('wizard.roster.durationSeconds', { count: seconds });
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return remainingSeconds
    ? t('wizard.roster.durationMinutesSeconds', { minutes, seconds: remainingSeconds })
    : t('wizard.roster.durationMinutes', { minutes });
}

export function GroupRosterStep() {
  const { t } = useTranslation();
  const {
    draft,
    addGroupMember,
    updateGroupMember,
    removeGroupMember,
  } = useApplicationDraft();

  const { nextStep, prevStep } = useWizardNavigation();
  const { thresholds } = useLiveTierThresholds();

  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [uploadError, setUploadError] = useState('');
  const [scoreErrorToast, setScoreErrorToast] = useState('');
  const [dragging, setDragging] = useState(false);
  const [, setClockTick] = useState(0);

  // Edit member modal
  const [editingMember, setEditingMember] = useState<GroupMember | null>(null);
  const [editName, setEditName] = useState('');
  const [editState, setEditState] = useState('');
  const [editF1Power, setEditF1Power] = useState('');
  const [editF2Power, setEditF2Power] = useState('');
  const [editF3Power, setEditF3Power] = useState('');
  const [editKills, setEditKills] = useState('');
  const [editAlliance, setEditAlliance] = useState('');
  const [editError, setEditError] = useState('');
  const [editErrorScrollKey, setEditErrorScrollKey] = useState(0);

  // Manual add member modal
  const [manualModalOpen, setManualModalOpen] = useState(false);
  const [manualName, setManualName] = useState('');
  const [manualState, setManualState] = useState('');
  const [manualF1Power, setManualF1Power] = useState('');
  const [manualF2Power, setManualF2Power] = useState('');
  const [manualF3Power, setManualF3Power] = useState('');
  const [manualStructurePower, setManualStructurePower] = useState('');
  const [manualTechPower, setManualTechPower] = useState('');
  const [manualTroopPower, setManualTroopPower] = useState('');
  const [manualHeroPower, setManualHeroPower] = useState('');
  const [manualModVehiclePower, setManualModVehiclePower] = useState('');
  const [manualKills, setManualKills] = useState('');
  const [manualAlliance, setManualAlliance] = useState('');
  const [manualError, setManualError] = useState('');
  const [manualErrorScrollKey, setManualErrorScrollKey] = useState(0);
  const [manualEditingMember, setManualEditingMember] = useState<GroupMember | null>(null);

  const manualHighestPower = [
    manualStructurePower,
    manualTechPower,
    manualTroopPower,
    manualHeroPower,
    manualModVehiclePower,
  ]
    .reduce((total, power) => total + (parseMagnitude(power) || 0), 0)
    .toLocaleString('en-US');
  const remainingMemberSlots = Math.max(0, MAX_GROUP_MEMBERS - draft.groupMembers.length);

  const multiFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!uploading) return;
    const timer = window.setInterval(() => setClockTick((tick) => tick + 1), 1000);
    return () => window.clearInterval(timer);
  }, [uploading]);

  const handleFiles = async (files: FileList | File[]) => {
    if (uploading) return;

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
      setUploadError(t('wizard.roster.invalidFiles'));
      return;
    }

    if (remainingMemberSlots === 0) {
      setUploadError(t('wizard.roster.maxPlayers', { max: MAX_GROUP_MEMBERS }));
      return;
    }

    const filesToProcess = validFiles.slice(0, remainingMemberSlots);
    const skippedForCapacity = validFiles.length - filesToProcess.length;
    setUploadError('');
    setUploading(true);

    const results: Array<GroupMember | null> = Array(filesToProcess.length).fill(null);
    const unrecognizedFiles: Array<string | null> = Array(filesToProcess.length).fill(null);
    let invalidScoreCount = 0;
    let nextIndex = 0;
    let completed = 0;
    let estimatedSecondsPerBatch = INITIAL_SECONDS_PER_BATCH;
    const startedAt = Date.now();
    const totalBatches = Math.ceil(filesToProcess.length / OCR_CONCURRENCY);

    setUploadProgress({
      completed: 0,
      total: filesToProcess.length,
      estimatedEndAt: startedAt + totalBatches * estimatedSecondsPerBatch * 1000,
    });

    const updateProgress = () => {
      const completedBatches = Math.floor(completed / OCR_CONCURRENCY);
      if (completedBatches > 0) {
        estimatedSecondsPerBatch = Math.max(
          1,
          (Date.now() - startedAt) / 1000 / completedBatches,
        );
      }
      const remainingBatches = Math.ceil((filesToProcess.length - completed) / OCR_CONCURRENCY);
      setUploadProgress({
        completed,
        total: filesToProcess.length,
        estimatedEndAt: Date.now() + remainingBatches * estimatedSecondsPerBatch * 1000,
      });
    };

    const processScreenshots = async () => {
      while (nextIndex < filesToProcess.length) {
        const idx = nextIndex++;
        const file = filesToProcess[idx];
        updateProgress();

        try {
          const result = await recognizeScreenshot(file);
          const extracted = result.extracted;
          const structurePower = extracted.structurePower || '0';
          const techPower = extracted.techPower || '0';
          const troopPower = extracted.troopPower || '0';
          const heroPower = extracted.heroPower || '0';
          const modVehiclePower = extracted.modVehiclePower || '0';
          const calculatedPower = [
            structurePower,
            techPower,
            troopPower,
            heroPower,
            modVehiclePower,
          ].reduce((total, power) => total + (parseMagnitude(power) || 0), 0);

          const powerFields = [
            structurePower,
            techPower,
            troopPower,
            heroPower,
            modVehiclePower,
          ];
          const missingPower = powerFields.some((value) => parseMagnitude(value) === null);

          if (missingPower) {
            unrecognizedFiles[idx] = file.name;
            continue;
          }

          const migrationScore = calculateMigrationScoreFromRaw(
            parseMagnitude(structurePower) || 0,
            parseMagnitude(techPower) || 0,
            parseMagnitude(heroPower) || 0,
            parseMagnitude(modVehiclePower) || 0,
            thresholds,
          );
          if (!migrationScore || migrationScore.score < 10 || migrationScore.score > 1000) {
            invalidScoreCount += 1;
            continue;
          }

          results[idx] = {
            id: crypto.randomUUID(),
            playerName: extracted.playerName || `Member ${draft.groupMembers.length + idx + 1}`,
            currentState: draft.currentState,
            highestPowerOnRecord: Math.round(calculatedPower).toLocaleString('en-US'),
            structurePower,
            techPower,
            troopPower,
            heroPower,
            modVehiclePower,
            kills: extracted.kills || '0',
            currentAlliance: draft.currentAlliance || '',
            screenshotFileName: file.name,
            isScreenshotVerified: true,
          };
        } catch (err) {
          console.error('Failed to parse member screenshot:', err);
          unrecognizedFiles[idx] = file.name;
        } finally {
          completed += 1;
          updateProgress();
        }
      }
    };

    await Promise.all(
      Array.from(
        { length: Math.min(OCR_CONCURRENCY, filesToProcess.length) },
        () => processScreenshots(),
      ),
    );

    results.forEach((member) => {
      if (member) addGroupMember(member);
    });

    if (invalidScoreCount > 0) {
      setScoreErrorToast(
        t(invalidScoreCount === 1 ? 'wizard.roster.membersNotAdded_one' : 'wizard.roster.membersNotAdded_other', { count: invalidScoreCount }),
      );
    }

    const failedFiles = unrecognizedFiles.filter((filename): filename is string => filename !== null);
    const uploadMessages = [];
    if (failedFiles.length > 0) {
      uploadMessages.push(
        t('wizard.roster.failedFiles', { failedFiles: failedFiles.join(', ') }),
      );
    }
    if (skippedForCapacity > 0) {
      uploadMessages.push(
        t(skippedForCapacity === 1 ? 'wizard.roster.screenshotsNotProcessed_one' : 'wizard.roster.screenshotsNotProcessed_other', { count: skippedForCapacity, max: MAX_GROUP_MEMBERS }),
      );
    }
    if (uploadMessages.length > 0) setUploadError(uploadMessages.join(' '));

    setUploading(false);
    setUploadProgress(null);
    if (multiFileInputRef.current) multiFileInputRef.current.value = '';
  };

  const openEditModal = (member: GroupMember) => {
    if (!member.isScreenshotVerified) {
      setManualEditingMember(member);
      setManualName(member.playerName);
      setManualState(member.currentState || draft.currentState);
      setManualF1Power(member.f1ArenaPower || '');
      setManualF2Power(member.f2ArenaPower || '');
      setManualF3Power(member.f3ArenaPower || '');
      setManualStructurePower(member.structurePower);
      setManualTechPower(member.techPower);
      setManualTroopPower(member.troopPower);
      setManualHeroPower(member.heroPower);
      setManualModVehiclePower(member.modVehiclePower);
      setManualKills(member.kills);
      setManualAlliance(member.currentAlliance);
      setManualError('');
      setManualModalOpen(true);
      return;
    }

    setEditingMember(member);
    setEditName(member.playerName);
    setEditState(member.currentState || draft.currentState);
    setEditF1Power(member.f1ArenaPower || '');
    setEditF2Power(member.f2ArenaPower || '');
    setEditF3Power(member.f3ArenaPower || '');
    setEditKills(member.kills);
    setEditAlliance(member.currentAlliance);
    setEditError('');
  };

  const saveEditModal = () => {
    if (!editingMember) return;
    if (!editName.trim()) {
      setEditError(t('wizard.roster.nameRequired'));
      setEditErrorScrollKey((key) => key + 1);
      return;
    }
    if (!editAlliance.trim()) {
      setEditError(t('wizard.roster.allianceRequired'));
      setEditErrorScrollKey((key) => key + 1);
      return;
    }
    if (!parseStateNumber(editState)) {
      setEditError(t('wizard.roster.stateRequired'));
      setEditErrorScrollKey((key) => key + 1);
      return;
    }
    const arenaPowers = [
      { value: editF1Power, label: 'F1' },
      { value: editF2Power, label: 'F2' },
      { value: editF3Power, label: 'F3' },
    ];
    const invalidArenaPower = arenaPowers.find(({ value }) => value.trim() && !parseMagnitude(value));
    if (invalidArenaPower) {
      setEditError(t('wizard.roster.arenaInvalid', { label: invalidArenaPower.label }));
      setEditErrorScrollKey((key) => key + 1);
      return;
    }

    updateGroupMember(editingMember.id, {
      playerName: editName.trim(),
      currentState: editState,
      f1ArenaPower: editF1Power.trim(),
      f2ArenaPower: editF2Power.trim(),
      f3ArenaPower: editF3Power.trim(),
      kills: editKills.trim() || '0',
      currentAlliance: editAlliance.trim(),
    });

    setEditingMember(null);
  };

  const openManualModal = () => {
    setManualEditingMember(null);
    setManualName('');
    setManualState(draft.currentState);
    setManualF1Power('');
    setManualF2Power('');
    setManualF3Power('');
    setManualStructurePower('');
    setManualTechPower('');
    setManualTroopPower('');
    setManualHeroPower('');
    setManualModVehiclePower('');
    setManualKills('');
    setManualAlliance(draft.currentAlliance || '');
    setManualError('');
    setManualModalOpen(true);
  };

  const saveManualMember = () => {
    if (!manualEditingMember && draft.groupMembers.length >= MAX_GROUP_MEMBERS) {
      setManualError(t('wizard.roster.maxPlayers', { max: MAX_GROUP_MEMBERS }));
      setManualErrorScrollKey((key) => key + 1);
      return;
    }
    if (!manualName.trim()) {
      setManualError(t('wizard.roster.playerNameRequired'));
      setManualErrorScrollKey((key) => key + 1);
      return;
    }

    if (!manualAlliance.trim()) {
      setManualError(t('wizard.roster.allianceRequired'));
      setManualErrorScrollKey((key) => key + 1);
      return;
    }

    if (!parseStateNumber(manualState)) {
      setManualError(t('wizard.roster.stateRequired'));
      setManualErrorScrollKey((key) => key + 1);
      return;
    }

    const arenaPowers = [
      { value: manualF1Power, label: 'F1' },
      { value: manualF2Power, label: 'F2' },
      { value: manualF3Power, label: 'F3' },
    ];
    const invalidArenaPower = arenaPowers.find(({ value }) => value.trim() && !parseMagnitude(value));
    if (invalidArenaPower) {
      setManualError(t('wizard.roster.arenaInvalid', { label: invalidArenaPower.label }));
      setManualErrorScrollKey((key) => key + 1);
      return;
    }

    const numericFields = [
      { value: manualStructurePower, label: 'Structure Power' },
      { value: manualTechPower, label: 'Tech Power' },
      { value: manualTroopPower, label: 'Troop Power' },
      { value: manualHeroPower, label: 'Hero Power' },
      { value: manualModVehiclePower, label: 'Mod Vehicle Power' },
    ];

    for (const field of numericFields) {
      if (!field.value.trim()) {
        setManualError(t('wizard.roster.fieldRequired', { label: field.label }));
        setManualErrorScrollKey((key) => key + 1);
        return;
      }

      const value = Number(field.value.replace(/,/g, ''));

      if (!Number.isFinite(value) || value <= 0) {
        setManualError(t('wizard.roster.fieldInvalid', { label: field.label }));
        setManualErrorScrollKey((key) => key + 1);
        return;
      }
    }

    if (manualKills.trim() && parseMagnitude(manualKills, true) === null) {
      setManualError(t('wizard.roster.killsInvalid'));
      setManualErrorScrollKey((key) => key + 1);
      return;
    }

    const powerOnRecord = Number(manualHighestPower.replace(/,/g, ''));
    const componentPowerTotal = [
      manualStructurePower,
      manualTechPower,
      manualTroopPower,
      manualHeroPower,
      manualModVehiclePower,
    ].reduce((total, power) => total + Number(power.replace(/,/g, '')), 0);

    if (powerOnRecord !== componentPowerTotal) {
      setManualError(
        t('wizard.roster.powerMustEqualSum')
      );
      setManualErrorScrollKey((key) => key + 1);
      return;
    }

    const migrationScore = calculateMigrationScoreFromRaw(
      parseMagnitude(manualStructurePower) || 0,
      parseMagnitude(manualTechPower) || 0,
      parseMagnitude(manualHeroPower) || 0,
      parseMagnitude(manualModVehiclePower) || 0,
      thresholds,
    );
    if (!migrationScore || migrationScore.score < 10 || migrationScore.score > 1000) {
      setScoreErrorToast(
        t(manualEditingMember ? 'wizard.roster.memberNotUpdatedInvalidScore' : 'wizard.roster.memberNotAddedInvalidScore'),
      );
      return;
    }

    const memberFields = {
      playerName: manualName.trim(),
      currentState: manualState,
      f1ArenaPower: manualF1Power.trim(),
      f2ArenaPower: manualF2Power.trim(),
      f3ArenaPower: manualF3Power.trim(),
      highestPowerOnRecord: manualHighestPower.trim(),
      structurePower: manualStructurePower.trim(),
      techPower: manualTechPower.trim(),
      troopPower: manualTroopPower.trim(),
      heroPower: manualHeroPower.trim(),
      modVehiclePower: manualModVehiclePower.trim(),
      kills: manualKills.trim(),
      currentAlliance: manualAlliance.trim(),
    };

    if (manualEditingMember) {
      updateGroupMember(manualEditingMember.id, memberFields);
    } else {
      const newMember: GroupMember = {
        id: crypto.randomUUID(),
        ...memberFields,
        isScreenshotVerified: false,
      };
      addGroupMember(newMember);
    }

    setManualModalOpen(false);
    setManualEditingMember(null);
  };

  return (
    <>
      <DismissibleToast message={scoreErrorToast} onDismiss={() => setScoreErrorToast('')} />
      <StepLayout
        navigationProps={{
          onContinue: nextStep,
          onBack: prevStep,
          continueLabel: t('wizard.groupUpload.continue'),
          // backLabel: 'Back to Preferences',
          disabled: uploading,
        }}
      >
      <FormSection number="04" title={t('wizard.navigation.roster')}>
        <div className="hint">
          {t('wizard.roster.intro')}
        </div>
        {/* Hidden multi-file input */}
        <input
          ref={multiFileInputRef}
          hidden
          type="file"
          multiple
          accept="image/png,image/jpeg,.jpg,.jpeg,.png"
          aria-label={t('wizard.roster.bulkUpload')}
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
            className={`upload-zone compact-upload-zone ${dragging ? 'is-dragging' : ''} flex items-center justify-between flex-wrap gap-2`}
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
            <div className="flex gap-2 items-center">
              <div className="upload-icon">
                <Upload size={20} />
              </div>
              <div className="upload-copy">
                <strong>{t('wizard.roster.dropPrompt')}</strong>
                <p className="hint" style={{margin: 0}}>{t('wizard.roster.formats')}</p>
              </div>
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
              <FileImage size={14} /> {t('wizard.roster.browse')}
            </button>
          </div>
        )}

        {/* Uploading progress indicator */}
        {uploading && uploadProgress && (
          <div className="ocr-processing-card" style={{ marginTop: 14 }}>
            <div className="ocr-processing-header">
              <div className="ocr-roster-upload-status">
                <div className="ocr-roster-processing-heading">
                  <LoaderCircle size={18} className="spin" />
                  <span>
                    {t('wizard.roster.processing', { completed: uploadProgress.completed, total: uploadProgress.total })}
                  </span>
                  <span className="ocr-roster-time-remaining">
                    {uploadProgress.estimatedEndAt <= Date.now() && uploadProgress.completed < uploadProgress.total
                      ? t('wizard.roster.takingLonger')
                      : formatDuration(
                          Math.max(0, Math.ceil((uploadProgress.estimatedEndAt - Date.now()) / 1000)),
                          t,
                        )}
                  </span>
                </div>
                <OcrWaitingMessage />
              </div>
            </div>
            <div className="ocr-roster-progress-track" aria-hidden="true">
              <span />
            </div>
          </div>
        )}

        {uploadError && (
          <div className="ocr-feedback-banner ocr-feedback-error" role="alert" style={{ marginTop: 12 }}>
            <div className="feedback-content">
              <strong>{t('wizard.roster.uploadErrorTitle')}</strong>
              <p>{uploadError}</p>
            </div>
          </div>
        )}

        {/* Member Roster List */}
        <div style={{ marginTop: 22 }}>
          <div className="panel-heading" style={{ marginBottom: 12, alignItems: 'center' }}>
            <div>
              <span className="panel-kicker" style={{fontSize: "12px"}}>{t('wizard.roster.rosterCount', { count: draft.groupMembers.length, max: MAX_GROUP_MEMBERS })}</span>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                className="button button-quiet button-sm"
                onClick={openManualModal}
                disabled={uploading || remainingMemberSlots === 0}
                data-testid="add-manual-member-btn"
                aria-label={t('wizard.roster.addMemberTitle')}
                title={t('wizard.roster.addMemberTitle')}
              >
                <UserPlus size={16} />
              </button>
              {/* <button
                type="button"
                className="button button-quiet button-sm"
                onClick={() => multiFileInputRef.current?.click()}
                disabled={uploading}
                data-testid="add-more-members-btn"
              >
                <ImagePlus size={16} />
              </button> */}
            </div>
          </div>

          {draft.groupMembers.length === 0 ? (
            <div className="empty-state compact-empty" style={{ padding: '12px 10px 20px' }}>
              <Users size={24} />
              <strong>{t('wizard.roster.emptyTitle')}</strong>
              <span>{t('wizard.roster.emptyDescription')}</span>
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
                          {t('wizard.roster.manual')}
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
                        title={t('wizard.roster.editMemberDetails')}
                        aria-label={t('wizard.roster.editMemberDetails')}
                        data-testid={`edit-member-${idx}`}
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        type="button"
                        className="button button-quiet button-sm button-danger-text"
                        onClick={() => removeGroupMember(member.id)}
                        title={t('wizard.roster.removeMember')}
                        aria-label={t('wizard.roster.removeMember')}
                        data-testid={`remove-member-${idx}`}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  <div className="group-member-stats">
                    <div>
                        <span>{t('wizard.roster.stateLabel')}</span>
                        <strong>{member.currentState || draft.currentState || '—'}</strong>
                      </div>
                      <div>
                        <span>{t('wizard.roster.power')}</span>
                      <strong>{member.highestPowerOnRecord}</strong>
                    </div>
                    <div>
                      <span>{t('wizard.roster.killsLabel')}</span>
                      <strong>{member.kills}</strong>
                    </div>
                    <div>
                      <span>{t('wizard.roster.allianceLabel')}</span>
                      <strong>{member.currentAlliance || draft.currentAlliance || '—'}</strong>
                    </div>
                  </div>

                  <div className="group-member-breakdown">
                    <span>
                      {t('wizard.roster.structureShort')} <strong>{member.structurePower}</strong>
                    </span>
                    <span>
                      {t('wizard.roster.techShort')} <strong>{member.techPower}</strong>
                    </span>
                    <span>
                      {t('wizard.roster.troopShort')} <strong>{member.troopPower}</strong>
                    </span>
                    <span>
                      {t('wizard.roster.heroShort')} <strong>{member.heroPower}</strong>
                    </span>
                    <span>
                      {t('wizard.roster.vehicleShort')} <strong>{member.modVehiclePower}</strong>
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
          title={t('wizard.roster.editMember', { name: editingMember.playerName })}
          onClose={() => setEditingMember(null)}
          className="dialog-fixed-header"
          showCloseButton
          scrollBodyToTopKey={editErrorScrollKey}
          actions={
            <>
              <button
                type="button"
                className="button button-quiet"
                onClick={() => setEditingMember(null)}
              >
                {t('common.actions.cancel')}
              </button>
              <button
                type="button"
                className="button button-primary"
                onClick={saveEditModal}
                data-testid="save-member-edit"
              >
                {t('wizard.roster.saveChanges')}
              </button>
            </>
          }
        >
          <p className="hint" style={{ marginBottom: 14 }}>
            {t('wizard.roster.editHint')}
            {editingMember.isScreenshotVerified && ` ${t('wizard.roster.editLockedHint')}`}
          </p>

          {editError && (
            <div className="manual-member-error" role="alert">
              {editError}
            </div>
          )}

          <Field id="edit-player-name" label={t('wizard.roster.playerName')} required>
            <input
              className="control"
              id="edit-player-name"
              value={editName}
              maxLength={30}
              onChange={(e) => {
                setEditName(e.target.value);
                setEditError('');
              }}
              data-testid="edit-member-name-input"
            />
          </Field>

          <Field id="edit-player-state" label={t('wizard.roster.stateLabel')} required>
            <input
              className="control"
              id="edit-player-state"
              type="text"
              value={editState}
              maxLength={4}
              inputMode="numeric"
              pattern="[0-9]*"
              onChange={(e) => {
                if (!/^\d{0,4}$/.test(e.target.value)) return;
                setEditState(e.target.value);
                setEditError('');
              }}
              data-testid="edit-member-state-input"
            />
          </Field>

          <Field id="edit-player-kills" label={t('wizard.roster.killsLabel')}>
            <CommaFormattedNumberInput
              className="control"
              id="edit-player-kills"
              value={editKills}
              placeholder={t('wizard.roster.killsPlaceholder')}
              onChange={setEditKills}
              data-testid="edit-member-kills-input"
            />
          </Field>

          <Field id="edit-player-alliance" label={t('wizard.roster.allianceLabel')} required>
            <input
              className="control"
              id="edit-player-alliance"
              value={editAlliance}
              maxLength={50}
              onChange={(e) => {
                setEditAlliance(e.target.value);
                setEditError('');
              }}
              data-testid="edit-member-alliance-input"
            />
          </Field>

          <div style={{ marginTop: 14, padding: 12, background: 'rgba(255,255,255,0.03)', borderRadius: 6 }}>
            <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 6, fontWeight: 600 }}>
              {editingMember.isScreenshotVerified ? t('wizard.roster.lockedStats') : t('wizard.roster.manualStats')}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6, fontSize: 12 }}>
              <div>{t('wizard.roster.power')} <strong>{editingMember.highestPowerOnRecord}</strong></div>
              <div>{t('wizard.roster.structure')} <strong>{editingMember.structurePower}</strong></div>
              <div>{t('wizard.roster.tech')} <strong>{editingMember.techPower}</strong></div>
              <div>{t('wizard.roster.troop')} <strong>{editingMember.troopPower}</strong></div>
              <div>{t('wizard.roster.hero')} <strong>{editingMember.heroPower}</strong></div>
              <div>{t('wizard.roster.vehicle')} <strong>{editingMember.modVehiclePower}</strong></div>
            </div>
          </div>

          <div className="row-3" style={{ marginTop: 12, gridTemplateColumns: 'repeat(1, minmax(0, 1fr))' }}>
            <Field id="edit-player-f1" label={t('wizard.roster.arenaPowerOptional', { label: 'F1' })}>
              <CommaFormattedNumberInput
                className="control"
                id="edit-player-f1"
                value={editF1Power}
                placeholder={t('wizard.roster.unknown')}
                onChange={(value) => {
                  setEditF1Power(value);
                  setEditError('');
                }}
                data-testid="edit-member-f1-input"
              />
            </Field>
            <Field id="edit-player-f2" label={t('wizard.roster.arenaPowerOptional', { label: 'F2' })}>
              <CommaFormattedNumberInput
                className="control"
                id="edit-player-f2"
                value={editF2Power}
                placeholder={t('wizard.roster.unknown')}
                onChange={(value) => {
                  setEditF2Power(value);
                  setEditError('');
                }}
                data-testid="edit-member-f2-input"
              />
            </Field>
            <Field id="edit-player-f3" label={t('wizard.roster.arenaPowerOptional', { label: 'F3' })}>
              <CommaFormattedNumberInput
                className="control"
                id="edit-player-f3"
                value={editF3Power}
                placeholder={t('wizard.roster.unknown')}
                onChange={(value) => {
                  setEditF3Power(value);
                  setEditError('');
                }}
                data-testid="edit-member-f3-input"
              />
            </Field>
          </div>
        </Modal>
      )}

      {/* Add Manual Member Modal */}
      {manualModalOpen && (
        <Modal
          title={manualEditingMember ? t('wizard.roster.editMember', { name: manualEditingMember.playerName }) : t('wizard.roster.addMemberTitle')}
          className="dialog-fixed-header"
          showCloseButton
          scrollBodyToTopKey={manualErrorScrollKey}
          onClose={() => {
            setManualModalOpen(false);
            setManualEditingMember(null);
          }}
          actions={
            <>
              <button
                type="button"
                className="button button-quiet"
                onClick={() => {
                  setManualModalOpen(false);
                  setManualEditingMember(null);
                }}
              >
                {t('common.actions.cancel')}
              </button>
              <button
                type="button"
                className="button button-primary"
                onClick={saveManualMember}
                data-testid={manualEditingMember ? 'save-manual-member-edit' : 'save-manual-member'}
              >
                {manualEditingMember ? t('wizard.roster.saveChanges') : t('wizard.roster.addMember')}
              </button>
            </>
          }
        >
          <p className="hint" style={{ marginBottom: 14 }}>
            {t('wizard.roster.manualHint')}
          </p>

          {manualError && (
            <div className="manual-member-error" role="alert">
              {manualError}
            </div>
          )}

          {/* Row 1: Player name (full width) */}
          <Field id="manual-name" label={t('wizard.roster.playerName')} required>
            <input
              className="control"
              id="manual-name"
              value={manualName}
              maxLength={30}
              placeholder={t('wizard.roster.playerPlaceholder')}
              onChange={(e) => setManualName(e.target.value)}
              data-testid="manual-member-name-input"
            />
          </Field>

          <Field id="manual-state" label={t('wizard.roster.stateLabel')} required>
            <input
              className="control"
              id="manual-state"
              type="text"
              value={manualState}
              maxLength={4}
              inputMode="numeric"
              pattern="[0-9]*"
              onChange={(e) => {
                if (!/^\d{0,4}$/.test(e.target.value)) return;
                setManualState(e.target.value);
                setManualError('');
              }}
              data-testid="manual-member-state-input"
            />
          </Field>

          <Field id="manual-alliance" label={t('wizard.roster.allianceLabel')} required>
            <input
              className="control"
              id="manual-alliance"
              value={manualAlliance}
              maxLength={50}
              placeholder={draft.currentAlliance || t('wizard.roster.allianceTag')}
              onChange={(e) => setManualAlliance(e.target.value)}
              data-testid="manual-member-alliance-input"
            />
          </Field>

          {/* Row 2: Power + Kills */}
          <div className="row-3" style={{ marginTop: 12, gridTemplateColumns: 'repeat(1, minmax(0, 1fr))' }}>
            <Field id="manual-highest-power" label={t('wizard.roster.powerRecord')} required>
              <CommaFormattedNumberInput
                className="control"
                id="manual-highest-power"
                value={manualHighestPower}
                placeholder={t('wizard.roster.powerPlaceholder')}
                disabled
                onChange={() => undefined}
                data-testid="manual-member-power-input"
              />
            </Field>

            <Field id="manual-kills" label={t('wizard.roster.killsOptional')}>
              <CommaFormattedNumberInput
                className="control"
                id="manual-kills"
                value={manualKills}
                placeholder={t('wizard.roster.zeroPlaceholder')}
                onChange={setManualKills}
                data-testid="manual-member-kills-input"
              />
            </Field>
          </div>

          {/* Row 3: Structure + Tech */}
          <div className="row-3" style={{ marginTop: 12, gridTemplateColumns: 'repeat(1, minmax(0, 1fr))' }}>
            <Field id="manual-struct" label={t('wizard.roster.structureLabel')} required>
              <CommaFormattedNumberInput
                className="control"
                id="manual-struct"
                value={manualStructurePower}
                placeholder={t('wizard.roster.structurePlaceholder')}
                onChange={setManualStructurePower}
              />
            </Field>

            <Field id="manual-tech" label={t('wizard.roster.techLabel')} required>
              <CommaFormattedNumberInput
                className="control"
                id="manual-tech"
                value={manualTechPower}
                placeholder={t('wizard.roster.techPlaceholder')}
                onChange={setManualTechPower}
              />
            </Field>
          </div>

          {/* Row 4: Troop + Hero */}
          <div className="row-3" style={{ marginTop: 12, gridTemplateColumns: 'repeat(1, minmax(0, 1fr))' }}>
            <Field id="manual-troop" label={t('wizard.roster.troopLabel')} required>
              <CommaFormattedNumberInput
                className="control"
                id="manual-troop"
                value={manualTroopPower}
                placeholder={t('wizard.roster.troopPlaceholder')}
                onChange={setManualTroopPower}
              />
            </Field>

            <Field id="manual-hero" label={t('wizard.roster.heroLabel')} required>
              <CommaFormattedNumberInput
                className="control"
                id="manual-hero"
                value={manualHeroPower}
                placeholder={t('wizard.roster.heroPlaceholder')}
                onChange={setManualHeroPower}
              />
            </Field>
          </div>

          {/* Row 5: Mod Vehicle + Alliance */}
          <div className="row-3" style={{ marginTop: 12, gridTemplateColumns: 'repeat(1, minmax(0, 1fr))' }}>
            <Field id="manual-vehicle" label={t('wizard.roster.vehicleLabel')} required>
              <CommaFormattedNumberInput
                className="control"
                id="manual-vehicle"
                value={manualModVehiclePower}
                placeholder={t('wizard.roster.vehiclePlaceholder')}
                onChange={setManualModVehiclePower}
              />
            </Field>
          </div>

          <div className="row-3" style={{ marginTop: 12, gridTemplateColumns: 'repeat(1, minmax(0, 1fr))' }}>
            <Field id="manual-f1-power" label={t('wizard.roster.arenaPowerOptional', { label: 'F1' })}>
              <CommaFormattedNumberInput
                className="control"
                id="manual-f1-power"
                value={manualF1Power}
                placeholder={t('wizard.roster.unknown')}
                onChange={setManualF1Power}
                data-testid="manual-member-f1-input"
              />
            </Field>
            <Field id="manual-f2-power" label={t('wizard.roster.arenaPowerOptional', { label: 'F2' })}>
              <CommaFormattedNumberInput
                className="control"
                id="manual-f2-power"
                value={manualF2Power}
                placeholder={t('wizard.roster.unknown')}
                onChange={setManualF2Power}
                data-testid="manual-member-f2-input"
              />
            </Field>
            <Field id="manual-f3-power" label={t('wizard.roster.arenaPowerOptional', { label: 'F3' })}>
              <CommaFormattedNumberInput
                className="control"
                id="manual-f3-power"
                value={manualF3Power}
                placeholder={t('wizard.roster.unknown')}
                onChange={setManualF3Power}
                data-testid="manual-member-f3-input"
              />
            </Field>
          </div>
        </Modal>
      )}
      </StepLayout>
    </>
  );
}
