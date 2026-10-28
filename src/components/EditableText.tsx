/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Click-to-edit inline text. Renders exactly like the underlying tag would,
 * but in edit mode each instance swaps to a styled <input>/<textarea> on click
 * and persists the new value via useContentOverrides on blur/Enter.
 *
 * ponytail: 1 component for all text fields, parameterized by `as` and `id`.
 * Static fallback (defaultValue) wins when no override exists, so disabling
 * edit mode reverts to the seeded copy with no DB read needed at render time.
 *
 * ponytail: visual edit affordance is a thin dashed outline + cursor:text,
 * not a separate toolbar. Saves one component and one prop.
 */

import React, { useEffect, useState } from 'react';
import { useContentOverrides } from '../hooks/useContentOverrides';

type Tag = 'p' | 'span' | 'div';

interface Props {
  scope: string;
  id: string;
  defaultValue: string;
  isEditMode?: boolean;
  as?: Tag;
  className?: string;
  /** Decoration rendered before/after the editable text. Useful for curly quotes. */
  before?: string;
  after?: string;
  /** Use a <textarea> instead of <input>. Defaults to true for `as="p"`. */
  multiline?: boolean;
}

export const EditableText: React.FC<Props> = ({
  scope,
  id,
  defaultValue,
  isEditMode = false,
  as = 'span',
  className = '',
  before = '',
  after = '',
  multiline
}) => {
  const { overrides, setOverride } = useContentOverrides(scope);
  const value = overrides[id] ?? defaultValue;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // ponytail: keep draft in sync if the override changes from elsewhere
  // (e.g. another tab edited the same key). Cheap because we only compare strings.
  useEffect(() => {
    if (!editing) setDraft(value);
  }, [value, editing]);

  const startEdit = () => {
    setDraft(value);
    setErr(null);
    setEditing(true);
  };

  const cancel = () => {
    setDraft(value);
    setEditing(false);
    setErr(null);
  };

  const commit = async () => {
    if (draft === value) {
      setEditing(false);
      return;
    }
    setSaving(true);
    setErr(null);
    try {
      await setOverride(id, draft);
      setEditing(false);
    } catch (e) {
      setErr(String(e));
      // ponytail: leave editing open so the user can retry / Ctrl+Z.
    } finally {
      setSaving(false);
    }
  };

  // Not in edit mode: render as plain text, identical to the original markup.
  if (!isEditMode) {
    return React.createElement(as, { className }, before, value, after);
  }

  const useTextarea = multiline ?? as === 'p';
  const hoverRing =
    'outline outline-1 outline-dashed outline-[#ffd166]/70 outline-offset-2 rounded-sm cursor-text hover:bg-[#ffd166]/5 transition-colors min-h-[1.5em]';

  if (editing) {
    const sharedProps = {
      value: draft,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        setDraft(e.target.value),
      onBlur: commit,
      onKeyDown: (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && (!useTextarea || !e.shiftKey)) {
          e.preventDefault();
          (e.currentTarget as HTMLInputElement | HTMLTextAreaElement).blur();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          cancel();
        }
      },
      // ponytail: same text styling as the parent so the edit feels seamless.
      className:
        'w-full bg-transparent border-b border-[#ffd166] outline-none ' +
        'text-inherit font-inherit leading-inherit ' +
        (saving ? 'opacity-60' : '')
    };
    return React.createElement(
      as,
      { className },
      before,
      useTextarea
        ? React.createElement('textarea', {
            autoFocus: true,
            rows: Math.min(6, Math.max(1, draft.split('\n').length)),
            ...sharedProps
          })
        : React.createElement('input', { autoFocus: true, type: 'text', ...sharedProps }),
      after,
      err &&
        React.createElement(
          'span',
          { className: 'block mt-1 text-[11px] text-red-400 font-mono' },
          err
        )
    );
  }

  return React.createElement(
    as,
    {
      className: `${className} ${hoverRing}`,
      onClick: startEdit,
      title: 'Click para editar (Enter para guardar, Esc para cancelar)'
    },
    before,
    value,
    after
  );
};
