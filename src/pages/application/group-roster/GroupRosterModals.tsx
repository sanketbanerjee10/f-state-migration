import type { TFunction } from 'i18next';
import { Field } from '../../../components/Field';
import { Modal } from '../../../components/Dialogs';
import { CommaFormattedNumberInput } from '../../../components/form/CommaFormattedNumberInput';
import type { ApplicationDraft } from '../../../hooks/useApplicationDraft';
import type { GroupMember } from '../../../types/application';

export type EditMemberModalProps = {
  member: GroupMember;
  values: {
    name: string;
    state: string;
    f1Power: string;
    f2Power: string;
    f3Power: string;
    kills: string;
    alliance: string;
  };
  error: string;
  scrollKey: number;
  onClose: () => void;
  onSave: () => void;
  onFieldChange: {
    name: (value: string) => void;
    state: (value: string) => void;
    f1Power: (value: string) => void;
    f2Power: (value: string) => void;
    f3Power: (value: string) => void;
    kills: (value: string) => void;
    alliance: (value: string) => void;
  };
  t: TFunction;
};

export type ManualMemberModalProps = {
  values: {
    name: string;
    state: string;
    f1Power: string;
    f2Power: string;
    f3Power: string;
    structurePower: string;
    techPower: string;
    troopPower: string;
    heroPower: string;
    modVehiclePower: string;
    kills: string;
    alliance: string;
    highestPower: string;
  };
  error: string;
  scrollKey: number;
  editingMember: GroupMember | null;
  onClose: () => void;
  onSave: () => void;
  onFieldChange: {
    name: (value: string) => void;
    state: (value: string) => void;
    f1Power: (value: string) => void;
    f2Power: (value: string) => void;
    f3Power: (value: string) => void;
    structurePower: (value: string) => void;
    techPower: (value: string) => void;
    troopPower: (value: string) => void;
    heroPower: (value: string) => void;
    modVehiclePower: (value: string) => void;
    kills: (value: string) => void;
    alliance: (value: string) => void;
  };
  draft: ApplicationDraft;
  t: TFunction;
};

