import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import {
  getListAdminAlliancesQueryKey,
  useCreateAdminAlliance,
  useListAdminAlliances,
  useUpdateAdminAlliance,
  type AdminAlliance,
} from '@workspace/api-client-react';

const emptyAlliance = { tag: '', name: '', displayOrder: 0 };

interface AllianceManagementSectionProps {
  enabled?: boolean;
  onNotice?: (msg: string) => void;
  onError?: (err: unknown) => void;
}

export function AllianceManagementSection({
  enabled = true,
  onNotice,
  onError,
}: AllianceManagementSectionProps) {
  const client = useQueryClient();
  const [allianceEdit, setAllianceEdit] = useState<AdminAlliance | null | 'new'>(null);
  const [allianceForm, setAllianceForm] = useState(emptyAlliance);
  const [formError, setFormError] = useState('');

  const alliances = useListAdminAlliances({
    query: {
      queryKey: getListAdminAlliancesQueryKey(),
      enabled,
    },
  });

  const createAlliance = useCreateAdminAlliance();
  const updateAlliance = useUpdateAdminAlliance();

  const beginAlliance = (alliance?: AdminAlliance) => {
    setAllianceEdit(alliance ?? 'new');
    setAllianceForm(
      alliance
        ? {
            tag: alliance.tag,
            name: alliance.name,
            displayOrder: alliance.displayOrder,
          }
        : emptyAlliance,
    );
    setFormError('');
  };

  const saveAlliance = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError('');
    try {
      if (allianceEdit === 'new') {
        await createAlliance.mutateAsync({ data: allianceForm });
      } else if (allianceEdit) {
        await updateAlliance.mutateAsync({
          id: allianceEdit.id,
          data: allianceForm,
        });
      }
      setAllianceEdit(null);
      onNotice?.(allianceEdit === 'new' ? 'Alliance added.' : 'Alliance updated.');
      void client.invalidateQueries({ queryKey: getListAdminAlliancesQueryKey() });
    } catch (error) {
      onError?.(error);
      setFormError(
        error instanceof Error ? error.message : 'The request could not be completed.',
      );
    }
  };

  const toggleAlliance = async (alliance: AdminAlliance) => {
    try {
      await updateAlliance.mutateAsync({
        id: alliance.id,
        data: { isActive: !alliance.isActive },
      });
      onNotice?.(`${alliance.tag} ${alliance.isActive ? 'deactivated' : 'activated'}.`);
      void client.invalidateQueries({ queryKey: getListAdminAlliancesQueryKey() });
    } catch (error) {
      onError?.(error);
      onNotice?.(
        error instanceof Error ? error.message : 'The request could not be completed.',
      );
    }
  };

  return (
    <>
      <section className="admin-panel alliance-panel" style={{ marginTop: 24 }}>
        <div className="panel-heading">
          <div>
            <span className="panel-kicker">DESTINATIONS</span>
            <h2>Alliance management</h2>
            <p>Active destinations appear on the public application.</p>
          </div>
          <button
            className="button button-primary"
            onClick={() => beginAlliance()}
            data-testid="add-alliance"
          >
            <Plus size={15} /> Add alliance
          </button>
        </div>

        {alliances.isLoading ? (
          <div className="skeleton alliance-skeleton" />
        ) : alliances.isError ? (
          <div className="admin-error" role="alert" data-testid="alliances-admin-error">
            <span>
              {alliances.error instanceof Error
                ? alliances.error.message
                : 'Failed to load alliances.'}
            </span>
            <button className="button" onClick={() => void alliances.refetch()} data-testid="retry-admin-alliances">
              Retry
            </button>
          </div>
        ) : !alliances.data?.length ? (
          <div className="empty-state compact-empty">
            No destination alliances configured yet.
          </div>
        ) : (
          <div className="alliance-admin-list">
            {alliances.data.map((item) => (
              <article
                className="alliance-admin-row"
                key={item.id}
                data-testid={`admin-alliance-${item.id}`}
              >
                <div>
                  <strong>
                    <span>{item.tag}</span> {item.name}
                  </strong>
                  <small>
                    Display order {item.displayOrder} ·{' '}
                    {item.isActive ? 'Shown on application' : 'Hidden from application'}
                  </small>
                </div>
                <span className={`alliance-state ${item.isActive ? 'is-active' : ''}`}>
                  {item.isActive ? 'Active' : 'Inactive'}
                </span>
                <button
                  className="button"
                  onClick={() => beginAlliance(item)}
                  data-testid={`edit-alliance-${item.id}`}
                >
                  Edit
                </button>
                <button
                  className={`button ${item.isActive ? 'button-danger' : ''}`}
                  onClick={() => void toggleAlliance(item)}
                  disabled={updateAlliance.isPending}
                  data-testid={`${item.isActive ? 'deactivate' : 'activate'}-alliance-${item.id}`}
                >
                  {item.isActive ? 'Deactivate' : 'Activate'}
                </button>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* Add / Edit Alliance Modal */}
      {allianceEdit && (
        <div
          className="dialog-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setAllianceEdit(null);
          }}
        >
          <section
            className="dialog alliance-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="alliance-dialog-title"
          >
            <h2 id="alliance-dialog-title">
              {allianceEdit === 'new'
                ? 'Add destination alliance'
                : `Edit ${allianceEdit.tag}`}
            </h2>
            <form onSubmit={saveAlliance}>
              <label className="label" htmlFor="alliance-tag">
                Tag
              </label>
              <input
                id="alliance-tag"
                className="control"
                maxLength={24}
                required
                value={allianceForm.tag}
                onChange={(event) =>
                  setAllianceForm((old) => ({
                    ...old,
                    tag: event.target.value,
                  }))
                }
                data-testid="alliance-tag-input"
              />
              <label className="label auth-label" htmlFor="alliance-name">
                Alliance name
              </label>
              <input
                id="alliance-name"
                className="control"
                maxLength={80}
                required
                value={allianceForm.name}
                onChange={(event) =>
                  setAllianceForm((old) => ({
                    ...old,
                    name: event.target.value,
                  }))
                }
                data-testid="alliance-name-input"
              />
              <label className="label auth-label" htmlFor="alliance-order">
                Display order
              </label>
              <input
                id="alliance-order"
                className="control"
                type="number"
                min={0}
                max={32767}
                required
                value={allianceForm.displayOrder}
                onChange={(event) =>
                  setAllianceForm((old) => ({
                    ...old,
                    displayOrder: Number(event.target.value),
                  }))
                }
                data-testid="alliance-order-input"
              />
              {formError && (
                <p className="error-text" role="alert">
                  {formError}
                </p>
              )}
              <div className="dialog-actions">
                <button
                  className="button button-quiet"
                  type="button"
                  onClick={() => setAllianceEdit(null)}
                  data-testid="cancel-alliance-edit"
                >
                  Cancel
                </button>
                <button
                  className="button button-primary"
                  type="submit"
                  disabled={createAlliance.isPending || updateAlliance.isPending}
                  data-testid="save-alliance"
                >
                  {createAlliance.isPending || updateAlliance.isPending
                    ? 'Saving…'
                    : 'Save alliance'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </>
  );
}
