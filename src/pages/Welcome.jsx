import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FaBookOpen, FaChalkboardTeacher, FaComments, FaPlayCircle } from 'react-icons/fa';

function setMetaDescription(content) {
  let el = document.querySelector('meta[name="description"]');
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute('name', 'description');
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

export default function Welcome() {
  useEffect(() => {
    document.title = "Mahfudh Academy | Islamic Learning Platform";
    setMetaDescription('Qur\'an Academy is an online Quran learning system with classes, live recitation sessions, Mushaf notes, bookmarks, and secure communication for students and teachers.');
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f5f8ff] text-[#0f172a]" style={{ fontFamily: 'Manrope, system-ui, sans-serif' }}>
      <div className="pointer-events-none absolute -left-24 top-10 h-80 w-80 rounded-full bg-[#97b8ff]/40 blur-3xl" />
      <div className="pointer-events-none absolute right-0 top-0 h-96 w-96 rounded-full bg-[#9de3d8]/40 blur-3xl" />

      <header className="relative z-10 mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-5 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2">
          <img src="/logo.svg" alt="Mahfudh Academy" className="w-10 h-10 sm:w-12 sm:h-12" />
          <div className="text-2xl font-extrabold tracking-tight text-[#1f3a8a]">Mahfudh Academy</div>
        </div>
        <div className="flex items-center gap-2">
          <a href="/login" className="rounded-full border border-[#c6d5ff] bg-white px-4 py-2 text-sm font-semibold text-[#1f3a8a] transition hover:bg-[#eef3ff]">Login</a>
          <a href="/register" className="rounded-full bg-[#1f3a8a] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1b3276]">Create Account</a>
        </div>
      </header>

      <main className="relative z-10 mx-auto grid w-full max-w-7xl gap-8 px-4 pb-14 pt-8 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-8 lg:pt-16">
        <section>
          <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#1f3a8a] shadow-sm">
            <FaBookOpen className="text-[10px]" /> Modern Quran Learning
          </p>
          <h1 className="max-w-2xl text-4xl font-extrabold leading-tight text-[#0f172a] sm:text-5xl">
            Welcome to Mahfudh Academy
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
            Learn, teach, and revise Quran with live sessions, searchable Mushaf reading, bookmarks, notes, and structured class collaboration.
          </p>

          <div className="mt-7 flex flex-wrap gap-3">
            <Link to="/register" className="inline-flex items-center gap-2 rounded-2xl bg-[#1f3a8a] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#1b3276]">
              Start Learning <FaPlayCircle className="text-xs" />
            </Link>
            <Link to="/mushaf" className="inline-flex items-center gap-2 rounded-2xl border border-[#c6d5ff] bg-white px-5 py-3 text-sm font-bold text-[#1f3a8a] transition hover:bg-[#eef3ff]">
              Open Mushaf
            </Link>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
          <article className="rounded-3xl border border-[#dbe5ff] bg-white/90 p-5 shadow-[0_10px_25px_rgba(30,64,175,0.08)]">
            <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[#e8eeff] text-[#1f3a8a]"><FaChalkboardTeacher /></div>
            <h2 className="text-lg font-bold text-slate-900">Teacher + Student Workflows</h2>
            <p className="mt-1 text-sm text-slate-600">Classes, assignments, attendance, and guided recitation in one place.</p>
          </article>
          <article className="rounded-3xl border border-[#cdeee8] bg-white/90 p-5 shadow-[0_10px_25px_rgba(13,148,136,0.09)]">
            <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[#e7f8f5] text-[#0f766e]"><FaComments /></div>
            <h2 className="text-lg font-bold text-slate-900">Secure Collaboration</h2>
            <p className="mt-1 text-sm text-slate-600">Protected chat, owner controls, and real-time communication between members.</p>
          </article>
        </section>
      </main>
    </div>
  );
}
