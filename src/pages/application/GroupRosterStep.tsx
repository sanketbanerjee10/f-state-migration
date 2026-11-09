import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { FormSection } from '../../components/Field';
import { StepLayout } from '../../components/form/StepLayout';
import { DismissibleToast } from '../../components/DismissibleToast';
import { MigrationScoringGuide } from '../../components/MigrationScoringGuide';
import { useApplicationDraft } from '../../hooks/useApplicationDraft';
import { useWizardNavigation } from '../../hooks/useWizardNavigation';
import { recognizeScreenshot } from '../../lib/ocr';
import { parseMagnitude, parseStateNumber } from '../../lib/parsers';
import { calculateMigrationScoreFromRaw, useLiveTierThresholds } from '../../lib/migrationScore';
import type { GroupMember } from '../../types/application';
import { EditMemberModal, ManualMemberModal } from './group-roster/GroupRosterModals';
import { MemberRosterList } from './group-roster/MemberRosterList';
import { RosterUploadZone } from './group-roster/RosterUploadZone';
import { UploadProgressCard, type UploadProgress } from './group-roster/UploadProgressCard';

const OCR_CONCURRENCY = 2;
const INITIAL_SECONDS_PER_BATCH = 20;
const MAX_GROUP_MEMBERS = 99;
const T10_RESEARCH_AUTO_COMPLETE_TECH_POWER = 25_000_000;

function isValidT10Percent(value: string) {
  return /^\d{1,2}$/.test(value) && Number(value) <= 99;
}