export function EditMemberModal({ member, values, error, scrollKey, onClose, onSave, onFieldChange, t }: EditMemberModalProps) {
  return (
    <Modal
      title={t('wizard.roster.editMember', { name: member.playerName })}
      onClose={onClose}
      className="dialog-fixed-header"
      showCloseButton
      scrollBodyToTopKey={scrollKey}
      actions={
        <>
          <button type="button" className="button button-quiet" onClick={onClose}>
            {t('common.actions.cancel')}
          </button>
          <button type="button" className="button button-primary" onClick={onSave} data-testid="save-member-edit">
            {t('wizard.roster.saveChanges')}
          </button>
        </>
      }
    >
      <p className="hint" style={{ marginBottom: 14 }}>
        {t('wizard.roster.editHint')}
        {member.isScreenshotVerified && ` ${t('wizard.roster.editLockedHint')}`}
      </p>

      {error && <div className="manual-member-error" role="alert">{error}</div>}

      <Field id="edit-player-name" label={t('wizard.roster.playerName')} required>
        <input
          className="control"
          id="edit-player-name"
          value={values.name}
          maxLength={30}
          onChange={(e) => onFieldChange.name(e.target.value)}
          data-testid="edit-member-name-input"
        />
      </Field>

      <Field id="edit-player-state" label={t('wizard.roster.stateLabel')} required>
        <input
          className="control"
          id="edit-player-state"
          type="text"
          value={values.state}
          maxLength={4}
          inputMode="numeric"
          pattern="[0-9]*"
          onChange={(e) => {
            if (!/^\d{0,4}$/.test(e.target.value)) return;
            onFieldChange.state(e.target.value);
          }}
          data-testid="edit-member-state-input"
        />
      </Field>

      <Field id="edit-player-kills" label={t('wizard.roster.killsLabel')}>
        <CommaFormattedNumberInput
          className="control"
          id="edit-player-kills"
          value={values.kills}
          placeholder={t('wizard.roster.killsPlaceholder')}
          onChange={onFieldChange.kills}
          data-testid="edit-member-kills-input"
        />
      </Field>

      <Field id="edit-player-alliance" label={t('wizard.roster.allianceLabel')} required>
        <input
          className="control"
          id="edit-player-alliance"
          value={values.alliance}
          maxLength={50}
          onChange={(e) => onFieldChange.alliance(e.target.value)}
          data-testid="edit-member-alliance-input"
        />
      </Field>

      <div style={{ marginTop: 14, padding: 12, background: 'rgba(255,255,255,0.03)', borderRadius: 6 }}>
        <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 6, fontWeight: 600 }}>
          {member.isScreenshotVerified ? t('wizard.roster.lockedStats') : t('wizard.roster.manualStats')}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6, fontSize: 12 }}>
          <div>
            {t('wizard.roster.power')} <strong>{member.highestPowerOnRecord}</strong>
          </div>
          <div>
            {t('wizard.roster.structure')} <strong>{member.structurePower}</strong>
          </div>
          <div>
            {t('wizard.roster.tech')} <strong>{member.techPower}</strong>
          </div>
          <div>
            {t('wizard.roster.troop')} <strong>{member.troopPower}</strong>
          </div>
          <div>
            {t('wizard.roster.hero')} <strong>{member.heroPower}</strong>
          </div>
          <div>
            {t('wizard.roster.vehicle')} <strong>{member.modVehiclePower}</strong>
          </div>
        </div>
      </div>

      <div className="row-3" style={{ marginTop: 12, gridTemplateColumns: 'repeat(1, minmax(0, 1fr))' }}>
        <Field id="edit-player-f1" label={t('wizard.roster.arenaPowerOptional', { label: 'F1' })}>
          <CommaFormattedNumberInput
            className="control"
            id="edit-player-f1"
            value={values.f1Power}
            placeholder={t('wizard.roster.unknown')}
            onChange={(value) => onFieldChange.f1Power(value)}
            data-testid="edit-member-f1-input"
          />
        </Field>
        <Field id="edit-player-f2" label={t('wizard.roster.arenaPowerOptional', { label: 'F2' })}>
          <CommaFormattedNumberInput
            className="control"
            id="edit-player-f2"
            value={values.f2Power}
            placeholder={t('wizard.roster.unknown')}
            onChange={(value) => onFieldChange.f2Power(value)}
            data-testid="edit-member-f2-input"
          />
        </Field>
        <Field id="edit-player-f3" label={t('wizard.roster.arenaPowerOptional', { label: 'F3' })}>
          <CommaFormattedNumberInput
            className="control"
            id="edit-player-f3"
            value={values.f3Power}
            placeholder={t('wizard.roster.unknown')}
            onChange={(value) => onFieldChange.f3Power(value)}
            data-testid="edit-member-f3-input"
          />
        </Field>
      </div>
    </Modal>
  );
}

