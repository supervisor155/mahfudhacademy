import { useState, useRef, useEffect } from 'react';
import {
  FaCheck,
  FaTimes,
  FaEdit,
  FaTrash,
  FaChartBar,
} from 'react-icons/fa';

export const NotesPanel = ({
  selectedAyah,
  note,
  onSaveNote,
  onDeleteNote,
  onClose,
  readingProgress,
  loading,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const textAreaRef = useRef(null);

  useEffect(() => {
    if (note) {
      setNoteText(note.text || '');
      setIsEditing(false);
    } else {
      setNoteText('');
    }
  }, [note, selectedAyah]);

  const handleSave = async () => {
    if (!selectedAyah || !noteText.trim()) return;

    try {
      setIsSaving(true);
      await onSaveNote(selectedAyah.number, noteText);
      setIsEditing(false);
    } catch (err) {
      console.error('Error saving note:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!note || !window.confirm('Delete this note?')) return;

    try {
      setIsSaving(true);
      await onDeleteNote(note.id);
      setNoteText('');
      setIsEditing(false);
    } catch (err) {
      console.error('Error deleting note:', err);
    } finally {
      setIsSaving(false);
    }
  };

  if (!selectedAyah) {
    return (
      <div className="border-t border-[#e3e7e3] bg-white p-4 text-center text-slate-500">
        <p className="text-sm">Select an Ayah to view or add notes</p>
      </div>
    );
  }

  return (
    <div className="flex max-h-[45vh] flex-col overflow-hidden border-t border-[#e3e7e3] bg-white lg:max-h-80 xl:mx-4 xl:mb-4 xl:mt-0 xl:rounded-[28px] xl:border xl:shadow-[0_18px_40px_rgba(17,24,39,0.05)]">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#edf0ed] bg-[#fbfcfb] p-3 sm:p-4">
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-slate-900">
            Ayah {selectedAyah.number}
            {note && <span className="text-xs ml-2 text-green-600">✓ Has Note</span>}
          </h3>
          <p className="mt-1 break-words text-xs text-slate-500">
            {selectedAyah.surahNameEng} {selectedAyah.surahNumber}:{selectedAyah.number}
          </p>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-3 rounded-2xl border border-[#e3e7e3] bg-white px-3 py-2 text-xs text-slate-600">
          <div className="flex items-center gap-1">
            <FaChartBar className="text-[#2d5a56]" />
            <span>{readingProgress}% Read</span>
          </div>
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="rounded-2xl p-2 text-slate-600 transition hover:bg-[#f3f6f4] hover:text-[#2d5a56]"
        >
          <FaTimes />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 space-y-3 overflow-y-auto p-3 sm:p-4">
        {isEditing ? (
          <div className="space-y-2">
            <textarea
              ref={textAreaRef}
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Add your notes here... (What did you learn? Questions?)"
              className="h-24 w-full rounded-2xl border border-[#d7ded9] bg-[#f6f8f6] p-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#7ea89c]"
            />

            {/* Edit Buttons */}
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                onClick={handleSave}
                disabled={!noteText.trim() || isSaving}
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[#2d5a56] py-2.5 text-sm font-medium text-white transition hover:bg-[#234946] disabled:bg-slate-300"
              >
                <FaCheck /> {isSaving ? 'Saving...' : 'Save'}
              </button>

              <button
                onClick={() => {
                  setIsEditing(false);
                  setNoteText(note?.text || '');
                }}
                className="flex-1 rounded-2xl border border-[#d7ded9] bg-[#f5f7f5] py-2.5 text-sm font-medium text-slate-700 transition hover:bg-white"
              >
                Cancel
              </button>

              {note && (
                <button
                  onClick={handleDelete}
                  disabled={isSaving}
                  className="rounded-2xl bg-red-100 p-2.5 text-red-600 transition hover:bg-red-200 sm:w-auto"
                >
                  <FaTrash />
                </button>
              )}
            </div>
          </div>
        ) : (
          <div>
            {note ? (
              <div className="rounded-[24px] border border-[#d8e4df] bg-[#f6f9f8] p-4">
                <p className="mb-2 text-sm leading-6 text-slate-800">{note.text}</p>
                <p className="text-xs text-slate-500">
                  {new Date(note.timestamp).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>

                {/* Note Actions */}
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => setIsEditing(true)}
                    className="flex items-center gap-1 rounded-full bg-[#2d5a56] px-3 py-1.5 text-xs text-white transition hover:bg-[#234946]"
                  >
                    <FaEdit /> Edit
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-sm text-slate-500 mb-3">
                  No note for this Ayah yet
                </p>
                <button
                  onClick={() => setIsEditing(true)}
                  className="inline-flex items-center gap-2 rounded-2xl bg-[#2d5a56] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#234946]"
                >
                  <FaEdit /> Add Note
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