export function GroupRosterStep() {
  const { t } = useTranslation();
  const { draft, addGroupMember, updateGroupMember, removeGroupMember, showOcrAccuracyNotice } = useApplicationDraft();
  const { nextStep, prevStep } = useWizardNavigation();
  const { thresholds } = useLiveTierThresholds();

  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [uploadError, setUploadError] = useState('');
  const [scoreErrorToast, setScoreErrorToast] = useState('');
  const [dragging, setDragging] = useState(false);
  const [, setClockTick] = useState(0);

  const [editingMember, setEditingMember] = useState<GroupMember | null>(null);
  const [editName, setEditName] = useState('');
  const [editState, setEditState] = useState('');
  const [editF1Power, setEditF1Power] = useState('');
  const [editF2Power, setEditF2Power] = useState('');
  const [editF3Power, setEditF3Power] = useState('');
  const [editKills, setEditKills] = useState('');
  const [editAlliance, setEditAlliance] = useState('');
  const [editT10Complete, setEditT10Complete] = useState<boolean | null>(null);
  const [editT10Percent, setEditT10Percent] = useState('');
  const [editError, setEditError] = useState('');
  const [editErrorScrollKey, setEditErrorScrollKey] = useState(0);

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
  const [manualT10Complete, setManualT10Complete] = useState<boolean | null>(null);
  const [manualT10Percent, setManualT10Percent] = useState('');
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
    for (let i = 0; i < files.length; i += 1) {
      const file = files[i];
      if (['image/png', 'image/jpeg'].includes(file.type) || /\.(png|jpe?g)$/i.test(file.name)) {
        if (file.size <= 10 * 1024 * 1024) {
          validFiles.push(file);
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
        estimatedSecondsPerBatch = Math.max(1, (Date.now() - startedAt) / 1000 / completedBatches);
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

          const powerFields = [structurePower, techPower, troopPower, heroPower, modVehiclePower];
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
            t10ResearchComplete:
              (parseMagnitude(techPower) || 0) >= T10_RESEARCH_AUTO_COMPLETE_TECH_POWER ? true : null,
            t10ResearchPercent: '',
            screenshotFileName: file.name,
            isScreenshotVerified: true,
          };
        } catch (error) {
          console.error('Failed to parse member screenshot:', error);
          unrecognizedFiles[idx] = file.name;
        } finally {
          completed += 1;
          updateProgress();
        }
      }
    };

    await Promise.all(
      Array.from({ length: Math.min(OCR_CONCURRENCY, filesToProcess.length) }, () => processScreenshots()),
    );

    results.forEach((member) => {
      if (member) addGroupMember(member);
    });
    if (results.some(Boolean)) {
      showOcrAccuracyNotice();
    }

    if (invalidScoreCount > 0) {
      setScoreErrorToast(
        t(
          invalidScoreCount === 1 ? 'wizard.roster.membersNotAdded_one' : 'wizard.roster.membersNotAdded_other',
          { count: invalidScoreCount },
        ),
      );
    }

    const failedFiles = unrecognizedFiles.filter((filename): filename is string => filename !== null);
    const uploadMessages: string[] = [];
    if (failedFiles.length > 0) {
      uploadMessages.push(t('wizard.roster.failedFiles', { failedFiles: failedFiles.join(', ') }));
    }
    if (skippedForCapacity > 0) {
      uploadMessages.push(
        t(
          skippedForCapacity === 1 ? 'wizard.roster.screenshotsNotProcessed_one' : 'wizard.roster.screenshotsNotProcessed_other',
          { count: skippedForCapacity, max: MAX_GROUP_MEMBERS },
        ),
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
      setManualT10Complete(member.t10ResearchComplete);
      setManualT10Percent(member.t10ResearchPercent);
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
    setEditT10Complete(member.t10ResearchComplete);
    setEditT10Percent(member.t10ResearchPercent);
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
    const autoT10Complete =
      (parseMagnitude(editingMember.techPower) || 0) >= T10_RESEARCH_AUTO_COMPLETE_TECH_POWER;
    if (!autoT10Complete && editT10Complete === null) {
      setEditError(t('wizard.validation.t10Research'));
      setEditErrorScrollKey((key) => key + 1);
      return;
    }
    if (!autoT10Complete && editT10Complete === false && !isValidT10Percent(editT10Percent)) {
      setEditError(t('wizard.validation.t10ResearchPercent'));
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
      t10ResearchComplete: autoT10Complete || editT10Complete === true,
      t10ResearchPercent:
        autoT10Complete || editT10Complete === true ? '' : editT10Percent,
    });

    toast.success('Updated Details', {
      icon: <Check className="portal-toast-check" size={16} aria-hidden="true" />,
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
    setManualT10Complete(null);
    setManualT10Percent('');
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

    const autoT10Complete =
      (parseMagnitude(manualTechPower) || 0) >= T10_RESEARCH_AUTO_COMPLETE_TECH_POWER;
    if (!autoT10Complete && manualT10Complete === null) {
      setManualError(t('wizard.validation.t10Research'));
      setManualErrorScrollKey((key) => key + 1);
      return;
    }
    if (!autoT10Complete && manualT10Complete === false && !isValidT10Percent(manualT10Percent)) {
      setManualError(t('wizard.validation.t10ResearchPercent'));
      setManualErrorScrollKey((key) => key + 1);
      return;
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
      setManualError(t('wizard.roster.powerMustEqualSum'));
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
      t10ResearchComplete: autoT10Complete || manualT10Complete === true,
      t10ResearchPercent:
        autoT10Complete || manualT10Complete === true ? '' : manualT10Percent,
    };

    if (manualEditingMember) {
      updateGroupMember(manualEditingMember.id, memberFields);
      toast.success('Updated Details', {
        icon: <Check className="portal-toast-check" size={16} aria-hidden="true" />,
      });
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

  const continueFromRoster = () => {
    const incompleteMember = draft.groupMembers.find((member) => {
      if ((parseMagnitude(member.techPower) || 0) >= T10_RESEARCH_AUTO_COMPLETE_TECH_POWER) return false;
      if (member.t10ResearchComplete === null) return true;
      return member.t10ResearchComplete === false && !isValidT10Percent(member.t10ResearchPercent);
    });

    if (incompleteMember) {
      openEditModal(incompleteMember);
      toast.error(t('wizard.groupT10.resolveMember', { name: incompleteMember.playerName }));
      return;
    }

    nextStep();
  };

  return (
    <>
      <DismissibleToast message={scoreErrorToast} onDismiss={() => setScoreErrorToast('')} />
      <StepLayout
        navigationProps={{
          onContinue: continueFromRoster,
          onBack: prevStep,
          continueLabel: t('wizard.groupUpload.continue'),
          disabled: uploading,
        }}
      >
        <FormSection number="04" title={t('wizard.navigation.roster')}>
          <div className="hint">{t('wizard.roster.intro')}</div>
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

          {!uploading && (
            <RosterUploadZone
              dragging={dragging}
              uploading={uploading}
              t={t}
              onBrowse={() => multiFileInputRef.current?.click()}
              onFiles={handleFiles}
              setDragging={setDragging}
            />
          )}

          {uploading && uploadProgress && <UploadProgressCard uploadProgress={uploadProgress} t={t} />}

          {uploadError && (
            <div className="ocr-feedback-banner ocr-feedback-error" role="alert" style={{ marginTop: 12 }}>
              <div className="feedback-content">
                <strong>{t('wizard.roster.uploadErrorTitle')}</strong>
                <p>{uploadError}</p>
              </div>
            </div>
          )}

          <div style={{ marginTop: 22 }}>
            <div className="panel-heading" style={{ marginBottom: 12, alignItems: 'center' }}>
              <div>
                <span className="panel-kicker" style={{ fontSize: '12px' }}>
                  {t('wizard.roster.rosterCount', { count: draft.groupMembers.length, max: MAX_GROUP_MEMBERS })}
                </span>
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
              </div>
            </div>

            <MemberRosterList
              members={draft.groupMembers}
              draft={draft}
              thresholds={thresholds}
              onEdit={openEditModal}
              onRemove={removeGroupMember}
              t={t}
            />
          </div>

          <MigrationScoringGuide thresholds={thresholds} />
        </FormSection>

        {editingMember && (
          <EditMemberModal
            member={editingMember}
            values={{
              name: editName,
              state: editState,
              f1Power: editF1Power,
              f2Power: editF2Power,
              f3Power: editF3Power,
              kills: editKills,
              alliance: editAlliance,
              t10ResearchComplete: editT10Complete,
              t10ResearchPercent: editT10Percent,
            }}
            error={editError}
            scrollKey={editErrorScrollKey}
            onClose={() => setEditingMember(null)}
            onSave={saveEditModal}
            onFieldChange={{
              name: (value) => {
                setEditName(value);
                setEditError('');
              },
              state: (value) => {
                setEditState(value);
                setEditError('');
              },
              f1Power: (value) => {
                setEditF1Power(value);
                setEditError('');
              },
              f2Power: (value) => {
                setEditF2Power(value);
                setEditError('');
              },
              f3Power: (value) => {
                setEditF3Power(value);
                setEditError('');
              },
              kills: (value) => {
                setEditKills(value);
                setEditError('');
              },
              alliance: (value) => {
                setEditAlliance(value);
                setEditError('');
              },
              t10ResearchComplete: (value) => {
                setEditT10Complete(value);
                setEditError('');
              },
              t10ResearchPercent: (value) => {
                setEditT10Percent(value);
                setEditError('');
              },
            }}
            t={t}
          />
        )}

        {manualModalOpen && (
          <ManualMemberModal
            draft={draft}
            values={{
              name: manualName,
              state: manualState,
              f1Power: manualF1Power,
              f2Power: manualF2Power,
              f3Power: manualF3Power,
              structurePower: manualStructurePower,
              techPower: manualTechPower,
              troopPower: manualTroopPower,
              heroPower: manualHeroPower,
              modVehiclePower: manualModVehiclePower,
              kills: manualKills,
              alliance: manualAlliance,
              highestPower: manualHighestPower,
              t10ResearchComplete: manualT10Complete,
              t10ResearchPercent: manualT10Percent,
            }}
            error={manualError}
            scrollKey={manualErrorScrollKey}
            editingMember={manualEditingMember}
            onClose={() => {
              setManualModalOpen(false);
              setManualEditingMember(null);
            }}
            onSave={saveManualMember}
            onFieldChange={{
              name: (value) => {
                setManualName(value);
                setManualError('');
              },
              state: (value) => {
                setManualState(value);
                setManualError('');
              },
              f1Power: (value) => {
                setManualF1Power(value);
                setManualError('');
              },
              f2Power: (value) => {
                setManualF2Power(value);
                setManualError('');
              },
              f3Power: (value) => {
                setManualF3Power(value);
                setManualError('');
              },
              structurePower: (value) => {
                setManualStructurePower(value);
                setManualError('');
              },
              techPower: (value) => {
                setManualTechPower(value);
                setManualError('');
              },
              troopPower: (value) => {
                setManualTroopPower(value);
                setManualError('');
              },
              heroPower: (value) => {
                setManualHeroPower(value);
                setManualError('');
              },
              modVehiclePower: (value) => {
                setManualModVehiclePower(value);
                setManualError('');
              },
              kills: (value) => {
                setManualKills(value);
                setManualError('');
              },
              alliance: (value) => {
                setManualAlliance(value);
                setManualError('');
              },
              t10ResearchComplete: (value) => {
                setManualT10Complete(value);
                setManualError('');
              },
              t10ResearchPercent: (value) => {
                setManualT10Percent(value);
                setManualError('');
              },
            }}
            t={t}
          />
        )}
      </StepLayout>
    </>
  );
}