export function ManualMemberModal({ draft, values, error, scrollKey, editingMember, onClose, onSave, onFieldChange, t }: ManualMemberModalProps) {
  return (
    <Modal
      title={editingMember ? t('wizard.roster.editMember', { name: editingMember.playerName }) : t('wizard.roster.addMemberTitle')}
      className="dialog-fixed-header"
      showCloseButton
      scrollBodyToTopKey={scrollKey}
      onClose={onClose}
      actions={
        <>
          <button type="button" className="button button-quiet" onClick={onClose}>
            {t('common.actions.cancel')}
          </button>
          <button
            type="button"
            className="button button-primary"
            onClick={onSave}
            data-testid={editingMember ? 'save-manual-member-edit' : 'save-manual-member'}
          >
            {editingMember ? t('wizard.roster.saveChanges') : t('wizard.roster.addMember')}
          </button>
        </>
      }
    >
      <p className="hint" style={{ marginBottom: 14 }}>{t('wizard.roster.manualHint')}</p>
      {error && <div className="manual-member-error" role="alert">{error}</div>}

      <Field id="manual-name" label={t('wizard.roster.playerName')} required>
        <input
          className="control"
          id="manual-name"
          value={values.name}
          maxLength={30}
          placeholder={t('wizard.roster.playerPlaceholder')}
          onChange={(e) => onFieldChange.name(e.target.value)}
          data-testid="manual-member-name-input"
        />
      </Field>

      <Field id="manual-state" label={t('wizard.roster.stateLabel')} required>
        <input
          className="control"
          id="manual-state"
          type="text"
          value={values.state}
          maxLength={4}
          inputMode="numeric"
          pattern="[0-9]*"
          onChange={(e) => {
            if (!/^\d{0,4}$/.test(e.target.value)) return;
            onFieldChange.state(e.target.value);
          }}
          data-testid="manual-member-state-input"
        />
      </Field>

      <Field id="manual-alliance" label={t('wizard.roster.allianceLabel')} required>
        <input
          className="control"
          id="manual-alliance"
          value={values.alliance}
          maxLength={50}
          placeholder={draft.currentAlliance || t('wizard.roster.allianceTag')}
          onChange={(e) => onFieldChange.alliance(e.target.value)}
          data-testid="manual-member-alliance-input"
        />
      </Field>

      <div className="row-3" style={{ marginTop: 12, gridTemplateColumns: 'repeat(1, minmax(0, 1fr))' }}>
        <Field id="manual-highest-power" label={t('wizard.roster.powerRecord')} required>
          <CommaFormattedNumberInput
            className="control"
            id="manual-highest-power"
            value={values.highestPower}
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
            value={values.kills}
            placeholder={t('wizard.roster.zeroPlaceholder')}
            onChange={onFieldChange.kills}
            data-testid="manual-member-kills-input"
          />
        </Field>
      </div>

      <div className="row-3" style={{ marginTop: 12, gridTemplateColumns: 'repeat(1, minmax(0, 1fr))' }}>
        <Field id="manual-struct" label={t('wizard.roster.structureLabel')} required>
          <CommaFormattedNumberInput
            className="control"
            id="manual-struct"
            value={values.structurePower}
            placeholder={t('wizard.roster.structurePlaceholder')}
            onChange={onFieldChange.structurePower}
          />
        </Field>
        <Field id="manual-tech" label={t('wizard.roster.techLabel')} required>
          <CommaFormattedNumberInput
            className="control"
            id="manual-tech"
            value={values.techPower}
            placeholder={t('wizard.roster.techPlaceholder')}
            onChange={onFieldChange.techPower}
          />
        </Field>
      </div>

      <div className="row-3" style={{ marginTop: 12, gridTemplateColumns: 'repeat(1, minmax(0, 1fr))' }}>
        <Field id="manual-troop" label={t('wizard.roster.troopLabel')} required>
          <CommaFormattedNumberInput
            className="control"
            id="manual-troop"
            value={values.troopPower}
            placeholder={t('wizard.roster.troopPlaceholder')}
            onChange={onFieldChange.troopPower}
          />
        </Field>
        <Field id="manual-hero" label={t('wizard.roster.heroLabel')} required>
          <CommaFormattedNumberInput
            className="control"
            id="manual-hero"
            value={values.heroPower}
            placeholder={t('wizard.roster.heroPlaceholder')}
            onChange={onFieldChange.heroPower}
          />
        </Field>
      </div>

      <div className="row-3" style={{ marginTop: 12, gridTemplateColumns: 'repeat(1, minmax(0, 1fr))' }}>
        <Field id="manual-vehicle" label={t('wizard.roster.vehicleLabel')} required>
          <CommaFormattedNumberInput
            className="control"
            id="manual-vehicle"
            value={values.modVehiclePower}
            placeholder={t('wizard.roster.vehiclePlaceholder')}
            onChange={onFieldChange.modVehiclePower}
          />
        </Field>
      </div>

      <div className="row-3" style={{ marginTop: 12, gridTemplateColumns: 'repeat(1, minmax(0, 1fr))' }}>
        <Field id="manual-f1-power" label={t('wizard.roster.arenaPowerOptional', { label: 'F1' })}>
          <CommaFormattedNumberInput
            className="control"
            id="manual-f1-power"
            value={values.f1Power}
            placeholder={t('wizard.roster.unknown')}
            onChange={onFieldChange.f1Power}
            data-testid="manual-member-f1-input"
          />
        </Field>
        <Field id="manual-f2-power" label={t('wizard.roster.arenaPowerOptional', { label: 'F2' })}>
          <CommaFormattedNumberInput
            className="control"
            id="manual-f2-power"
            value={values.f2Power}
            placeholder={t('wizard.roster.unknown')}
            onChange={onFieldChange.f2Power}
            data-testid="manual-member-f2-input"
          />
        </Field>
        <Field id="manual-f3-power" label={t('wizard.roster.arenaPowerOptional', { label: 'F3' })}>
          <CommaFormattedNumberInput
            className="control"
            id="manual-f3-power"
            value={values.f3Power}
            placeholder={t('wizard.roster.unknown')}
            onChange={onFieldChange.f3Power}
            data-testid="manual-member-f3-input"
          />
        </Field>
      </div>
    </Modal>
  );
}
