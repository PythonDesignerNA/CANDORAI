import { Link } from 'wouter';
import { ArrowLeft, Shield, Bot } from 'lucide-react';

export default function TermsOfService() {
  return (
    <div className="min-h-[100dvh] bg-paper-2 flex flex-col font-sans">

      {/* Header — matches app chrome */}
      <header className="sticky top-0 z-40 bg-paper/90 backdrop-blur-md border-b border-line px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="font-serif font-bold text-xl tracking-tight text-ink flex items-center gap-2">
            <span className="w-6 h-6 rounded-md bg-ink text-paper flex items-center justify-center text-sm">C</span>
            Candor
          </div>
        </div>
        <Link href="/">
          <button className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium text-muted-dark hover:text-ink hover:bg-paper-2 rounded-lg transition-colors cursor-pointer">
            <ArrowLeft size={14} />
            Back to app
          </button>
        </Link>
      </header>

      {/* Content */}
      <main className="flex-1 w-full max-w-2xl mx-auto px-6 py-14">

        {/* Page title */}
        <div className="mb-10">
          <h1 className="font-serif text-3xl font-bold text-ink tracking-tight mb-2">
            Terms of Service
          </h1>
          <p className="text-[13px] text-muted-paper font-mono">
            Effective date: July 2025 &nbsp;·&nbsp; Last updated: July 2025
          </p>
        </div>

        {/* Intro */}
        <p className="text-[15px] text-muted-dark leading-relaxed mb-10">
          Please read these terms carefully before using Candor. By accessing or
          using this application you agree to the following terms. If you do not
          agree, please discontinue use.
        </p>

        {/* Divider */}
        <hr className="border-line mb-10" />

        {/* Section 1 — AI & Liability */}
        <section className="mb-10">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-9 h-9 rounded-lg bg-amber-soft border border-amber/20 flex items-center justify-center shrink-0 mt-0.5">
              <Bot size={18} className="text-amber-dark" />
            </div>
            <div>
              <h2 className="font-serif text-xl font-semibold text-ink leading-snug">
                AI and Liability Disclaimer
              </h2>
              <p className="text-[12px] font-mono text-muted-paper mt-0.5 uppercase tracking-wide">Section 1</p>
            </div>
          </div>

          <div className="pl-12 space-y-4 text-[15px] text-muted-dark leading-relaxed">
            <p>
              Candor uses an Artificial Intelligence system (Google Gemini) to
              generate analysis, recommendations, and summaries from the
              documents you upload. By using this service, you acknowledge and
              agree to the following:
            </p>
            <ul className="space-y-3 list-none">
              <li className="flex gap-3">
                <span className="text-amber mt-0.5 shrink-0">—</span>
                <span>
                  <strong className="text-ink font-medium">Outputs may be inaccurate.</strong>{' '}
                  AI-generated results can be incomplete, incorrect, biased, or
                  otherwise inappropriate for your specific context.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="text-amber mt-0.5 shrink-0">—</span>
                <span>
                  <strong className="text-ink font-medium">You are responsible for review.</strong>{' '}
                  You are solely responsible for reviewing, verifying, and
                  validating all AI-generated content before relying on it for
                  personal, professional, legal, or hiring decisions.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="text-amber mt-0.5 shrink-0">—</span>
                <span>
                  <strong className="text-ink font-medium">No liability for damages.</strong>{' '}
                  To the maximum extent permitted by applicable law, Candor and
                  its operators are not liable for any direct, indirect,
                  incidental, or consequential damages arising from your use of
                  this tool or reliance on its outputs.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="text-amber mt-0.5 shrink-0">—</span>
                <span>
                  <strong className="text-ink font-medium">Not a substitute for professional judgment.</strong>{' '}
                  AI analysis does not constitute legal, HR, or professional
                  advice. All hiring and evaluation decisions remain your
                  responsibility.
                </span>
              </li>
            </ul>
          </div>
        </section>

        <hr className="border-line mb-10" />

        {/* Section 2 — Privacy */}
        <section className="mb-10">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-9 h-9 rounded-lg bg-indigo/10 border border-indigo/20 flex items-center justify-center shrink-0 mt-0.5">
              <Shield size={18} className="text-indigo" />
            </div>
            <div>
              <h2 className="font-serif text-xl font-semibold text-ink leading-snug">
                Privacy and Data Policy
              </h2>
              <p className="text-[12px] font-mono text-muted-paper mt-0.5 uppercase tracking-wide">Section 2</p>
            </div>
          </div>

          <div className="pl-12 space-y-4 text-[15px] text-muted-dark leading-relaxed">
            <p>
              We take your privacy seriously. Here is a clear account of how
              your data is handled when you use Candor:
            </p>
            <ul className="space-y-3 list-none">
              <li className="flex gap-3">
                <span className="text-indigo mt-0.5 shrink-0">—</span>
                <span>
                  <strong className="text-ink font-medium">We do not store your documents.</strong>{' '}
                  Resumes and job descriptions you upload are processed in
                  real-time and are never saved to a database or persistent
                  storage on our end.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="text-indigo mt-0.5 shrink-0">—</span>
                <span>
                  <strong className="text-ink font-medium">We do not track or sell your data.</strong>{' '}
                  This application does not use analytics, advertising trackers,
                  or sell personal information to third parties.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="text-indigo mt-0.5 shrink-0">—</span>
                <span>
                  <strong className="text-ink font-medium">Standard hosting logs.</strong>{' '}
                  This application is hosted on Netlify, which may temporarily
                  collect standard server access logs (such as IP addresses and
                  request metadata) to ensure site security and performance.
                  These logs are governed by{' '}
                  <a
                    href="https://www.netlify.com/privacy/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo underline underline-offset-2 hover:opacity-80 transition-opacity"
                  >
                    Netlify's Privacy Policy
                  </a>
                  .
                </span>
              </li>
              <li className="flex gap-3">
                <span className="text-indigo mt-0.5 shrink-0">—</span>
                <span>
                  <strong className="text-ink font-medium">Third-party AI processing.</strong>{' '}
                  Resume content is transmitted to Google Gemini for AI
                  analysis. Please review{' '}
                  <a
                    href="https://policies.google.com/privacy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo underline underline-offset-2 hover:opacity-80 transition-opacity"
                  >
                    Google's Privacy Policy
                  </a>{' '}
                  to understand how Gemini handles API data.
                </span>
              </li>
            </ul>
            <p>
              By using this application, you consent to the standard hosting
              practices described above.
            </p>
          </div>
        </section>

        <hr className="border-line mb-10" />

        {/* Section 3 — Changes */}
        <section className="mb-10">
          <h2 className="font-serif text-lg font-semibold text-ink mb-3">
            Changes to These Terms
          </h2>
          <p className="text-[15px] text-muted-dark leading-relaxed">
            We may update these terms from time to time. The effective date at
            the top of this page will reflect when the most recent changes were
            made. Continued use of the application after any changes constitutes
            your acceptance of the updated terms.
          </p>
        </section>

        {/* Footer note */}
        <div className="bg-paper rounded-xl border border-line px-6 py-5 text-[13px] text-muted-dark leading-relaxed">
          <p>
            <strong className="text-ink font-medium">Questions?</strong>{' '}
            If you have any questions about these terms, please reach out before
            using the application. By continuing to use Candor you confirm you
            have read and understood both the AI disclaimer and the privacy
            policy above.
          </p>
        </div>

      </main>

      {/* Footer */}
      <footer className="border-t border-line px-6 py-4 text-center">
        <p className="text-[12px] text-muted-paper">
          &copy; {new Date().getFullYear()} Candor. All rights reserved.
        </p>
      </footer>

    </div>
  );
}
