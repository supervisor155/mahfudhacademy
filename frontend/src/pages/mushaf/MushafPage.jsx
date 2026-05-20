import React, { useState } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import { FaBook, FaStickyNote, FaSearch } from 'react-icons/fa';

export default function MushafPage() {
  const [selectedSurah, setSelectedSurah] = useState(1);
  const [notes, setNotes] = useState([]);
  const [newNote, setNewNote] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const surahs = [
    { id: 1, name: 'Al-Fatihah' },
    { id: 2, name: 'Al-Baqarah' },
    { id: 3, name: 'Aal-e-Imran' },
    { id: 4, name: 'An-Nisa' },
    { id: 5, name: 'Al-Maidah' },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <FaBook /> Smart Muṣḥaf
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Surahs List */}
          <div className="lg:col-span-1 bg-white rounded-lg shadow">
            <div className="p-4 border-b">
              <h2 className="font-bold text-lg">Surahs</h2>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {surahs.map(surah => (
                <button
                  key={surah.id}
                  onClick={() => setSelectedSurah(surah.id)}
                  className={`w-full text-left px-4 py-2 border-b transition ${
                    selectedSurah === surah.id
                      ? 'bg-blue-50 text-blue-600 font-semibold'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  {surah.id}. {surah.name}
                </button>
              ))}
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2 space-y-4">
            {/* Mushaf Display */}
            <div className="bg-white rounded-lg shadow p-8">
              <h2 className="text-2xl font-bold mb-6 text-center">Surah {selectedSurah}</h2>
              <div className="text-lg leading-relaxed text-gray-700 min-h-64">
                <p className="text-center text-gray-600">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</p>
                <p className="mt-6 text-justify">
                  Lorem ipsum dolor sit amet, consectetur adipiscing elit. This is placeholder Quranic text...
                </p>
              </div>
            </div>
          </div>

          {/* Notes Panel */}
          <div className="lg:col-span-1 bg-white rounded-lg shadow flex flex-col">
            <div className="p-4 border-b">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <FaStickyNote /> Notes
              </h3>
            </div>

            {/* Search */}
            <div className="p-4 border-b">
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search notes..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <FaSearch className="absolute right-3 top-2.5 text-gray-400" size={14} />
              </div>
            </div>

            {/* Notes List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {notes.length === 0 ? (
                <p className="text-gray-500 text-sm">No notes yet. Add one below!</p>
              ) : (
                notes.map((note, idx) => (
                  <div key={idx} className="p-2 bg-yellow-50 border border-yellow-200 rounded text-sm">
                    {note}
                  </div>
                ))
              )}
            </div>

            {/* Add Note */}
            <div className="p-4 border-t">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && newNote.trim()) {
                      setNotes([...notes, newNote]);
                      setNewNote('');
                    }
                  }}
                  placeholder="Add a note..."
                  className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
